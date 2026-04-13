defmodule PerplexicaWeb.Router do
  use PerplexicaWeb, :router

  # Public pipeline — CORS, session read, no ownership check.
  # Used by /health, /auth/whoami, /auth/session DELETE (all idempotent) and
  # the SPA catch-all so the splash HTML can render before sign-in.
  pipeline :api_public do
    plug :cors
    plug :accepts, ["json"]
    plug :fetch_session

    plug :put_secure_browser_headers, %{
      "strict-transport-security" => "max-age=31536000; includeSubDomains",
      "x-content-type-options" => "nosniff",
      "x-frame-options" => "DENY",
      "x-xss-protection" => "1; mode=block"
    }
  end

  # Gated pipeline — requires an allowlisted GitHub session. Used by /api/graphql.
  pipeline :api do
    plug :cors
    plug :accepts, ["json"]
    plug :fetch_session
    plug PerplexicaWeb.Plugs.RequireOwner
    plug PerplexicaWeb.Plugs.RateLimit

    plug :put_secure_browser_headers, %{
      "strict-transport-security" => "max-age=31536000; includeSubDomains",
      "x-content-type-options" => "nosniff",
      "x-frame-options" => "DENY",
      "x-xss-protection" => "1; mode=block"
    }
  end

  # Browser pipeline for the /auth/* scope. CSRF intentionally skipped on the
  # GitHub callback — the state parameter is Ueberauth's responsibility and
  # the callback arrives via a top-level redirect from github.com which would
  # otherwise trigger `protect_from_forgery`.
  pipeline :browser_auth do
    plug :cors
    plug :accepts, ["html", "json"]
    plug :fetch_session
    plug :put_secure_browser_headers
  end

  # GraphQL API — gated by RequireOwner
  scope "/api" do
    pipe_through :api

    # Explicit OPTIONS handler — CORSPlug (above in pipeline) sets the
    # Access-Control-* headers; this action just closes the preflight with 204.
    # Required because Absinthe.Plug (via forward) processes OPTIONS internally
    # and can respond before the browser sees CORSPlug's headers.
    options "/graphql", PerplexicaWeb.CorsController, :preflight

    forward "/graphql", Absinthe.Plug, schema: PerplexicaWeb.Schema

    if Mix.env() == :dev do
      forward "/graphiql", Absinthe.Plug.GraphiQL,
        schema: PerplexicaWeb.Schema,
        interface: :playground
    end
  end

  # Auth scope — GitHub OAuth flow + session introspection + sign-out.
  scope "/auth", PerplexicaWeb do
    pipe_through :browser_auth

    get "/github", AuthController, :request
    get "/github/callback", AuthController, :callback
    get "/whoami", AuthController, :whoami
    delete "/session", AuthController, :sign_out
  end

  # Health check — stays public so Fly.io probes don't get 401
  scope "/", PerplexicaWeb do
    pipe_through :api_public

    get "/health", HealthController, :index
  end

  # Catch-all route for the Redwood SPA — static shell stays public
  scope "/", PerplexicaWeb do
    pipe_through :api_public

    get "/*path", PageController, :index
  end

  # Read allowed origins at runtime so a config change doesn't require a full
  # recompile. Falls back to permissive localhost regexes for local dev.
  defp cors(conn, _opts) do
    origins =
      Application.get_env(:perplexica, :cors_origins, [
        ~r/^https?:\/\/localhost(:\d+)?$/,
        ~r/^https?:\/\/127\.0\.0\.1(:\d+)?$/,
        "https://perplexica-search.fly.dev"
      ])

    CORSPlug.call(conn, CORSPlug.init(origin: origins))
  end
end
