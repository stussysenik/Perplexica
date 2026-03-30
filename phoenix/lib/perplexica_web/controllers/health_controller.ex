defmodule PerplexicaWeb.HealthController do
  use PerplexicaWeb, :controller

  def index(conn, _params) do
    db_status =
      try do
        Ecto.Adapters.SQL.query!(Perplexica.Repo, "SELECT 1")
        "connected"
      rescue
        _ -> "disconnected"
      end

    status_code = if db_status == "connected", do: 200, else: 503

    conn
    |> put_status(status_code)
    |> json(%{
      status: if(status_code == 200, do: "ok", else: "degraded"),
      db: db_status,
      version: "0.1.0"
    })
  end
end
