defmodule PerplexicaWeb.Resolvers.ChatResolver do
  @moduledoc "GraphQL resolvers for chat/message operations."

  import Ecto.Query
  alias Perplexica.{Repo, Chat, Message}

  def list_chats(_parent, _args, _context) do
    chats =
      Chat
      |> order_by(desc: :inserted_at)
      |> Repo.all()
      |> Enum.map(&format_chat/1)

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
      created_at: to_string(chat.inserted_at)
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
