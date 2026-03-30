defmodule PerplexicaWeb.Schema.SearchTypes do
  @moduledoc "GraphQL types for search operations."

  use Absinthe.Schema.Notation

  scalar :json, name: "JSON" do
    serialize fn value -> value end
    parse fn
      %Absinthe.Blueprint.Input.String{value: value} -> Jason.decode(value)
      %Absinthe.Blueprint.Input.Null{} -> {:ok, nil}
      _ -> :error
    end
  end

  input_object :history_entry do
    field :role, non_null(:string)
    field :content, non_null(:string)
  end

  object :search_start_result do
    field :session_id, non_null(:id)
    field :status, non_null(:string)
  end

  object :search_event do
    field :type, non_null(:string)
    field :block, :json
    field :block_id, :string
    field :patch, :json
    field :data, :string
  end

  object :discover_article do
    field :title, :string
    field :content, :string
    field :url, :string
    field :thumbnail, :string
  end

  object :health_status do
    field :status, non_null(:string)
    field :version, non_null(:string)
  end

  object :provider do
    field :key, non_null(:string)
    field :health, non_null(:string)
    field :chat_models, list_of(:model_info)
    field :embedding_models, list_of(:model_info)
  end

  object :model_info do
    field :key, non_null(:string)
    field :name, non_null(:string)
  end

  object :delete_result do
    field :success, non_null(:boolean)
  end
end
