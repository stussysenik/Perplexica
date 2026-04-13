defmodule PerplexicaWeb.AuthControllerTest do
  use PerplexicaWeb.ConnCase, async: false

  setup do
    original_allowlist = Application.get_env(:perplexica, :github_allowlist, [])
    original_bypass = Application.get_env(:perplexica, :auth_bypass, false)
    Application.put_env(:perplexica, :github_allowlist, ["senik"])

    on_exit(fn ->
      Application.put_env(:perplexica, :github_allowlist, original_allowlist)
      Application.put_env(:perplexica, :auth_bypass, original_bypass)
    end)

    :ok
  end

  defp with_session(conn, session \\ %{}) do
    Plug.Test.init_test_session(conn, session)
  end

  describe "GET /auth/whoami" do
    test "returns signed_in: false with no session", %{conn: conn} do
      conn =
        conn
        |> with_session()
        |> get("/auth/whoami")

      assert json_response(conn, 200) == %{"signed_in" => false}
    end

    test "returns user info when signed in", %{conn: conn} do
      conn =
        conn
        |> with_session(%{
          github_username: "senik",
          avatar_url: "https://example.com/a.png"
        })
        |> get("/auth/whoami")

      assert json_response(conn, 200) == %{
               "signed_in" => true,
               "username" => "senik",
               "avatar_url" => "https://example.com/a.png"
             }
    end

    test "reports signed_in: false and clears session when username no longer allowlisted",
         %{conn: conn} do
      Application.put_env(:perplexica, :github_allowlist, [])

      conn =
        conn
        |> with_session(%{github_username: "senik"})
        |> get("/auth/whoami")

      assert json_response(conn, 200) == %{"signed_in" => false}
    end

    test "auth_bypass true: reports preview identity with no session", %{conn: conn} do
      Application.put_env(:perplexica, :auth_bypass, true)

      conn =
        conn
        |> with_session()
        |> get("/auth/whoami")

      assert json_response(conn, 200) == %{
               "signed_in" => true,
               "username" => "preview",
               "avatar_url" => nil,
               "auth_bypass" => true
             }
    end

    test "auth_bypass true: ignores real allowlisted session and reports preview",
         %{conn: conn} do
      Application.put_env(:perplexica, :auth_bypass, true)

      conn =
        conn
        |> with_session(%{
          github_username: "senik",
          avatar_url: "https://example.com/a.png"
        })
        |> get("/auth/whoami")

      assert json_response(conn, 200) == %{
               "signed_in" => true,
               "username" => "preview",
               "avatar_url" => nil,
               "auth_bypass" => true
             }
    end
  end

  describe "DELETE /auth/session" do
    test "returns 204 when signed out", %{conn: conn} do
      conn =
        conn
        |> with_session()
        |> delete("/auth/session")

      assert response(conn, 204) == ""
    end

    test "clears existing session and returns 204", %{conn: conn} do
      conn =
        conn
        |> with_session(%{github_username: "senik"})
        |> delete("/auth/session")

      assert response(conn, 204) == ""
    end
  end
end
