defmodule PerplexicaWeb.Resolvers.ShareResolver do
  @moduledoc "GraphQL resolvers for share links and bookmarks."

  import Ecto.Query
  alias Perplexica.{Repo, Message, SharedLink, Bookmark}

  # ── Share Links ──────────────────────────────────────────────────────

  def create_share_link(_parent, %{message_id: message_id}, _context) do
    message_id = to_integer(message_id)

    case Repo.get(Message, message_id) do
      nil ->
        {:error, "Message not found"}

      _message ->
        %SharedLink{}
        |> SharedLink.changeset(%{message_id: message_id})
        |> Repo.insert()
        |> case do
          {:ok, link} -> {:ok, format_shared_link(link)}
          {:error, changeset} -> {:error, format_errors(changeset)}
        end
    end
  end

  def get_shared_message(_parent, %{slug: slug}, _context) do
    case Repo.get_by(SharedLink, slug: slug) do
      nil ->
        {:error, "Shared link not found"}

      %SharedLink{expires_at: expires_at} = link when not is_nil(expires_at) ->
        if DateTime.compare(expires_at, DateTime.utc_now()) == :gt do
          resolve_shared_message(link)
        else
          {:error, "Shared link has expired"}
        end

      link ->
        resolve_shared_message(link)
    end
  end

  defp resolve_shared_message(%SharedLink{message_id: message_id}) do
    case Repo.get(Message, message_id) do
      nil -> {:error, "Message not found"}
      message -> {:ok, format_message(message)}
    end
  end

  # ── Bookmarks ────────────────────────────────────────────────────────

  def toggle_bookmark(_parent, %{message_id: message_id}, _context) do
    message_id = to_integer(message_id)

    case Repo.get_by(Bookmark, message_id: message_id) do
      nil ->
        # Create bookmark
        case Repo.get(Message, message_id) do
          nil ->
            {:error, "Message not found"}

          _message ->
            %Bookmark{}
            |> Bookmark.changeset(%{message_id: message_id})
            |> Repo.insert()
            |> case do
              {:ok, bookmark} ->
                {:ok, %{bookmarked: true, bookmark: format_bookmark(bookmark)}}

              {:error, changeset} ->
                {:error, format_errors(changeset)}
            end
        end

      bookmark ->
        # Remove bookmark
        Repo.delete(bookmark)
        {:ok, %{bookmarked: false, bookmark: nil}}
    end
  end

  def get_bookmark(_parent, %{message_id: message_id}, _context) do
    message_id = to_integer(message_id)

    case Repo.get_by(Bookmark, message_id: message_id) do
      nil -> {:ok, nil}
      bookmark -> {:ok, format_bookmark(bookmark)}
    end
  end

  def list_bookmarks(_parent, _args, _context) do
    bookmarks =
      Bookmark
      |> order_by(desc: :inserted_at)
      |> Repo.all()
      |> Enum.map(&format_bookmark/1)

    {:ok, bookmarks}
  end

  # ── Formatters ───────────────────────────────────────────────────────

  defp format_shared_link(link) do
    %{
      id: link.id,
      slug: link.slug,
      url: "/s/#{link.slug}",
      message_id: to_string(link.message_id),
      inserted_at: to_string(link.inserted_at)
    }
  end

  defp format_bookmark(bookmark) do
    %{
      id: bookmark.id,
      message_id: to_string(bookmark.message_id),
      note: bookmark.note,
      inserted_at: to_string(bookmark.inserted_at)
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

  # GraphQL sends IDs as strings; the messages table uses bigint PKs.
  defp to_integer(value) when is_binary(value), do: String.to_integer(value)
  defp to_integer(value) when is_integer(value), do: value

  defp format_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Regex.replace(~r"%{(\w+)}", msg, fn _, key ->
        opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
      end)
    end)
    |> Enum.map(fn {field, messages} -> "#{field}: #{Enum.join(messages, ", ")}" end)
    |> Enum.join("; ")
  end
end
