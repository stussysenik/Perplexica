defmodule Perplexica.Repo.Migrations.CreateCoreTables do
  use Ecto.Migration

  def change do
    # Enable pgvector extension for embedding storage
    execute "CREATE EXTENSION IF NOT EXISTS vector", "DROP EXTENSION IF EXISTS vector"

    # ── Chats ──────────────────────────────────────────────────────────
    create table(:chats, primary_key: false) do
      add :id, :uuid, primary_key: true, default: fragment("gen_random_uuid()")
      add :title, :text, null: false
      add :sources, :jsonb, null: false, default: "[]"
      add :files, :jsonb, null: false, default: "[]"

      timestamps(type: :utc_datetime_usec)
    end

    # ── Messages ───────────────────────────────────────────────────────
    create table(:messages) do
      add :message_id, :text, null: false
      add :chat_id, references(:chats, type: :uuid, on_delete: :delete_all), null: false
      add :backend_id, :text, null: false
      add :query, :text, null: false
      add :response_blocks, :jsonb, default: "[]"
      add :status, :text, null: false, default: "answering"

      timestamps(type: :utc_datetime_usec)
    end

    create index(:messages, [:chat_id])
    create index(:messages, [:message_id])

    create constraint(:messages, :valid_status,
      check: "status IN ('answering', 'completed', 'error')"
    )

    # ── Search Sessions (GenServer checkpoint state) ───────────────────
    create table(:search_sessions, primary_key: false) do
      add :id, :uuid, primary_key: true, default: fragment("gen_random_uuid()")
      add :chat_id, references(:chats, type: :uuid, on_delete: :nilify_all), null: true
      add :message_id, :text, null: false
      add :state, :jsonb, null: false, default: "{}"
      add :iteration, :integer, null: false, default: 0
      add :status, :text, null: false, default: "active"

      timestamps(type: :utc_datetime_usec)
    end

    create index(:search_sessions, [:chat_id])

    create constraint(:search_sessions, :valid_session_status,
      check: "status IN ('active', 'completed', 'crashed')"
    )

    # ── Config (replaces data/config.json) ─────────────────────────────
    create table(:config, primary_key: false) do
      add :key, :text, primary_key: true
      add :value, :jsonb, null: false

      timestamps(type: :utc_datetime_usec)
    end

    # ── Model Providers ────────────────────────────────────────────────
    create table(:model_providers, primary_key: false) do
      add :id, :uuid, primary_key: true, default: fragment("gen_random_uuid()")
      add :name, :text, null: false
      add :type, :text, null: false
      add :config, :jsonb, null: false, default: "{}"
      add :chat_models, :jsonb, null: false, default: "[]"
      add :embedding_models, :jsonb, null: false, default: "[]"
      add :hash, :text, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:model_providers, [:hash])

    # ── Uploads ────────────────────────────────────────────────────────
    create table(:uploads, primary_key: false) do
      add :id, :uuid, primary_key: true, default: fragment("gen_random_uuid()")
      add :name, :text, null: false
      add :mime_type, :text, null: false
      add :size_bytes, :integer, null: false
      add :storage_key, :text, null: false

      timestamps(type: :utc_datetime_usec)
    end

    # ── Upload Chunks (with pgvector embeddings) ───────────────────────
    create table(:upload_chunks) do
      add :upload_id, references(:uploads, type: :uuid, on_delete: :delete_all), null: false
      add :content, :text, null: false
      add :embedding, :"vector(1024)", null: false
      add :chunk_index, :integer, null: false
    end

    create index(:upload_chunks, [:upload_id])

    # ── Users (for Redwood dbAuth) ─────────────────────────────────────
    create table(:users, primary_key: false) do
      add :id, :uuid, primary_key: true, default: fragment("gen_random_uuid()")
      add :password_hash, :text, null: false
      add :salt, :text, null: false
      add :reset_token, :text
      add :reset_token_expires_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end
  end
end
