defmodule PerplexicaWeb.Resolvers.ChatResolver do
  @moduledoc "GraphQL resolvers for chat/message operations."

  import Ecto.Query
  alias Perplexica.{Repo, Chat, Message, Library}

  def list_chats(_parent, _args, _context) do
    # Delegate to the Library context so the archive/trash filter rules
    # stay in one place. This returns only active chats (archived and
    # trashed rows are filtered out) — the Library tabs query them via
    # dedicated resolvers.
    chats = Library.list_chats() |> Enum.map(&format_chat/1)
    {:ok, chats}
  end

  def get_chat(_parent, %{id: id}, _context) do
    case Repo.get(Chat, id) do
      nil -> {:error, "Chat not found"}
      chat ->
        messages =
          Message
          |> where(chat_id: ^id)
          |> order_by(:inserted_at)
          |> Repo.all()
          |> Enum.map(&format_message/1)

        {:ok, format_chat(chat) |> Map.put(:messages, messages)}
    end
  end

  def get_messages(_parent, %{chat_id: chat_id}, _context) do
    messages =
      Message
      |> where(chat_id: ^chat_id)
      |> order_by(:inserted_at)
      |> Repo.all()
      |> Enum.map(&format_message/1)

    {:ok, messages}
  end

  def delete_chat(_parent, %{id: id}, _context) do
    case Repo.get(Chat, id) do
      nil -> {:ok, %{success: false}}
      chat ->
        Repo.delete(chat)
        {:ok, %{success: true}}
    end
  end

  defp format_chat(chat) do
    %{
      id: chat.id,
      title: chat.title,
      sources: chat.sources,
      files: chat.files,
      created_at: to_string(chat.inserted_at),
      bookmarked_at: chat.bookmarked_at && to_string(chat.bookmarked_at),
      archived_at: chat.archived_at && to_string(chat.archived_at),
      trashed_at: chat.trashed_at && to_string(chat.trashed_at),
      purges_at:
        case Library.purges_at(chat) do
          nil -> nil
          dt -> to_string(dt)
        end
    }
  end

  defp format_message(msg) do
    %{
      id: to_string(msg.id),
      message_id: msg.message_id,
      chat_id: msg.chat_id,
      query: msg.query,
      response_blocks: msg.response_blocks,
      status: msg.status,
      created_at: to_string(msg.inserted_at)
    }
  end
end
