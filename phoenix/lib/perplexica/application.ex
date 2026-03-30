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
      # Start to serve requests, typically the last entry
      PerplexicaWeb.Endpoint
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: Perplexica.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    PerplexicaWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
