defmodule Perplexica.User do
  @moduledoc """
  Ecto schema for the users table.

  Stores password auth credentials for Redwood dbAuth.
  This table is written by the Redwood API and read by both services.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}

  schema "users" do
    field :password_hash, :string
    field :salt, :string
    field :reset_token, :string
    field :reset_token_expires_at, :utc_datetime_usec

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(user, attrs) do
    user
    |> cast(attrs, [:password_hash, :salt, :reset_token, :reset_token_expires_at])
    |> validate_required([:password_hash, :salt])
  end
end
