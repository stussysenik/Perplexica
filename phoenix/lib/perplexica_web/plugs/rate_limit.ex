defmodule PerplexicaWeb.Plugs.RateLimit do
  @moduledoc """
  SOC2 Compliance: API Rate Limiting to prevent abuse.
  Allows 100 requests per minute per IP address.
  """
  import Plug.Conn
  require Logger

  def init(opts), do: opts

  def call(conn, _opts) do
    ip =
      conn.remote_ip
      |> :inet.ntoa()
      |> to_string()

    # 100 requests per 60 seconds
    case Perplexica.SearchSources.RateLimiter.hit("api_rate_limit:#{ip}", 60_000, 100) do
      {:allow, _count} ->
        conn

      {:deny, _limit} ->
        Logger.warning("[SOC2 Audit] Rate limit exceeded for IP: #{ip}")

        conn
        |> put_status(:too_many_requests)
        |> put_resp_content_type("application/json")
        |> send_resp(429, Jason.encode!(%{error: "Too many requests. Please try again later."}))
        |> halt()
    end
  end
end