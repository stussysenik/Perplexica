defmodule Perplexica.Repo.Migrations.CreateSearchModeConfigs do
  use Ecto.Migration

  @seeds [
    %{mode: "speed", max_iterations: 2, budget_ms: 7_000},
    %{mode: "balanced", max_iterations: 6, budget_ms: 16_000},
    %{mode: "quality", max_iterations: 25, budget_ms: 35_000}
  ]

  def up do
    create table(:search_mode_configs) do
      add :mode, :string, null: false
      add :max_iterations, :integer, null: false
      add :budget_ms, :integer, null: false

      timestamps()
    end

    create unique_index(:search_mode_configs, [:mode])

    flush()

    now = DateTime.utc_now() |> DateTime.truncate(:second)
    rows = Enum.map(@seeds, &Map.merge(&1, %{inserted_at: now, updated_at: now}))
    execute(fn -> repo().insert_all("search_mode_configs", rows) end)
  end

  def down do
    drop table(:search_mode_configs)
  end
end
