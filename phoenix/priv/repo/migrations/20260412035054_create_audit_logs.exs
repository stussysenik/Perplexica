defmodule Perplexica.Repo.Migrations.CreateAuditLogs do
  use Ecto.Migration

  def change do
    create table(:audit_logs) do
      add :user_id, references(:users, type: :binary_id, on_delete: :nothing)
      add :action, :string, null: false
      add :resource_type, :string, null: false
      add :resource_id, :string
      add :ip_address, :string
      add :details, :map

      timestamps(updated_at: false)
    end

    create index(:audit_logs, [:user_id])
    create index(:audit_logs, [:action])
  end
end
