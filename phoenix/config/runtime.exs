import Config

# config/runtime.exs is executed for all environments, including
# during releases. It is executed after compilation and before the
# system starts, so it is typically used to load production configuration
# and secrets from environment variables or elsewhere. Do not define
# any compile-time configuration in here, as it won't be applied.
# The block below contains prod specific runtime configuration.

# ## Using releases
#
# If you use `mix release`, you need to explicitly enable the server
# by passing the PHX_SERVER=true when you start it:
#
#     PHX_SERVER=true bin/perplexica start
#
# Alternatively, you can use `mix phx.gen.release` to generate a `bin/server`
# script that automatically sets the env var above.
if System.get_env("PHX_SERVER") do
  config :perplexica, PerplexicaWeb.Endpoint, server: true
end

config :perplexica, PerplexicaWeb.Endpoint,
  http: [port: String.to_integer(System.get_env("PORT", "4000"))]

# ----- GitHub OAuth gate (auth-github-gate) -------------------------------
# Ueberauth GitHub strategy credentials. Read env vars once, trim whitespace
# so a stray space in .env.local doesn't become part of the value, and fail
# fast with an actionable message if either is missing — otherwise
# ueberauth_github crashes with a confusing CaseClauseError the first time a
# user hits /auth/github (its check_credential/2 has no nil -> clause).
gh_client_id = System.get_env("GITHUB_CLIENT_ID") |> Kernel.||("") |> String.trim()
gh_client_secret = System.get_env("GITHUB_CLIENT_SECRET") |> Kernel.||("") |> String.trim()

if config_env() != :test and (gh_client_id == "" or gh_client_secret == "") do
  raise """
  GitHub OAuth credentials missing — Phoenix cannot start.

  Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in the environment before
  starting Phoenix. In local dev, source the project .env.local into your
  shell BEFORE running `iex -S mix phx.server`:

      set -a
      source .env.local
      set +a
      echo $GITHUB_CLIENT_ID   # should print a non-empty value

  On Railway, set them with `railway variables --set "GITHUB_CLIENT_ID=..."`.

  Currently: GITHUB_CLIENT_ID=#{inspect(gh_client_id)}, GITHUB_CLIENT_SECRET=#{if gh_client_secret == "", do: "\"\"", else: "[present]"}
  """
end

config :ueberauth, Ueberauth.Strategy.Github.OAuth,
  client_id: gh_client_id,
  client_secret: gh_client_secret

# Allowlist of GitHub usernames that may reach /api/graphql. Comma-separated,
# matched case-insensitively.
github_allowlist =
  (System.get_env("GITHUB_ALLOWLIST") || "")
  |> String.split(",", trim: true)
  |> Enum.map(&String.trim/1)
  |> Enum.map(&String.downcase/1)

if github_allowlist == [] and config_env() != :test do
  require Logger
  Logger.warning("GITHUB_ALLOWLIST is empty — no users can sign in")
end

config :perplexica, :github_allowlist, github_allowlist

# ----- AUTH_BYPASS escape hatch (auth-github-gate delta) ------------------
# Operator-only short-circuit for the full auth + allowlist gate. Accepts
# "true" / "1" / "yes" as truthy. Loud boot warning when active so it can't
# silently persist. See openspec/changes/unblock-prod-preview/.
auth_bypass = System.get_env("AUTH_BYPASS") in ["true", "1", "yes"]

if auth_bypass and config_env() != :test do
  require Logger

  Logger.warning(
    "[Auth] AUTH_BYPASS=true — authentication is disabled, all requests " <>
      "treated as signed-in as 'preview'. DO NOT USE IN PRODUCTION FOR LONG."
  )
end

config :perplexica, :auth_bypass, auth_bypass

if config_env() == :prod do
  database_url =
    System.get_env("DATABASE_URL") ||
      raise """
      environment variable DATABASE_URL is missing.
      For example: ecto://USER:PASS@HOST/DATABASE
      """

  maybe_ipv6 = if System.get_env("ECTO_IPV6") in ~w(true 1), do: [:inet6], else: []

  config :perplexica, Perplexica.Repo,
    # ssl: true,
    url: database_url,
    pool_size: String.to_integer(System.get_env("POOL_SIZE") || "10"),
    # For machines with several cores, consider starting multiple pools of `pool_size`
    # pool_count: 4,
    socket_options: maybe_ipv6

  # The secret key base is used to sign/encrypt cookies and other secrets.
  # A default value is used in config/dev.exs and config/test.exs but you
  # want to use a different value for prod and you most likely don't want
  # to check this value into version control, so we use an environment
  # variable instead.
  secret_key_base =
    System.get_env("SECRET_KEY_BASE") ||
      raise """
      environment variable SECRET_KEY_BASE is missing.
      You can generate one by calling: mix phx.gen.secret
      """

  host = System.get_env("PHX_HOST") || "example.com"

  cors_origins =
    System.get_env("CORS_ORIGINS")
    |> case do
      nil -> ["https://#{host}", "http://localhost:8910"]
      str -> String.split(str, ",")
    end

  config :perplexica, :cors_origins, cors_origins

  config :perplexica, :dns_cluster_query, System.get_env("DNS_CLUSTER_QUERY")

  config :perplexica, PerplexicaWeb.Endpoint,
    url: [host: host, port: 443, scheme: "https"],
    http: [
      # Enable IPv6 and bind on all interfaces.
      # Set it to  {0, 0, 0, 0, 0, 0, 0, 1} for local network only access.
      # See the documentation on https://hexdocs.pm/bandit/Bandit.html#t:options/0
      # for details about using IPv6 vs IPv4 and loopback vs public addresses.
      ip: {0, 0, 0, 0, 0, 0, 0, 0}
    ],
    secret_key_base: secret_key_base

  # ## SSL Support
  #
  # To get SSL working, you will need to add the `https` key
  # to your endpoint configuration:
  #
  #     config :perplexica, PerplexicaWeb.Endpoint,
  #       https: [
  #         ...,
  #         port: 443,
  #         cipher_suite: :strong,
  #         keyfile: System.get_env("SOME_APP_SSL_KEY_PATH"),
  #         certfile: System.get_env("SOME_APP_SSL_CERT_PATH")
  #       ]
  #
  # The `cipher_suite` is set to `:strong` to support only the
  # latest and more secure SSL ciphers. This means old browsers
  # and clients may not be supported. You can set it to
  # `:compatible` for wider support.
  #
  # `:keyfile` and `:certfile` expect an absolute path to the key
  # and cert in disk or a relative path inside priv, for example
  # "priv/ssl/server.key". For all supported SSL configuration
  # options, see https://hexdocs.pm/plug/Plug.SSL.html#configure/1
  #
  # We also recommend setting `force_ssl` in your config/prod.exs,
  # ensuring no data is ever sent via http, always redirecting to https:
  #
  #     config :perplexica, PerplexicaWeb.Endpoint,
  #       force_ssl: [hsts: true]
  #
  # Check `Plug.SSL` for all available options in `force_ssl`.
end
