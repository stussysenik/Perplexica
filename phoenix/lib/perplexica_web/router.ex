defmodule PerplexicaWeb.Router do
  use PerplexicaWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
    plug CORSPlug, origin: ["*"]
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
