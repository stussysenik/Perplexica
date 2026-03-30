defmodule PerplexicaWeb.Resolvers.SearchResolver do
  @moduledoc "GraphQL resolvers for search operations."

  alias Perplexica.Search.Supervisor, as: SearchSupervisor
  alias Perplexica.SearchSources.Brave
  alias Perplexica.{Repo, Chat, Message}

  def start_search(_parent, args, _context) do
    config = %{
      mode: args[:optimization_mode] || "balanced",
      sources: args[:sources] || [],
      system_instructions: args[:system_instructions],
      academic_search: "academic" in (args[:sources] || []),
      discussion_search: "discussion" in (args[:sources] || [])
    }

    chat_history =
      (args[:history] || [])
      |> Enum.map(fn entry -> %{role: entry.role, content: entry.content} end)

    # Ensure the chat exists (create if new)
    ensure_chat_exists(args.chat_id, args.query, args[:sources] || [])

    # Create the message record
    ensure_message_exists(args.message_id, args.chat_id, args.query)

    opts = [
      query: args.query,
      chat_id: args.chat_id,
      message_id: args.message_id,
      chat_history: chat_history,
      config: config
    ]

    case SearchSupervisor.start_search(opts) do
      {:ok, _pid, session_id} ->
        {:ok, %{session_id: session_id, status: "started"}}

      {:error, reason} ->
        {:error, "Failed to start search: #{inspect(reason)}"}
    end
  end

  defp ensure_chat_exists(chat_id, title, sources) do
    case Repo.get(Chat, chat_id) do
      nil ->
        %Chat{}
        |> Chat.changeset(%{title: title, sources: sources})
        |> Ecto.Changeset.put_change(:id, chat_id)
        |> Repo.insert()
      _exists ->
        :ok
    end
  end

  defp ensure_message_exists(message_id, chat_id, query) do
    import Ecto.Query

    exists =
      Message
      |> where(message_id: ^message_id)
      |> Repo.exists?()

    unless exists do
      %Message{}
      |> Message.changeset(%{
        message_id: message_id,
        chat_id: chat_id,
        backend_id: Ecto.UUID.generate(),
        query: query,
        status: "answering"
      })
      |> Repo.insert()
    end
  end

  def discover(_parent, %{topic: topic} = args, _context) do
    mode = if args[:mode] == "preview", do: :preview, else: :normal

    {:ok, results} = Brave.discover_news(topic, mode: mode)

    articles =
      results
      |> Enum.filter(fn r -> r.thumbnail != nil end)
      |> Enum.map(fn r ->
        %{
          title: r.title,
          content: r.content,
          url: r.url,
          thumbnail: r.thumbnail
        }
      end)

    {:ok, articles}
  end
end
