defmodule Perplexica.Library do
  @moduledoc """
  Context module for the chat lifecycle that drives the Library tabs:
  Chats, Bookmarks, Archive, Trash.

  The three nullable timestamps on `chats` (bookmarked_at / archived_at /
  trashed_at) define mutually-orthogonal states — a chat can be both
  bookmarked and archived, for example. The list queries below apply the
  right predicates so each tab shows what the user expects:

    * `list_chats/0`          — the default "Chats" tab. Excludes archived
                                 **and** trashed rows so soft-deleted chats
                                 don't clutter the main view.
    * `list_bookmarked/0`     — "Bookmarks" tab. Any chat with a non-nil
                                 `bookmarked_at`, including archived ones —
                                 bookmarks should survive archive/trash so
                                 the user can find them wherever they went.
    * `list_archived/0`       — "Archive" tab. Archived but NOT trashed.
    * `list_trashed/0`        — "Trash" tab. Trashed rows, regardless of
                                 bookmark/archive state, plus a computed
                                 `purges_at` field so the UI can show
                                 "purges in N days".

  Mutation helpers are idempotent: calling `archive/1` on an already-
  archived chat is a no-op. Calling `restore/1` clears both archive and
  trash so a user doesn't have to chain restore twice.

  Hard deletion is split into two paths:
    * `trash/1`  — soft-delete (sets `trashed_at`). Can be restored within
                    30 days. This is what the UI's "delete" affordance maps
                    to by default.
    * `purge/1`  — hard-delete (`Repo.delete/1`). Irreversible. The UI
                    only exposes this from the Trash tab behind a confirm
                    dialog. `Perplexica.Library.Purger` calls this on
                    rows older than 30 days since `trashed_at`.
  """

  import Ecto.Query
  alias Perplexica.{Repo, Chat}

  @purge_after_days 30

  # ── Read queries ───────────────────────────────────────────────────

  @doc """
  Default "Chats" list — excludes archived and trashed rows. This is what
  the Library Chats tab and any other "give me the active chats" caller
  should use.
  """
  def list_chats do
    Chat
    |> where([c], is_nil(c.archived_at) and is_nil(c.trashed_at))
    |> order_by(desc: :inserted_at)
    |> Repo.all()
  end

  @doc """
  Chats with a non-nil `bookmarked_at`, ordered by bookmark recency.
  Includes archived chats — a bookmark intentionally survives archive
  because the user flagged the chat as worth remembering, and that
  intent outlives the "I don't want this in my main list" intent of
  archive. Trashed chats are excluded because a trashed chat is on its
  way out; if the user wants to keep a bookmarked trashed chat they can
  restore it.
  """
  def list_bookmarked do
    Chat
    |> where([c], not is_nil(c.bookmarked_at) and is_nil(c.trashed_at))
    |> order_by(desc: :bookmarked_at)
    |> Repo.all()
  end

  @doc """
  Archived chats that are NOT trashed. Ordered by archive recency so the
  most recently archived rows sit at the top.
  """
  def list_archived do
    Chat
    |> where([c], not is_nil(c.archived_at) and is_nil(c.trashed_at))
    |> order_by(desc: :archived_at)
    |> Repo.all()
  end

  @doc """
  Trashed chats, ordered by trash recency (newest first). Callers should
  compute a `purges_at` timestamp per row — see `purges_at/1` below.
  """
  def list_trashed do
    Chat
    |> where([c], not is_nil(c.trashed_at))
    |> order_by(desc: :trashed_at)
    |> Repo.all()
  end

  @doc """
  The moment a trashed chat will be hard-deleted by the background
  purger. Used by the Trash tab to render "purges in 12 days" badges.
  Returns nil for chats that are not trashed.
  """
  def purges_at(%Chat{trashed_at: nil}), do: nil
  def purges_at(%Chat{trashed_at: at}),
    do: DateTime.add(at, @purge_after_days * 24 * 60 * 60, :second)

  # ── Mutation helpers ──────────────────────────────────────────────

  @doc """
  Toggle the bookmark state of a chat.

  If already bookmarked, clears `bookmarked_at`; otherwise sets it to
  `DateTime.utc_now/0`. Returns `{:ok, chat}` with the updated row so
  the resolver can echo the new state back to the client without a
  second fetch.
  """
  def toggle_bookmark(%Chat{} = chat) do
    next_value =
      if is_nil(chat.bookmarked_at),
        do: DateTime.utc_now(),
        else: nil

    chat
    |> Chat.changeset(%{bookmarked_at: next_value})
    |> Repo.update()
  end

  def toggle_bookmark(chat_id) when is_binary(chat_id) do
    case Repo.get(Chat, chat_id) do
      nil -> {:error, :not_found}
      chat -> toggle_bookmark(chat)
    end
  end

  @doc """
  Archive a chat (idempotent — archiving an already-archived chat is a
  no-op that returns the unchanged row). Leaves `trashed_at` alone.
  """
  def archive(%Chat{archived_at: %DateTime{}} = chat), do: {:ok, chat}
  def archive(%Chat{} = chat) do
    chat
    |> Chat.changeset(%{archived_at: DateTime.utc_now()})
    |> Repo.update()
  end

  def archive(chat_id) when is_binary(chat_id) do
    case Repo.get(Chat, chat_id) do
      nil -> {:error, :not_found}
      chat -> archive(chat)
    end
  end

  @doc """
  Restore a chat from either archive or trash (or both). Clears both
  timestamps in a single update so a user who archived then trashed a
  chat only needs one "Restore" click.
  """
  def restore(%Chat{} = chat) do
    chat
    |> Chat.changeset(%{archived_at: nil, trashed_at: nil})
    |> Repo.update()
  end

  def restore(chat_id) when is_binary(chat_id) do
    case Repo.get(Chat, chat_id) do
      nil -> {:error, :not_found}
      chat -> restore(chat)
    end
  end

  @doc """
  Trash a chat (soft delete). Idempotent — trashing an already-trashed
  chat is a no-op. The row lives for 30 days before `Perplexica.Library.Purger`
  hard-deletes it.
  """
  def trash(%Chat{trashed_at: %DateTime{}} = chat), do: {:ok, chat}
  def trash(%Chat{} = chat) do
    chat
    |> Chat.changeset(%{trashed_at: DateTime.utc_now()})
    |> Repo.update()
  end

  def trash(chat_id) when is_binary(chat_id) do
    case Repo.get(Chat, chat_id) do
      nil -> {:error, :not_found}
      chat -> trash(chat)
    end
  end

  @doc """
  Hard-delete a chat. Irreversible. The UI only exposes this from the
  Trash tab behind a confirm dialog, but the Purger calls it directly
  on expired trash rows.
  """
  def purge(%Chat{} = chat), do: Repo.delete(chat)

  def purge(chat_id) when is_binary(chat_id) do
    case Repo.get(Chat, chat_id) do
      nil -> {:error, :not_found}
      chat -> purge(chat)
    end
  end

  @doc """
  Hard-delete every trashed chat older than `@purge_after_days` (30 days).
  Called by `Perplexica.Library.Purger` once per day. Returns the number
  of rows deleted so the purger can log progress.
  """
  def purge_expired_trash do
    cutoff = DateTime.add(DateTime.utc_now(), -@purge_after_days * 24 * 60 * 60, :second)

    {count, _} =
      Chat
      |> where([c], not is_nil(c.trashed_at) and c.trashed_at < ^cutoff)
      |> Repo.delete_all()

    count
  end
end
