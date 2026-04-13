defmodule Perplexica.Chat do
  @moduledoc """
  Ecto schema for the chats table.

  A chat represents a conversation thread containing multiple messages.
  It stores the search sources used and any uploaded files, plus three
  lifecycle timestamps (`bookmarked_at`, `archived_at`, `trashed_at`)
  that drive the Library tabs and the 30-day soft-delete retention.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "chats" do
    field :title, :string
    field :sources, {:array, :string}, default: []
    field :files, {:array, :map}, default: []

    # Lifecycle timestamps — nullable. See the migration for semantics.
    field :bookmarked_at, :utc_datetime_usec
    field :archived_at,   :utc_datetime_usec
    field :trashed_at,    :utc_datetime_usec

    has_many :messages, Perplexica.Message
    has_many :search_sessions, Perplexica.Search.SessionRecord

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(chat, attrs) do
    chat
    |> cast(attrs, [:title, :sources, :files, :bookmarked_at, :archived_at, :trashed_at])
    |> validate_required([:title])
  end

  @doc "True if the chat has a non-nil bookmarked_at timestamp."
  def bookmarked?(%__MODULE__{bookmarked_at: nil}), do: false
  def bookmarked?(%__MODULE__{bookmarked_at: _}),  do: true

  @doc "True if the chat has a non-nil archived_at timestamp."
  def archived?(%__MODULE__{archived_at: nil}), do: false
  def archived?(%__MODULE__{archived_at: _}),  do: true

  @doc "True if the chat has a non-nil trashed_at timestamp."
  def trashed?(%__MODULE__{trashed_at: nil}), do: false
  def trashed?(%__MODULE__{trashed_at: _}),  do: true
end
