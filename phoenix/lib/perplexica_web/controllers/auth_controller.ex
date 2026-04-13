defmodule PerplexicaWeb.AuthController do
  @moduledoc """
  GitHub OAuth sign-in endpoints via Ueberauth.

  Actions:
  - `request/2` — delegated to Ueberauth middleware (redirect to github.com)
  - `callback/2` — handle the OAuth response, persist the session, redirect home
  - `whoami/2` — session introspection for the frontend gate
  - `sign_out/2` — idempotent session clear
  """

  use PerplexicaWeb, :controller

  plug Ueberauth when action in [:request, :callback]

  require Logger

  # Ueberauth's request phase redirects to GitHub automatically. If this clause
  # ever runs we fell through the middleware — redirect home so the user
  # doesn't see a blank page.
  def request(conn, _params) do
    redirect(conn, to: "/")
  end

  def callback(%{assigns: %{ueberauth_failure: failure}} = conn, _params) do
    Logger.warning("[Auth] GitHub callback failed: #{inspect(failure)}")

    conn
    |> configure_session(drop: true)
    |> redirect(to: "/?auth_error=1")
  end

  def callback(%{assigns: %{ueberauth_auth: auth}} = conn, _params) do
    login = auth.info.nickname || auth.info.name || ""
    username = String.downcase(login)
    allowlist = Application.get_env(:perplexica, :github_allowlist, [])

    if username in allowlist do
      conn
      |> configure_session(renew: true)
      |> put_session(:github_username, username)
      |> put_session(:github_user_id, auth.uid)
      |> put_session(:avatar_url, auth.info.image)
      |> redirect(to: "/")
    else
      Logger.warning("[Auth] Sign-in denied for #{username} — not in allowlist")

      conn
      |> configure_session(drop: true)
      |> redirect(to: "/?auth_error=forbidden")
    end
  end

  def whoami(conn, _params) do
    username = get_session(conn, :github_username)
    allowlist = Application.get_env(:perplexica, :github_allowlist, [])

    cond do
      is_nil(username) ->
        json(conn, %{signed_in: false})

      String.downcase(username) in allowlist ->
        json(conn, %{
          signed_in: true,
          username: username,
          avatar_url: get_session(conn, :avatar_url)
        })

      true ->
        # Username was valid at sign-in but has since been removed from the
        # allowlist. Clear the session so the next call is a clean 401.
        conn
        |> configure_session(drop: true)
        |> json(%{signed_in: false})
    end
  end

  def sign_out(conn, _params) do
    conn
    |> configure_session(drop: true)
    |> send_resp(204, "")
  end
end
