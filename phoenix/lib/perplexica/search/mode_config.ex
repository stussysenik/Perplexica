defmodule Perplexica.Search.ModeConfig do
  @moduledoc """
  Context for search-mode configuration — per-mode `max_iterations` and
  soft time `budget_ms`, persisted in Postgres and cached in
  `:persistent_term` for O(1) read access from the research loop.

  The cache is populated on application boot via `warm_cache/0` and
  refreshed after every successful write. Reads never touch the DB.
  """

  require Logger

  alias Perplexica.Repo
  alias Perplexica.Search.ModeConfig.Schema

  import Ecto.Query, only: [from: 2]

  @cache_key :search_mode_config_cache
  @defaults %{
    "speed" => %{max_iterations: 2, budget_ms: 7_000},
    "balanced" => %{max_iterations: 6, budget_ms: 16_000},
    "quality" => %{max_iterations: 25, budget_ms: 35_000}
  }

  @type mode :: String.t()
  @type config :: %{max_iterations: pos_integer(), budget_ms: pos_integer()}

  @doc "Returns the full cached map of mode configs."
  @spec get_all() :: %{optional(mode) => config}
  def get_all do
    case safe_lookup() do
      nil ->
        warm_cache()
        safe_lookup() || @defaults

      map ->
        map
    end
  end

  @doc "Returns the config for a given mode, falling back to `balanced` defaults."
  @spec get(mode) :: config
  def get(mode) when is_binary(mode) do
    all = get_all()

    case Map.fetch(all, mode) do
      {:ok, config} ->
        config

      :error ->
        Logger.warning("[ModeConfig] unknown mode #{inspect(mode)} — using balanced defaults")
        Map.fetch!(@defaults, "balanced")
    end
  end

  @doc """
  Upsert a config row and refresh the cache.

  Returns `{:ok, row}` on success, `{:error, reason}` on validation
  failure or DB error.
  """
  @spec update(mode, %{max_iterations: integer, budget_ms: integer}) ::
          {:ok, Schema.t()} | {:error, term}
  def update(mode, attrs) when is_binary(mode) and is_map(attrs) do
    attrs = attrs |> Map.put(:mode, mode) |> normalize_keys()

    existing = Repo.get_by(Schema, mode: mode) || %Schema{}

    changeset = Schema.changeset(existing, attrs)

    case Repo.insert_or_update(changeset) do
      {:ok, row} ->
        warm_cache()
        {:ok, row}

      {:error, %Ecto.Changeset{} = cs} ->
        {:error, format_errors(cs)}
    end
  end

  @doc "Reset a mode to its seed defaults."
  @spec reset(mode) :: {:ok, Schema.t()} | {:error, term}
  def reset(mode) when is_binary(mode) do
    case Map.fetch(@defaults, mode) do
      {:ok, defaults} ->
        update(mode, Map.put(defaults, :mode, mode))

      :error ->
        {:error, [mode: "invalid mode #{inspect(mode)}"]}
    end
  end

  @doc """
  Read all rows from Postgres and replace the cached map. Catches DB
  errors and falls back to the hardcoded defaults so the researcher can
  still run even when the DB is unreachable at boot.
  """
  @spec warm_cache() :: :ok
  def warm_cache do
    try do
      rows = Repo.all(from m in Schema, order_by: m.mode)

      map =
        Enum.reduce(rows, %{}, fn row, acc ->
          Map.put(acc, row.mode, %{
            max_iterations: row.max_iterations,
            budget_ms: row.budget_ms
          })
        end)

      # Fill any missing modes with defaults so the researcher never crashes
      # on a partial table.
      merged = Map.merge(@defaults, map)

      :persistent_term.put(@cache_key, merged)
      :ok
    rescue
      e ->
        Logger.warning(
          "[ModeConfig] warm_cache fell back to defaults — DB error: #{Exception.message(e)}"
        )

        :persistent_term.put(@cache_key, @defaults)
        :ok
    end
  end

  @doc "Exposed for tests and docs."
  def defaults, do: @defaults

  # --- internals ------------------------------------------------------------

  defp safe_lookup do
    try do
      :persistent_term.get(@cache_key)
    rescue
      ArgumentError -> nil
    end
  end

  defp normalize_keys(attrs) do
    Enum.reduce(attrs, %{}, fn
      {k, v}, acc when is_atom(k) -> Map.put(acc, k, v)
      {k, v}, acc when is_binary(k) -> Map.put(acc, String.to_existing_atom(k), v)
    end)
  end

  defp format_errors(%Ecto.Changeset{errors: errors}) do
    Enum.map(errors, fn {field, {msg, opts}} ->
      rendered =
        Regex.replace(~r"%{(\w+)}", msg, fn _, key ->
          opts |> Keyword.get(String.to_atom(key), "") |> to_string()
        end)

      {field, rendered}
    end)
  end
end
