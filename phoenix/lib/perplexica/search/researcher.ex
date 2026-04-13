defmodule Perplexica.Search.Researcher do
  @moduledoc """
  Agentic research loop — iteratively uses LLM tool-calling to search,
  scrape, and gather information before generating a final answer.

  ## Mode-Based Iteration Limits + Soft Time Budget

  Per-mode `max_iterations` and `budget_ms` come from
  `Perplexica.Search.ModeConfig` — editable at runtime via the settings
  page, read from a `:persistent_term` cache on every request.

  The budget is a **soft** limit. Before each new iteration the loop
  checks `elapsed_ms < budget_ms`; if the budget is exceeded, the loop
  exits cleanly with whatever results were collected up to the previous
  iteration. An in-flight LLM call is never interrupted — soft semantics
  mean "don't start another round after the timer runs out".

  ## Loop

  Each iteration:
  1. Call LLM with accumulated context + available tools
  2. Collect tool calls from response
  3. Execute all tool calls in parallel
  4. Aggregate results into context
  5. Repeat until `done`, max iterations, or budget exceeded
  """

  require Logger

  alias Perplexica.Models.Registry
  alias Perplexica.Search.Actions
  alias Perplexica.Search.ModeConfig

  @doc """
  Run the research loop. Returns accumulated search results.

  `emit_fn` is called with substep updates for UI display:
  - `{:searching, queries}` — search queries being executed
  - `{:search_results, results}` — results received
  - `{:reading, urls}` — URLs being scraped
  - `{:reasoning, text}` — LLM reasoning text
  """
  def research(query, config, emit_fn \\ fn _, _ -> :ok end) do
    mode = config[:mode] || "balanced"

    mode_config =
      try do
        ModeConfig.get(mode)
      rescue
        _ -> %{max_iterations: 6, budget_ms: 16_000}
      end

    tools = Actions.Registry.available_tools(config)

    system_prompt = build_system_prompt(query, config)

    initial_state = %{
      messages: [
        %{role: "system", content: system_prompt},
        %{role: "user", content: query}
      ],
      all_results: [],
      iteration: 0,
      max_iterations: mode_config.max_iterations,
      budget_ms: mode_config.budget_ms,
      started_at: System.monotonic_time(:millisecond),
      tools: tools,
      config: config,
      emit_fn: emit_fn
    }

    run_loop(initial_state)
  end

  defp run_loop(%{iteration: iter, max_iterations: max} = state) when iter >= max do
    Logger.info("[Researcher] Max iterations (#{max}) reached")
    {:ok, state.all_results}
  end

  defp run_loop(%{budget_ms: budget_ms} = state) do
    elapsed = elapsed_ms(state)

    if elapsed >= budget_ms do
      Logger.info(
        "[Researcher] Soft budget (#{budget_ms}ms) exceeded after #{state.iteration} iterations"
      )

      {:ok, state.all_results}
    else
      do_iteration(state)
    end
  end

  defp do_iteration(state) do
    opts = %{
      tools: state.tools,
      temperature: 0.7,
      max_tokens: 4096
    }

    case Registry.chat_completion(state.messages, opts) do
      {:ok, _key, {:ok, response}} ->
        handle_response(state, response)

      {:error, _key, {:error, reason}} ->
        Logger.warning("[Researcher] LLM call failed: #{inspect(reason)}")
        {:ok, state.all_results}
    end
  end

  defp elapsed_ms(%{started_at: started}) do
    System.monotonic_time(:millisecond) - started
  end

  defp handle_response(state, response) do
    tool_calls = response.tool_calls || []
    content = response.content

    # Emit reasoning if present
    if content && content != "" do
      state.emit_fn.(:reasoning, content)
    end

    if tool_calls == [] do
      # No tool calls — research is done
      {:ok, state.all_results}
    else
      # Check for done action
      done_call = Enum.find(tool_calls, fn tc -> tc.name == "done" end)

      if done_call do
        {:ok, state.all_results}
      else
        execute_and_continue(state, response, tool_calls)
      end
    end
  end

  defp execute_and_continue(state, response, tool_calls) do
    # Emit substep info
    search_calls = Enum.filter(tool_calls, fn tc -> tc.name in ["web_search", "exa_search", "academic_search", "discussion_search"] end)
    scrape_calls = Enum.filter(tool_calls, fn tc -> tc.name == "scrape_url" end)

    for tc <- search_calls do
      queries = tc.arguments["queries"] || []
      state.emit_fn.(:searching, queries)
    end

    for tc <- scrape_calls do
      urls = tc.arguments["urls"] || []
      state.emit_fn.(:reading, urls)
    end

    # Execute all tool calls in parallel
    results = Actions.Registry.execute_all(tool_calls, state.config)

    # Collect search results
    new_results =
      results
      |> Enum.flat_map(fn {_name, _id, result} ->
        case result do
          {:ok, %{type: "search_results", results: r}} ->
            state.emit_fn.(:search_results, r)
            r

          {:ok, %{type: "scrape_results", results: r}} ->
            r

          _ ->
            []
        end
      end)

    # Build tool result messages for LLM
    tool_messages =
      results
      |> Enum.map(fn {name, id, result} ->
        content =
          case result do
            {:ok, data} -> Jason.encode!(data)
            {:error, err} -> Jason.encode!(%{error: inspect(err)})
          end

        %{role: "tool", tool_call_id: id, name: name, content: content}
      end)

    # Add assistant message with tool calls + tool results to history
    assistant_msg = %{
      role: "assistant",
      content: response.content || "",
      tool_calls: tool_calls
    }

    updated_messages = state.messages ++ [assistant_msg | tool_messages]

    updated_state = %{
      state
      | messages: updated_messages,
        all_results: state.all_results ++ new_results,
        iteration: state.iteration + 1
    }

    run_loop(updated_state)
  end

  defp build_system_prompt(_query, config) do
    mode = config[:mode] || "balanced"
    system_instructions = config[:system_instructions] || "None"

    """
    You are Perplexica, an AI search assistant. Your task is to research the user's query by searching the web and reading relevant sources.

    Research mode: #{mode}
    User's custom instructions: #{system_instructions}

    Available tools:
    - web_search: Search the web via Brave. Best for general facts, current news, and wide indexing.
    - exa_search: Neural search via Exa.ai. Best for high-quality, research-grade, or semantic discovery where meaning matters more than keywords.
    - scrape_url: Read full content from specific URLs
    - done: Signal that you have enough information

    Strategy:
    1. Start by using BOTH web_search and exa_search to get a diverse range of results.
    2. Use Brave (web_search) for specific entities, news, and broad coverage.
    3. Use Exa (exa_search) to find high-signal research papers, technical blogs, or deep-dive articles.
    4. Read promising URLs to get detailed information.
    5. When you have enough context, call 'done'.

    Be thorough but efficient. Prioritize authoritative and recent sources.
    Always provide diverse search queries to cover different aspects of the topic.
    """
  end
end
