defmodule Perplexica.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      PerplexicaWeb.Telemetry,
      Perplexica.Repo,
      {DNSCluster, query: Application.get_env(:perplexica, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: Perplexica.PubSub},
      # Rate limiter for external API calls (Brave Search)
      {Perplexica.SearchSources.RateLimiter, clean_period: :timer.minutes(10)},
      # AI model provider registry with failover
      Perplexica.Models.Registry,
      # Search session supervisor (DynamicSupervisor)
      Perplexica.Search.Supervisor,
      # Library trash purger — daily tick that hard-deletes chats that
      # have been in Trash for more than 30 days. Must start after the
      # Repo so the first tick can run queries immediately.
      Perplexica.Library.Purger,
      # Start to serve requests, typically the last entry
      PerplexicaWeb.Endpoint,
      # Absinthe subscription supervisor — must start AFTER the endpoint so
      # the pubsub backend is alive. Without this, the Absinthe channel
      # raises `Pubsub not configured!` on every `doc` push.
      {Absinthe.Subscription, PerplexicaWeb.Endpoint}
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: Perplexica.Supervisor]

    case Supervisor.start_link(children, opts) do
      {:ok, _pid} = result ->
        # Warm the search-mode-config cache after the Repo is alive. Any
        # DB error inside warm_cache/0 falls back to hardcoded defaults.
        Perplexica.Search.ModeConfig.warm_cache()
        result

      other ->
        other
    end
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    PerplexicaWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
