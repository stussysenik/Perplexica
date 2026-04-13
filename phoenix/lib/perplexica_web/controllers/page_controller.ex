defmodule PerplexicaWeb.PageController do
  use PerplexicaWeb, :controller

  # Catch-all entrypoint for the SPA shell. Two modes:
  #
  # * Dev — `:frontend_url` is set (see `config/dev.exs`). Any HTML request
  #   to Phoenix, including the OAuth callback that does `redirect(to: "/")`,
  #   gets bounced to the Redwood dev server preserving path + query so the
  #   user lands on the real UI with the error query intact.
  #
  # * Prod — `:frontend_url` is unset. Phoenix serves the compiled Redwood
  #   build from `priv/static/index.html` same-origin.
  #
  # Keeping the environment branch in one place means `AuthController` can
  # keep its plain `redirect(to: "/")` calls without knowing which env it
  # runs in.
  def index(conn, _params) do
    case Application.get_env(:perplexica, :frontend_url) do
      nil ->
        conn
        |> put_resp_header("content-type", "text/html; charset=utf-8")
        |> send_file(200, Path.join(:code.priv_dir(:perplexica), "static/index.html"))

      frontend_url when is_binary(frontend_url) ->
        path = "/" <> Enum.join(conn.path_info, "/")

        query =
          case conn.query_string do
            "" -> ""
            q -> "?" <> q
          end

        conn
        |> put_resp_header("cache-control", "no-store")
        |> redirect(external: frontend_url <> path <> query)
    end
  end
end
