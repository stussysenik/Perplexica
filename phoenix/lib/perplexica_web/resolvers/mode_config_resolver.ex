defmodule PerplexicaWeb.Resolvers.ModeConfigResolver do
  @moduledoc """
  GraphQL resolvers for the per-mode research configuration surface.

  Authorization is handled upstream by `PerplexicaWeb.Plugs.RequireOwner`
  on the `:api` pipeline — these resolvers trust the caller to already
  be an allowlisted GitHub user.
  """

  alias Perplexica.Search.ModeConfig

  @mode_order %{"speed" => 0, "balanced" => 1, "quality" => 2}

  def list(_parent, _args, _resolution) do
    configs =
      ModeConfig.get_all()
      |> Enum.map(fn {mode, %{max_iterations: iters, budget_ms: budget}} ->
        %{mode: mode, max_iterations: iters, budget_ms: budget}
      end)
      |> Enum.sort_by(fn %{mode: mode} -> Map.get(@mode_order, mode, 99) end)

    {:ok, configs}
  end

  def update(_parent, %{mode: mode} = args, _resolution) do
    attrs = %{max_iterations: args[:max_iterations], budget_ms: args[:budget_ms]}

    case ModeConfig.update(mode, attrs) do
      {:ok, row} ->
        {:ok, to_payload(row)}

      {:error, errors} ->
        {:error, build_error(errors)}
    end
  end

  def reset(_parent, %{mode: mode}, _resolution) do
    case ModeConfig.reset(mode) do
      {:ok, row} -> {:ok, to_payload(row)}
      {:error, errors} -> {:error, build_error(errors)}
    end
  end

  defp to_payload(row) do
    %{
      mode: row.mode,
      max_iterations: row.max_iterations,
      budget_ms: row.budget_ms
    }
  end

  defp build_error(errors) when is_list(errors) do
    fields =
      errors
      |> Enum.map(fn {field, msg} -> {Atom.to_string(field), msg} end)
      |> Map.new()

    [
      message: "validation failed",
      extensions: %{code: "validation_failed", fields: fields}
    ]
  end

  defp build_error(other), do: [message: inspect(other)]
end
