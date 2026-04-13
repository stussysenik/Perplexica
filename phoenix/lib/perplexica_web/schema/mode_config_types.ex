defmodule PerplexicaWeb.Schema.ModeConfigTypes do
  @moduledoc """
  Absinthe types for the search-mode configuration surface.
  """

  use Absinthe.Schema.Notation

  @desc "Per-mode research configuration — iteration cap and soft time budget."
  object :mode_config do
    @desc "Mode identifier: speed, balanced, or quality"
    field :mode, non_null(:string)

    @desc "Maximum number of research iterations before the loop cuts off"
    field :max_iterations, non_null(:integer)

    @desc "Soft time budget in milliseconds. The current iteration always finishes."
    field :budget_ms, non_null(:integer)
  end
end
