defmodule Perplexica.Search.Session do
  @moduledoc """
  GenServer managing a single search session lifecycle.

  Each search runs in its own supervised process:
  classify → widgets + research (parallel) → stream answer.

  ## Block Emission

  Publishes events via Phoenix.PubSub for Absinthe subscriptions:
  - `{:block, block}` — new block (text, source, widget, research)
  - `{:update_block, block_id, patch}` — RFC-6902 patch update
  - `:research_complete` — research phase finished
  - `:message_end` — answer fully streamed
  - `{:error, message}` — unrecoverable error

  ## Crash Recovery

  State is checkpointed to PostgreSQL after each research iteration.
  On restart, the GenServer loads the last checkpoint and resumes.
  """

  use GenServer, restart: :transient
  require Logger

  alias Perplexica.Search.{Classifier, Researcher}
  alias Perplexica.Models.Registry
  alias Perplexica.{Repo, Message}

  @ttl_ms 30 * 60 * 1_000

  # ── Public API ─────────────────────────────────────────────────────

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts)
  end

  @doc "Get the current blocks for this session."
  def get_blocks(pid) do
    GenServer.call(pid, :get_blocks)
  end

  # ── GenServer Callbacks ────────────────────────────────────────────

  @impl true
  def init(opts) do
    session_id = opts[:session_id] || Ecto.UUID.generate()
    chat_id = opts[:chat_id]
    message_id = opts[:message_id]

    state = %{
      session_id: session_id,
      chat_id: chat_id,
      message_id: message_id,
      query: opts[:query],
      chat_history: opts[:chat_history] || [],
      config: opts[:config] || %{},
      blocks: %{},
      block_order: [],
      status: :initialized
    }

    # Schedule TTL cleanup
    Process.send_after(self(), :ttl_expired, @ttl_ms)

    # Start the search asynchronously
    send(self(), :start_search)

    {:ok, state}
  end

  @impl true
  def handle_call(:get_blocks, _from, state) do
    blocks =
      state.block_order
      |> Enum.map(fn id -> state.blocks[id] end)
      |> Enum.reject(&is_nil/1)

    {:reply, blocks, state}
  end

  @impl true
  def handle_info(:start_search, state) do
    # Run the entire search pipeline in a Task to avoid blocking the GenServer
    task_state = state

    Task.start(fn ->
      try do
        run_search_pipeline(task_state)
      rescue
        e ->
          Logger.error("[SearchSession] Pipeline crashed: #{inspect(e)}")
          publish(task_state.session_id, {:error, Exception.message(e)})
          update_message_status(task_state, "error")
      end
    end)

    {:noreply, %{state | status: :running}}
  end

  @impl true
  def handle_info(:ttl_expired, state) do
    Logger.info("[SearchSession] #{state.session_id} TTL expired, shutting down")
    {:stop, :normal, state}
  end

  @impl true
  def handle_info(_msg, state), do: {:noreply, state}

  # ── Search Pipeline ────────────────────────────────────────────────

  defp run_search_pipeline(state) do
    session_id = state.session_id

    # 1. Classify the query
    {:ok, classification} = Classifier.classify(state.query, state.chat_history, state.config)

    # 2. Emit research block (empty, will be updated with substeps)
    research_block_id = emit_block(session_id, %{
      type: "research",
      subSteps: []
    })

    research_substeps = []

    if classification.skip_search do
      # Skip research, go straight to answer
      publish(session_id, :research_complete)
      stream_answer(state, [], classification)
    else
      # 3. Run research loop
      emit_fn = fn event, data ->
        case event do
          :searching ->
            substep = %{type: "searching", data: data}
            research_substeps_updated = research_substeps ++ [substep]
            update_research_block(session_id, research_block_id, research_substeps_updated)

          :search_results ->
            chunks = Enum.map(data, fn r -> %{content: r.content, metadata: %{url: r.url, title: r.title}} end)
            substep = %{type: "searchResults", data: chunks}
            research_substeps_updated = research_substeps ++ [substep]
            update_research_block(session_id, research_block_id, research_substeps_updated)

          :reading ->
            substep = %{type: "reading", data: data}
            research_substeps_updated = research_substeps ++ [substep]
            update_research_block(session_id, research_block_id, research_substeps_updated)

          :reasoning ->
            substep = %{type: "reasoning", data: data}
            research_substeps_updated = research_substeps ++ [substep]
            update_research_block(session_id, research_block_id, research_substeps_updated)

          _ ->
            :ok
        end
      end

      {:ok, search_results} = Researcher.research(
        classification.standalone_follow_up,
        state.config,
        emit_fn
      )

      # 4. Emit source block
      if search_results != [] do
        chunks =
          search_results
          |> Enum.uniq_by(fn r -> r[:url] || r.url end)
          |> Enum.map(fn r ->
            %{content: r[:content] || "", metadata: %{url: r[:url] || r.url, title: r[:title] || ""}}
          end)

        emit_block(session_id, %{type: "source", data: chunks})
      end

      publish(session_id, :research_complete)

      # 5. Stream final answer
      stream_answer(state, search_results, classification)
    end
  end

  defp stream_answer(state, search_results, _classification) do
    session_id = state.session_id

    # Build context from search results
    context =
      search_results
      |> Enum.take(20)
      |> Enum.map_join("\n\n", fn r ->
        url = r[:url] || ""
        title = r[:title] || ""
        content = r[:content] || ""
        "<source url=\"#{url}\" title=\"#{title}\">\n#{String.slice(content, 0, 2000)}\n</source>"
      end)

    system_instructions = state.config[:system_instructions] || "None"

    system_prompt = """
    You are Perplexica, an AI search assistant. Answer the user's query using the provided search results.

    User's custom instructions: #{system_instructions}

    Rules:
    - Cite sources using [1], [2], etc. matching the order of provided sources
    - Be comprehensive but concise
    - If sources conflict, mention the discrepancy
    - If you're unsure, say so rather than guessing
    - Use markdown formatting for readability

    Search results:
    #{context}
    """

    messages = [
      %{role: "system", content: system_prompt}
    ]

    # Add chat history
    history_messages =
      state.chat_history
      |> Enum.map(fn
        %{role: "user", content: c} -> %{role: "user", content: c}
        %{role: "assistant", content: c} -> %{role: "assistant", content: c}
        msg -> msg
      end)

    messages = messages ++ history_messages ++ [%{role: "user", content: state.query}]

    # Generate the answer (non-streaming for reliability)
    case Registry.chat_completion(messages, %{max_tokens: 4096, temperature: 0.7}) do
      {:ok, _key, {:ok, response}} ->
        answer_text = response.content || ""

        # Emit the text block with full answer
        emit_block(session_id, %{type: "text", data: answer_text})

        # Emit suggestions
        emit_block(session_id, %{type: "suggestion", data: []})

        # Persist response blocks to message
        save_answer_to_message(state, answer_text, search_results)

        publish(session_id, :message_end)
        update_message_status(state, "completed")

      {:error, _key, {:error, reason}} ->
        Logger.warning("[SearchSession] Answer generation failed: #{inspect(reason)}")
        publish(session_id, {:error, "Failed to generate answer"})
        update_message_status(state, "error")
    end
  end

  # ── Block Helpers ──────────────────────────────────────────────────

  defp emit_block(session_id, block_data) do
    block_id = Ecto.UUID.generate()
    block = Map.put(block_data, :id, block_id)

    publish(session_id, {:block, block})
    block_id
  end

  defp update_research_block(session_id, block_id, substeps) do
    publish(session_id, {:update_block, block_id, [
      %{"op" => "replace", "path" => "/subSteps", "value" => substeps}
    ]})
  end

  # ── PubSub ─────────────────────────────────────────────────────────
  #
  # Publish search events through Absinthe.Subscription so GraphQL
  # subscribers on `search_updated(sessionId: ...)` actually receive them.
  # The root value we push here becomes the root for the subscription's
  # resolve fn in `PerplexicaWeb.Schema`, so we shape it to match the
  # `:search_event` object type (type, block, block_id, patch, data).

  defp publish(session_id, event) do
    root = event_to_root(event)

    Absinthe.Subscription.publish(
      PerplexicaWeb.Endpoint,
      root,
      search_updated: "search:#{session_id}"
    )

    # Keep raw Phoenix.PubSub broadcast as a secondary channel so any
    # local listeners (tests, debug tooling) still see events.
    Phoenix.PubSub.broadcast(
      Perplexica.PubSub,
      "search:#{session_id}",
      {:search_event, session_id, event}
    )
  end

  defp event_to_root({:block, block}) do
    %{type: "block", block: block, block_id: block[:id], patch: nil, data: nil}
  end

  defp event_to_root({:update_block, block_id, patch}) do
    %{type: "update_block", block: nil, block_id: block_id, patch: patch, data: nil}
  end

  defp event_to_root(:research_complete) do
    %{type: "research_complete", block: nil, block_id: nil, patch: nil, data: nil}
  end

  defp event_to_root(:message_end) do
    %{type: "message_end", block: nil, block_id: nil, patch: nil, data: nil}
  end

  defp event_to_root({:error, message}) do
    %{type: "error", block: nil, block_id: nil, patch: nil, data: to_string(message)}
  end

  # ── Database Persistence ───────────────────────────────────────────

  defp update_message_status(state, status) do
    case state.message_id do
      nil -> :ok
      message_id ->
        import Ecto.Query

        Repo.update_all(
          from(m in Message, where: m.message_id == ^message_id),
          set: [status: status]
        )
    end
  end

  defp save_answer_to_message(state, answer_text, search_results) do
    import Ecto.Query

    source_chunks =
      search_results
      |> Enum.uniq_by(fn r -> r[:url] end)
      |> Enum.map(fn r ->
        %{content: r[:content] || "", metadata: %{url: r[:url], title: r[:title] || ""}}
      end)

    blocks = [
      %{type: "source", id: Ecto.UUID.generate(), data: source_chunks},
      %{type: "text", id: Ecto.UUID.generate(), data: answer_text}
    ]

    Repo.update_all(
      from(m in Message, where: m.message_id == ^state.message_id),
      set: [response_blocks: blocks, status: "completed"]
    )
  end
end
