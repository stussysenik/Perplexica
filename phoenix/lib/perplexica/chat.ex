defmodule Perplexica.Chat do
  @moduledoc """
  Ecto schema for the chats table.

  A chat represents a conversation thread containing multiple messages.
  It stores the search sources used and any uploaded files.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "chats" do
    field :title, :string
    field :sources, {:array, :string}, default: []
    field :files, {:array, :map}, default: []

    has_many :messages, Perplexica.Message
    has_many :search_sessions, Perplexica.Search.SessionRecord

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(chat, attrs) do
    chat
    |> cast(attrs, [:title, :sources, :files])
    |> validate_required([:title])
  end
end
