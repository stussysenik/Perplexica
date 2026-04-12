defmodule PerplexicaWeb.Router do
  use PerplexicaWeb, :router

  pipeline :api do
    plug :accepts, ["json"]

    plug PerplexicaWeb.Plugs.RateLimit

    plug :put_secure_browser_headers, %{
      "strict-transport-security" => "max-age=31536000; includeSubDomains",
      "x-content-type-options" => "nosniff",
      "x-frame-options" => "DENY",
      "x-xss-protection" => "1; mode=block"
    }

    cors_origins =
      Application.compile_env(:perplexica, :cors_origins, [
        ~r/^https?:\/\/localhost(:\d+)?$/,
        ~r/^https?:\/\/127\.0\.0\.1(:\d+)?$/,
        "https://perplexica-search.fly.dev"
      ])

    plug CORSPlug, origin: cors_origins
  end

  # GraphQL API
  scope "/api" do
    pipe_through :api

    forward "/graphql", Absinthe.Plug, schema: PerplexicaWeb.Schema

    if Mix.env() == :dev do
      forward "/graphiql", Absinthe.Plug.GraphiQL,
        schema: PerplexicaWeb.Schema,
        interface: :playground
    end
  end

  # Health check for Railway monitoring
  scope "/", PerplexicaWeb do
    pipe_through :api

    get "/health", HealthController, :index
  end
end
