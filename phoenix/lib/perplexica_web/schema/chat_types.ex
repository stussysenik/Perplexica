defmodule PerplexicaWeb.Schema.ChatTypes do
  @moduledoc "GraphQL types for chat/message operations."

  use Absinthe.Schema.Notation

  object :chat do
    field :id, non_null(:id)
    field :title, non_null(:string)
    field :sources, :json
    field :files, :json
    field :created_at, :string
    field :messages, list_of(:message)

    # Lifecycle timestamps — nullable. Non-nil means the chat is in that
    # state. The UI uses these to pick the right tab/row treatment and
    # to render "bookmarked Xd ago", "purges in Nd", etc.
    field :bookmarked_at, :string
    field :archived_at, :string
    field :trashed_at, :string

    # `trashed_at + 30 days` — when the Purger will hard-delete this row.
    # Only non-nil for trashed chats.
    field :purges_at, :string
  end

  object :message do
    field :id, non_null(:id)
    field :message_id, non_null(:string)
    field :chat_id, non_null(:id)
    field :query, non_null(:string)
    field :response_blocks, :json
    field :status, non_null(:string)
    field :created_at, :string
  end

  # ── Share links & bookmarks ──────────────────────────────────────────

  object :shared_link do
    field :id, non_null(:id)
    field :slug, non_null(:string)
    field :url, non_null(:string)
    field :message_id, non_null(:id)
    field :inserted_at, :string
  end

  object :bookmark do
    field :id, non_null(:id)
    field :message_id, non_null(:id)
    field :note, :string
    field :inserted_at, :string
  end

  object :bookmark_toggle_result do
    field :bookmarked, non_null(:boolean)
    field :bookmark, :bookmark
  end
end
