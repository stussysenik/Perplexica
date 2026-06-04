# Verifies the force_ssl behavior using the REAL prod.exs config, so this
# proves the deployed behavior — not a hand-copied option list.
#
#   MIX_ENV=prod mix run priv/verify_force_ssl.exs
#
# Expectation after the fix:
#   - /socket/websocket  WITHOUT x-forwarded-proto  -> NOT redirected (WS can upgrade)
#   - /                  WITHOUT x-forwarded-proto  -> 301 (force_ssl still guards normal paths)
#   - /socket/websocket  WITH x-forwarded-proto=https -> NOT redirected
#   - /health            WITHOUT x-forwarded-proto  -> NOT redirected (pre-existing exclusion)

import Plug.Conn

# Pull the force_ssl options straight out of config/prod.exs.
prod = Config.Reader.read!("config/prod.exs", env: :prod)
force_ssl = prod[:perplexica][PerplexicaWeb.Endpoint][:force_ssl]
IO.puts("force_ssl from prod.exs: #{inspect(force_ssl)}\n")

ssl_state = Plug.SSL.init(force_ssl)

# Build a synthetic request as Traefik would forward it to Phoenix: plain http
# to the real host, optionally carrying x-forwarded-proto.
build = fn path, xfp ->
  conn = Plug.Test.conn(:get, "http://perplexica.stussysenik.com" <> path)
  if xfp, do: put_req_header(conn, "x-forwarded-proto", xfp), else: conn
end

run = fn path, xfp ->
  Plug.SSL.call(build.(path, xfp), ssl_state)
end

# A request is "redirected" if Plug.SSL halted it with a 301.
redirected? = fn conn -> conn.halted and conn.status == 301 end

cases = [
  {"/socket/websocket", nil, false, "WS upgrade (no XFP) must pass through"},
  {"/", nil, true, "normal path (no XFP) must still be forced to https"},
  {"/socket/websocket", "https", false, "WS upgrade (XFP=https) must pass through"},
  {"/socket/websocket", "http", false, "WS upgrade (XFP=http) must pass through (excluded by path)"},
  {"/health", nil, false, "health check (no XFP) must pass through"},
  {"/api/graphql", nil, true, "graphql (no XFP) must still be forced to https"}
]

results =
  Enum.map(cases, fn {path, xfp, expect_redirect, desc} ->
    got = redirected?.(run.(path, xfp))
    pass = got == expect_redirect
    label = if pass, do: "PASS", else: "FAIL"
    xfp_s = xfp || "(none)"
    IO.puts("#{label}  #{path}  XFP=#{xfp_s}  redirect=#{got} expected=#{expect_redirect}  — #{desc}")
    pass
  end)

if Enum.all?(results) do
  IO.puts("\nALL #{length(results)} CASES PASS ✓")
else
  IO.puts("\n#{Enum.count(results, &(&1 == false))} CASE(S) FAILED ✗")
  System.halt(1)
end
