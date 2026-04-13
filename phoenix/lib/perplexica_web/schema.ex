defmodule PerplexicaWeb.Schema do
  @moduledoc """
  Root Absinthe GraphQL schema for Perplexica.

  Defines queries, mutations, and subscriptions for the search engine.
  """

  use Absinthe.Schema

  import_types PerplexicaWeb.Schema.SearchTypes
  import_types PerplexicaWeb.Schema.ChatTypes
  import_types PerplexicaWeb.Schema.ModeConfigTypes

  query do
    @desc "List all chats"
    field :chats, list_of(:chat) do
      resolve &PerplexicaWeb.Resolvers.ChatResolver.list_chats/3
    end

    @desc "Get a single chat with messages"
    field :chat, :chat do
      arg :id, non_null(:id)
      resolve &PerplexicaWeb.Resolvers.ChatResolver.get_chat/3
    end

    @desc "Get messages for a chat"
    field :messages, list_of(:message) do
      arg :chat_id, non_null(:id)
      resolve &PerplexicaWeb.Resolvers.ChatResolver.get_messages/3
    end

    @desc "List configured AI model providers"
    field :providers, list_of(:provider) do
      resolve &PerplexicaWeb.Resolvers.ProviderResolver.list_providers/3
    end

    @desc "Get discover news by topic"
    field :discover, list_of(:discover_article) do
      arg :topic, non_null(:string)
      arg :mode, :string, default_value: "normal"
      resolve &PerplexicaWeb.Resolvers.SearchResolver.discover/3
    end

    @desc "Health check"
    field :health, :health_status do
      resolve fn _, _ ->
        {:ok, %{status: "ok", version: "0.1.0"}}
      end
    end

    @desc "Resolve a shared message by its slug"
    field :shared_message, :message do
      arg :slug, non_null(:string)
      resolve &PerplexicaWeb.Resolvers.ShareResolver.get_shared_message/3
    end

    @desc "Get a bookmark for a specific message"
    field :bookmark, :bookmark do
      arg :message_id, non_null(:id)
      resolve &PerplexicaWeb.Resolvers.ShareResolver.get_bookmark/3
    end

    @desc "List all bookmarks"
    field :bookmarks, list_of(:bookmark) do
      resolve &PerplexicaWeb.Resolvers.ShareResolver.list_bookmarks/3
    end

    @desc "List the per-mode research configurations"
    field :mode_configs, list_of(non_null(:mode_config)) do
      resolve &PerplexicaWeb.Resolvers.ModeConfigResolver.list/3
    end

    # ── Library tabs ────────────────────────────────────────────
    # Chat-level lists that back the Library Bookmarks / Archive /
    # Trash tabs. The default `chats` query above already excludes
    # archived and trashed rows so the main Chats tab can keep using
    # it unchanged.

    @desc "List bookmarked chats, most recently bookmarked first"
    field :bookmarked_chats, list_of(:chat) do
      resolve &PerplexicaWeb.Resolvers.LibraryResolver.list_bookmarked/3
    end

    @desc "List archived chats (not trashed), most recently archived first"
    field :archived_chats, list_of(:chat) do
      resolve &PerplexicaWeb.Resolvers.LibraryResolver.list_archived/3
    end

    @desc "List trashed chats with a 30-day purge countdown, newest first"
    field :trashed_chats, list_of(:chat) do
      resolve &PerplexicaWeb.Resolvers.LibraryResolver.list_trashed/3
    end
  end

  mutation do
    @desc "Start a new search. Returns session ID for subscription."
    field :start_search, :search_start_result do
      arg :query, non_null(:string)
      arg :chat_id, non_null(:string)
      arg :message_id, non_null(:string)
      arg :optimization_mode, :string, default_value: "balanced"
      arg :sources, list_of(:string), default_value: []
      arg :history, list_of(:history_entry), default_value: []
      arg :system_instructions, :string
      resolve &PerplexicaWeb.Resolvers.SearchResolver.start_search/3
    end

    @desc "Delete a chat"
    field :delete_chat, :delete_result do
      arg :id, non_null(:id)
      resolve &PerplexicaWeb.Resolvers.ChatResolver.delete_chat/3
    end

    @desc "Create a shareable link for a message"
    field :create_share_link, :shared_link do
      arg :message_id, non_null(:id)
      resolve &PerplexicaWeb.Resolvers.ShareResolver.create_share_link/3
    end

    @desc "Toggle bookmark on a message (create or remove)"
    field :toggle_bookmark, :bookmark_toggle_result do
      arg :message_id, non_null(:id)
      resolve &PerplexicaWeb.Resolvers.ShareResolver.toggle_bookmark/3
    end

    @desc "Update a search mode's iteration cap and budget"
    field :update_mode_config, :mode_config do
      arg :mode, non_null(:string)
      arg :max_iterations, non_null(:integer)
      arg :budget_ms, non_null(:integer)
      resolve &PerplexicaWeb.Resolvers.ModeConfigResolver.update/3
    end

    @desc "Reset a search mode to its seed defaults"
    field :reset_mode_config, :mode_config do
      arg :mode, non_null(:string)
      resolve &PerplexicaWeb.Resolvers.ModeConfigResolver.reset/3
    end

    # ── Chat lifecycle ──────────────────────────────────────────
    # Chat-level bookmark / archive / soft-delete / restore / purge
    # mutations. Soft-delete (trash) is the default user-facing action
    # with a 30-day grace window; `purge_chat` is a hard delete reserved
    # for the Trash tab confirm dialog and the background Purger.

    @desc "Toggle the bookmark state of a chat (set or clear bookmarked_at)"
    field :toggle_chat_bookmark, :chat do
      arg :id, non_null(:id)
      resolve &PerplexicaWeb.Resolvers.LibraryResolver.toggle_chat_bookmark/3
    end

    @desc "Archive a chat (hides it from the default Chats list)"
    field :archive_chat, :chat do
      arg :id, non_null(:id)
      resolve &PerplexicaWeb.Resolvers.LibraryResolver.archive_chat/3
    end

    @desc "Restore a chat from archive and/or trash (clears both timestamps)"
    field :restore_chat, :chat do
      arg :id, non_null(:id)
      resolve &PerplexicaWeb.Resolvers.LibraryResolver.restore_chat/3
    end

    @desc "Move a chat to the trash (soft-delete, purged after 30 days)"
    field :trash_chat, :chat do
      arg :id, non_null(:id)
      resolve &PerplexicaWeb.Resolvers.LibraryResolver.trash_chat/3
    end

    @desc "Hard-delete a chat. Irreversible — only exposed from the Trash tab."
    field :purge_chat, :delete_result do
      arg :id, non_null(:id)
      resolve &PerplexicaWeb.Resolvers.LibraryResolver.purge_chat/3
    end
  end

  subscription do
    @desc "Subscribe to search session events (blocks, updates, completion)"
    field :search_updated, :search_event do
      arg :session_id, non_null(:id)

      config fn args, _context ->
        {:ok, topic: "search:#{args.session_id}"}
      end

      resolve fn root, _, _ -> {:ok, root} end
    end
  end
end
