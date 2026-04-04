defmodule Perplexica.Bookmark do
  @moduledoc """
  Ecto schema for the bookmarks table.

  A bookmark saves a message for quick retrieval later. Each message can
  be bookmarked at most once (enforced by a unique index on message_id).
  An optional free-text note lets the user annotate why the answer was
  worth saving.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}

  schema "bookmarks" do
    field :note, :string

    belongs_to :message, Perplexica.Message

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(bookmark, attrs) do
    bookmark
    |> cast(attrs, [:message_id, :note])
    |> validate_required([:message_id])
    |> unique_constraint(:message_id)
    |> foreign_key_constraint(:message_id)
  end
end
