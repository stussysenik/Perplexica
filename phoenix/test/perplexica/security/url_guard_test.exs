defmodule Perplexica.Security.UrlGuardTest do
  @moduledoc """
  SSRF guard unit tests. No network: hostname resolution is stubbed via the
  `:resolver` option, and IP-literal URLs are checked directly. Covers the three
  REQ-SEC-003 scenarios — disallowed schemes, private/metadata destinations
  blocked after resolution, and public URLs still allowed.
  """
  use ExUnit.Case, async: true

  alias Perplexica.Security.UrlGuard

  # A resolver that always returns the given public address.
  defp public_resolver(ip \\ {93, 184, 216, 34}), do: fn _host -> {:ok, [ip]} end
  defp resolver_for(ips), do: fn _host -> {:ok, ips} end

  describe "scheme validation" do
    test "rejects non-HTTP(S) schemes" do
      for url <- ["file:///etc/passwd", "gopher://x/1", "ftp://host/x", "data:text/html,x"] do
        assert {:error, :scheme_not_allowed} = UrlGuard.validate(url, resolver: public_resolver())
      end
    end

    test "rejects a string with no scheme" do
      assert {:error, :invalid_url} = UrlGuard.validate("not-a-url", resolver: public_resolver())
    end

    test "rejects a URL with no host" do
      assert {:error, :no_host} = UrlGuard.validate("http://", resolver: public_resolver())
    end
  end

  describe "private / metadata destinations (IP literals, no DNS)" do
    test "blocks loopback, RFC-1918, link-local, and the cloud metadata IP" do
      blocked = [
        "http://127.0.0.1/",
        "http://10.0.0.5/",
        "http://172.16.4.4/",
        "http://192.168.1.1/",
        "http://169.254.169.254/latest/meta-data/",
        "http://0.0.0.0/",
        "http://100.64.0.1/"
      ]

      for url <- blocked do
        assert {:error, :blocked_destination} = UrlGuard.validate(url), "expected block: #{url}"
      end
    end

    test "blocks IPv6 loopback, ULA, link-local, and IPv4-mapped metadata" do
      blocked = [
        "http://[::1]/",
        "http://[fc00::1]/",
        "http://[fe80::1]/",
        "http://[::ffff:169.254.169.254]/"
      ]

      for url <- blocked do
        assert {:error, :blocked_destination} = UrlGuard.validate(url), "expected block: #{url}"
      end
    end
  end

  describe "DNS-rebinding-by-name (resolve-then-classify)" do
    test "blocks a public-looking hostname that resolves to a private address" do
      resolver = resolver_for([{169, 254, 169, 254}])

      assert {:error, :blocked_destination} =
               UrlGuard.validate("http://evil.example.com/", resolver: resolver)
    end

    test "blocks when ANY resolved address is private (mixed result set)" do
      resolver = resolver_for([{93, 184, 216, 34}, {10, 1, 2, 3}])

      assert {:error, :blocked_destination} =
               UrlGuard.validate("http://mixed.example.com/", resolver: resolver)
    end

    test "errors when the host does not resolve" do
      resolver = fn _ -> {:error, :nxdomain} end

      assert {:error, :unresolved} =
               UrlGuard.validate("http://nope.example.com/", resolver: resolver)
    end
  end

  describe "public URLs still work" do
    test "allows a normal public hostname" do
      assert :ok =
               UrlGuard.validate("https://en.wikipedia.org/wiki/SSRF",
                 resolver: public_resolver()
               )
    end

    test "allows a public IP literal" do
      assert :ok = UrlGuard.validate("http://93.184.216.34/")
    end
  end

  describe "blocked?/1 classification" do
    test "public addresses are not blocked" do
      refute UrlGuard.blocked?({8, 8, 8, 8})
      refute UrlGuard.blocked?({93, 184, 216, 34})
      refute UrlGuard.blocked?({0x2606, 0x2800, 0x220, 0x1, 0x248, 0x1893, 0x25C8, 0x1946})
    end

    test "non-public ranges are blocked" do
      assert UrlGuard.blocked?({127, 0, 0, 1})
      assert UrlGuard.blocked?({169, 254, 169, 254})
      assert UrlGuard.blocked?({172, 31, 255, 255})
      assert UrlGuard.blocked?({224, 0, 0, 1})
      assert UrlGuard.blocked?({0, 0, 0, 0, 0, 0, 0, 1})
    end
  end
end
