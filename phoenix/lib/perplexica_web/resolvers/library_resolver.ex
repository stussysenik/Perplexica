defmodule PerplexicaWeb.Resolvers.LibraryResolver do
  @moduledoc """
  GraphQL resolvers for the Library tabs (Chats / Bookmarks / Archive /
  Trash) and the chat lifecycle mutations (bookmark, archive, restore,
  trash, purge).

  All reads go through `Perplexica.Library` context functions so the
  filtering rules stay in one place — resolvers are thin wrappers that
  format the Ecto rows for the GraphQL type and attach a computed
  `purges_at` to trashed chats.

  The default chat listing (`list_chats`) lives in `ChatResolver` and
  was updated in the same change to exclude archived/trashed rows, so
  the main Chats tab keeps using that existing resolver for backward
  compatibility.
  """

  alias Perplexica.{Library, Repo, Chat}

  # ── List queries ────────────────────────────────────────────────

  def list_bookmarked(_parent, _args, _context) do
    {:ok, Library.list_bookmarked() |> Enum.map(&format/1)}
  end

  def list_archived(_parent, _args, _context) do
    {:ok, Library.list_archived() |> Enum.map(&format/1)}
  end

  def list_trashed(_parent, _args, _context) do
    {:ok, Library.list_trashed() |> Enum.map(&format/1)}
  end

  # ── Mutations ───────────────────────────────────────────────────

  def toggle_chat_bookmark(_parent, %{id: id}, _context) do
    case Library.toggle_bookmark(id) do
      {:ok, chat} -> {:ok, format(chat)}
      {:error, :not_found} -> {:error, "Chat not found"}
      {:error, cs} -> {:error, "Bookmark toggle failed: #{inspect(cs.errors)}"}
    end
  end

  def archive_chat(_parent, %{id: id}, _context) do
    case Library.archive(id) do
      {:ok, chat} -> {:ok, format(chat)}
      {:error, :not_found} -> {:error, "Chat not found"}
      {:error, cs} -> {:error, "Archive failed: #{inspect(cs.errors)}"}
    end
  end

  def restore_chat(_parent, %{id: id}, _context) do
    case Library.restore(id) do
      {:ok, chat} -> {:ok, format(chat)}
      {:error, :not_found} -> {:error, "Chat not found"}
      {:error, cs} -> {:error, "Restore failed: #{inspect(cs.errors)}"}
    end
  end

  def trash_chat(_parent, %{id: id}, _context) do
    case Library.trash(id) do
      {:ok, chat} -> {:ok, format(chat)}
      {:error, :not_found} -> {:error, "Chat not found"}
      {:error, cs} -> {:error, "Trash failed: #{inspect(cs.errors)}"}
    end
  end

  def purge_chat(_parent, %{id: id}, _context) do
    case Repo.get(Chat, id) do
      nil -> {:ok, %{success: false}}
      chat ->
        case Library.purge(chat) do
          {:ok, _} -> {:ok, %{success: true}}
          {:error, _} -> {:ok, %{success: false}}
        end
    end
  end

  # ── Helpers ─────────────────────────────────────────────────────

  defp format(%Chat{} = chat) do
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
end
