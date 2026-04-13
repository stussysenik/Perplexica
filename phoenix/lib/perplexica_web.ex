defmodule PerplexicaWeb do
  @moduledoc """
  The entrypoint for defining your web interface, such
  as controllers, components, channels, and so on.

  This can be used in your application as:

      use PerplexicaWeb, :controller
      use PerplexicaWeb, :html

  The definitions below will be executed for every controller,
  component, etc, so keep them short and clean, focused
  on imports, uses and aliases.

  Do NOT define functions inside the quoted expressions
  below. Instead, define additional modules and import
  those modules here.
  """

  # "index.html" is intentionally NOT in this list. In dev the SPA shell
  # lives on the Redwood dev server (`:8910`) and Phoenix redirects there via
  # `PageController.index`. In prod the Redwood build writes its `index.html`
  # into `priv/static/` and `PageController.index` serves it with
  # `send_file/3` — Plug.Static does not need to handle it either way.
  #
  # PWA artifacts (`sw.js`, `manifest.json`, `icon-*.png`) were removed by
  # the `kill-stale-pwa-service-worker` change — the retired smoke-test UI
  # registered a buggy service worker that survived in every browser that
  # had ever loaded it. The kill-switch replacement lives at
  # `redwood/web/public/sw.js`, and Phoenix no longer serves any PWA
  # surface. See openspec/changes/kill-stale-pwa-service-worker/ for the
  # full history so nobody reintroduces these paths without a PWA spec.
  def static_paths, do: ~w(assets fonts images favicon.ico robots.txt)

  def router do
    quote do
      use Phoenix.Router, helpers: false

      # Import common connection and controller functions to use in pipelines
      import Plug.Conn
      import Phoenix.Controller
    end
  end

  def channel do
    quote do
      use Phoenix.Channel
    end
  end

  def controller do
    quote do
      use Phoenix.Controller, formats: [:html, :json]

      import Plug.Conn

      unquote(verified_routes())
    end
  end

  def verified_routes do
    quote do
      use Phoenix.VerifiedRoutes,
        endpoint: PerplexicaWeb.Endpoint,
        router: PerplexicaWeb.Router,
        statics: PerplexicaWeb.static_paths()
    end
  end

  @doc """
  When used, dispatch to the appropriate controller/live_view/etc.
  """
  defmacro __using__(which) when is_atom(which) do
    apply(__MODULE__, which, [])
  end
end
