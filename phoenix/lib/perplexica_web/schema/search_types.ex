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

    # ── Instrumentation ─────────────────────────────────────
    # Wall-clock ms at the moment the pipeline emitted this event.
    # The frontend uses it to plot a live timeline and to compute a
    # per-event latency independent of the client's own clock drift.
    field :emitted_at_ms, :float

    # Which pipeline stage is running (classifier | researcher |
    # stream_answer | etc). Non-nil on every emitted event so the
    # frontend always knows where the user is waiting. Nil for events
    # that belong to no particular stage.
    field :step, :string

    # Milliseconds elapsed in `step` at the moment of emission. On
    # `{:error, ...}` events this is the measured time the failing
    # stage had been running — this is what lets the UI show
    # "Failed in classifier after 4.2s".
    field :elapsed_ms, :float
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
