defmodule PerplexicaWeb.Plugs.RequireOwner do
  @moduledoc """
  Authorization gate for the GraphQL pipeline.

  Reads `:github_username` from the session and compares it (case-insensitively)
  against the allowlist configured at `:perplexica, :github_allowlist`.

  - No session cookie → HTTP 401 `{"error":"unauthenticated"}`
  - Session present but username not in allowlist (or allowlist empty) → HTTP 403
  - Allowlisted → assigns `:github_username` and continues

  CORS preflight is intentionally handled upstream by the CORS plug; this plug
  only ever sees fully-formed POST/GET requests.
  """

  import Plug.Conn

  def init(opts), do: opts

  def call(conn, _opts) do
    username = get_session(conn, :github_username)
    allowlist = Application.get_env(:perplexica, :github_allowlist, [])

    cond do
      is_nil(username) ->
        deny(conn, 401, "unauthenticated")

      allowlist == [] ->
        deny(conn, 403, "forbidden")

      String.downcase(username) in allowlist ->
        assign(conn, :github_username, String.downcase(username))

      true ->
        deny(conn, 403, "forbidden")
    end
  end

  defp deny(conn, status, message) do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(status, Jason.encode!(%{error: message}))
    |> halt()
  end
end
