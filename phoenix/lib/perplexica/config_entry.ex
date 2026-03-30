defmodule Perplexica.ConfigEntry do
  @moduledoc """
  Ecto schema for the config table.

  Key-value store for application configuration, replacing
  the file-based data/config.json from the original Next.js app.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:key, :string, autogenerate: false}

  schema "config" do
    field :value, :map

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(entry, attrs) do
    entry
    |> cast(attrs, [:key, :value])
    |> validate_required([:key, :value])
  end
end
