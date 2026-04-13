defmodule Perplexica.Repo.Migrations.AddChatLifecycleFields do
  use Ecto.Migration

  @moduledoc """
  Add bookmark / archive / trash timestamps to `chats`.

  Three nullable columns drive three separate library states:
  - `bookmarked_at` — non-nil means the chat is bookmarked (keyed to a
    moment in time so UIs can order "most recently bookmarked first").
  - `archived_at`   — non-nil hides the chat from the default list but
    keeps it permanently until the user restores or trashes it.
  - `trashed_at`    — non-nil puts the chat in the trash. A background
    purger (`Perplexica.Library.Purger`) hard-deletes rows where
    `trashed_at < now - 30 days`, giving users a 30-day grace window.

  Indexes on each column make the tab filters in `LibraryPage` cheap to
  query even with thousands of chats — the default `chats` query still
  needs a composite predicate (`archived_at IS NULL AND trashed_at IS NULL`)
  but each individual filter sits on an index.
  """

  def change do
    alter table(:chats) do
      add :bookmarked_at, :utc_datetime_usec, null: true
      add :archived_at, :utc_datetime_usec, null: true
      add :trashed_at, :utc_datetime_usec, null: true
    end

    create index(:chats, [:bookmarked_at], where: "bookmarked_at IS NOT NULL")
    create index(:chats, [:archived_at],   where: "archived_at IS NOT NULL")
    create index(:chats, [:trashed_at],    where: "trashed_at IS NOT NULL")
  end
end
