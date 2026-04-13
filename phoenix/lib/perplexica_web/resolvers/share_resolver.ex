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
  #
  # Client sends `messageId` as the UUID-shaped `message_id` string on the
  # Message row (not its integer PK). We look up the Message by that UUID
  # and use its real integer `id` for the Bookmark foreign key.

  def toggle_bookmark(_parent, %{message_id: message_id_str}, _context) do
    case resolve_message_pk(message_id_str) do
      {:error, reason} ->
        {:error, reason}

      {:ok, message_pk} ->
        case Repo.get_by(Bookmark, message_id: message_pk) do
          nil ->
            %Bookmark{}
            |> Bookmark.changeset(%{message_id: message_pk})
            |> Repo.insert()
            |> case do
              {:ok, bookmark} ->
                {:ok, %{bookmarked: true, bookmark: format_bookmark(bookmark)}}

              {:error, changeset} ->
                {:error, format_errors(changeset)}
            end

          bookmark ->
            Repo.delete(bookmark)
            {:ok, %{bookmarked: false, bookmark: nil}}
        end
    end
  end

  def get_bookmark(_parent, %{message_id: message_id_str}, _context) do
    case resolve_message_pk(message_id_str) do
      {:error, _} -> {:ok, nil}
      {:ok, message_pk} ->
        case Repo.get_by(Bookmark, message_id: message_pk) do
          nil -> {:ok, nil}
          bookmark -> {:ok, format_bookmark(bookmark)}
        end
    end
  end

  # Accept either a bigint PK (legacy) or the client-side UUID and return the
  # underlying integer PK used by Bookmark.message_id.
  defp resolve_message_pk(value) when is_binary(value) do
    case Integer.parse(value) do
      {int, ""} ->
        {:ok, int}

      _ ->
        case Repo.get_by(Message, message_id: value) do
          nil -> {:error, "Message not found"}
          %Message{id: id} -> {:ok, id}
        end
    end
  end

  defp resolve_message_pk(value) when is_integer(value), do: {:ok, value}

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
