defmodule PerplexicaWeb.PageController do
  use PerplexicaWeb, :controller

  def index(conn, _params) do
    # Serve index.html from priv/static
    conn
    |> put_resp_header("content-type", "text/html; charset=utf-8")
    |> send_file(200, Path.join(:code.priv_dir(:perplexica), "static/index.html"))
  end
end
