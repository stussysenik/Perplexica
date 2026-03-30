defmodule Perplexica.Search.SessionRecord do
  @moduledoc """
  Ecto schema for the search_sessions table.

  Stores GenServer state checkpoints for crash recovery. After each
  research iteration, the SearchSession GenServer writes its state here.
  On restart, it loads the last checkpoint and resumes.

  Status lifecycle: active → completed | crashed
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "search_sessions" do
    field :message_id, :string
    field :state, :map, default: %{}
    field :iteration, :integer, default: 0
    field :status, :string, default: "active"

    belongs_to :chat, Perplexica.Chat

    timestamps(type: :utc_datetime_usec)
  end

  @valid_statuses ~w(active completed crashed)

  def changeset(record, attrs) do
    record
    |> cast(attrs, [:chat_id, :message_id, :state, :iteration, :status])
    |> validate_required([:message_id])
    |> validate_inclusion(:status, @valid_statuses)
  end
end
