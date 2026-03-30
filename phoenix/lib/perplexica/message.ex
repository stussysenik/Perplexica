defmodule Perplexica.Message do
  @moduledoc """
  Ecto schema for the messages table.

  Each message represents a single query-response pair within a chat.
  The response_blocks field stores the structured blocks (text, sources,
  widgets, research steps) as JSONB.

  Status lifecycle: answering → completed | error
  """
  use Ecto.Schema
  import Ecto.Changeset

  @foreign_key_type :binary_id

  schema "messages" do
    field :message_id, :string
    field :backend_id, :string
    field :query, :string
    field :response_blocks, {:array, :map}, default: []
    field :status, :string, default: "answering"

    belongs_to :chat, Perplexica.Chat

    timestamps(type: :utc_datetime_usec)
  end

  @valid_statuses ~w(answering completed error)

  def changeset(message, attrs) do
    message
    |> cast(attrs, [:message_id, :chat_id, :backend_id, :query, :response_blocks, :status])
    |> validate_required([:message_id, :chat_id, :backend_id, :query])
    |> validate_inclusion(:status, @valid_statuses)
    |> foreign_key_constraint(:chat_id)
  end
end
