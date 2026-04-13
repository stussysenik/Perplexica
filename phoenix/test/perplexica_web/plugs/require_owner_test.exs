defmodule PerplexicaWeb.Plugs.RequireOwnerTest do
  use PerplexicaWeb.ConnCase, async: false

  alias PerplexicaWeb.Plugs.RequireOwner

  setup do
    # Snapshot the current allowlist so tests don't leak config
    original = Application.get_env(:perplexica, :github_allowlist, [])
    on_exit(fn -> Application.put_env(:perplexica, :github_allowlist, original) end)
    :ok
  end

  defp build_session_conn(method \\ :post, path \\ "/api/graphql") do
    opts =
      Plug.Session.init(
        store: :cookie,
        key: "_test_key",
        signing_salt: "test_salt",
        encryption_salt: "test_enc"
      )

    Phoenix.ConnTest.build_conn(method, path, "")
    |> Map.put(:secret_key_base, String.duplicate("a", 64))
    |> Plug.Session.call(opts)
    |> Plug.Conn.fetch_session()
  end

  test "rejects requests with no session as 401" do
    Application.put_env(:perplexica, :github_allowlist, ["senik"])

    conn =
      build_session_conn()
      |> RequireOwner.call([])

    assert conn.status == 401
    assert conn.halted
    assert Jason.decode!(conn.resp_body) == %{"error" => "unauthenticated"}
  end

  test "rejects non-allowlisted session as 403" do
    Application.put_env(:perplexica, :github_allowlist, ["senik"])

    conn =
      build_session_conn()
      |> Plug.Conn.put_session(:github_username, "someone_else")
      |> RequireOwner.call([])

    assert conn.status == 403
    assert conn.halted
    assert Jason.decode!(conn.resp_body) == %{"error" => "forbidden"}
  end

  test "passes allowlisted session through" do
    Application.put_env(:perplexica, :github_allowlist, ["senik"])

    conn =
      build_session_conn()
      |> Plug.Conn.put_session(:github_username, "senik")
      |> RequireOwner.call([])

    refute conn.halted
    assert conn.assigns[:github_username] == "senik"
  end

  test "matches username case-insensitively" do
    Application.put_env(:perplexica, :github_allowlist, ["senik"])

    conn =
      build_session_conn()
      |> Plug.Conn.put_session(:github_username, "Senik")
      |> RequireOwner.call([])

    refute conn.halted
    assert conn.assigns[:github_username] == "senik"
  end

  test "empty allowlist locks everyone out as 403" do
    Application.put_env(:perplexica, :github_allowlist, [])

    conn =
      build_session_conn()
      |> Plug.Conn.put_session(:github_username, "senik")
      |> RequireOwner.call([])

    assert conn.status == 403
    assert conn.halted
  end
end
