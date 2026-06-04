import Config

# Force using SSL in production. This also sets the "strict-security-transport" header,
# known as HSTS. If you have a health check endpoint, you may want to exclude it below.
# Note `:force_ssl` is required to be set at compile-time.
config :perplexica, PerplexicaWeb.Endpoint,
  force_ssl: [
    rewrite_on: [:x_forwarded_proto],
    exclude: [
      # `/health` is hit by the container healthcheck over plain HTTP.
      #
      # `/socket/websocket` must be excluded too: Coolify's Traefik proxy does
      # NOT forward `X-Forwarded-Proto: https` on WebSocket *upgrade* requests
      # (it does for normal requests), so without this exclusion force_ssl
      # 301-redirects every WS handshake to https — which a browser cannot
      # follow mid-upgrade, killing Absinthe subscriptions and forcing the
      # client into its polling fallback. TLS is already terminated at the
      # edge and the Traefik→Phoenix hop is a private network, so skipping the
      # redundant redirect here is safe.
      paths: ["/health", "/socket/websocket"],
      hosts: ["localhost", "127.0.0.1"]
    ]
  ]

# Do not print debug messages in production
config :logger, level: :info

# Runtime production configuration, including reading
# of environment variables, is done on config/runtime.exs.
