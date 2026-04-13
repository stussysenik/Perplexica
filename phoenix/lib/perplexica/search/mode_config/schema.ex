defmodule Perplexica.Search.ModeConfig.Schema do
  @moduledoc """
  Ecto schema for the `search_mode_configs` table. One row per mode
  (`speed` / `balanced` / `quality`) holding the runtime-editable
  iteration cap and soft time budget.

  Consumers should use `Perplexica.Search.ModeConfig` (the context module),
  not this schema directly — the context hides the DB and fronts a
  `:persistent_term` cache.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @valid_modes ~w(speed balanced quality)
  @max_iterations_range 1..50
  @budget_ms_range 1000..120_000

  schema "search_mode_configs" do
    field :mode, :string
    field :max_iterations, :integer
    field :budget_ms, :integer

    timestamps()
  end

  @doc false
  def changeset(row, attrs) do
    row
    |> cast(attrs, [:mode, :max_iterations, :budget_ms])
    |> validate_required([:mode, :max_iterations, :budget_ms])
    |> validate_inclusion(:mode, @valid_modes)
    |> validate_number(:max_iterations,
      greater_than_or_equal_to: @max_iterations_range.first,
      less_than_or_equal_to: @max_iterations_range.last
    )
    |> validate_number(:budget_ms,
      greater_than_or_equal_to: @budget_ms_range.first,
      less_than_or_equal_to: @budget_ms_range.last
    )
    |> unique_constraint(:mode)
  end

  def valid_modes, do: @valid_modes
  def max_iterations_range, do: @max_iterations_range
  def budget_ms_range, do: @budget_ms_range
end
