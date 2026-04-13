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
