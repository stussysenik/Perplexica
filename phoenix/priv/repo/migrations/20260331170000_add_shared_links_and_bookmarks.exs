defmodule Perplexica.Repo.Migrations.AddSharedLinksAndBookmarks do
  use Ecto.Migration

  def change do
    # ── Shared Links ──────────────────────────────────────────────────
    create table(:shared_links, primary_key: false) do
      add :id, :uuid, primary_key: true, default: fragment("gen_random_uuid()")
      add :message_id, references(:messages, on_delete: :delete_all), null: false
      add :slug, :text, null: false
      add :expires_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:shared_links, [:slug])
    create index(:shared_links, [:message_id])

    # ── Bookmarks ─────────────────────────────────────────────────────
    create table(:bookmarks, primary_key: false) do
      add :id, :uuid, primary_key: true, default: fragment("gen_random_uuid()")
      add :message_id, references(:messages, on_delete: :delete_all), null: false
      add :note, :text

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:bookmarks, [:message_id])
  end
end
