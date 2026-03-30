defmodule Perplexica.Models.ProviderRecord do
  @moduledoc """
  Ecto schema for the model_providers table.

  Stores AI model provider configurations (NVIDIA NIM, Zhipu GLM, etc.).
  The hash field enables deduplication — if a provider with the same
  config hash already exists, it won't be duplicated on restart.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}

  schema "model_providers" do
    field :name, :string
    field :type, :string
    field :config, :map, default: %{}
    field :chat_models, {:array, :map}, default: []
    field :embedding_models, {:array, :map}, default: []
    field :hash, :string

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(provider, attrs) do
    provider
    |> cast(attrs, [:name, :type, :config, :chat_models, :embedding_models, :hash])
    |> validate_required([:name, :type, :hash])
    |> unique_constraint(:hash)
  end
end
