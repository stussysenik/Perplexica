defmodule Perplexica.Security.UrlGuard do
  @moduledoc """
  SSRF guard for server-side URL fetching.

  Any feature that fetches a model- or user-supplied URL from the server
  (notably `scrape_url`) MUST pass the target through `validate/2` first. The
  check is **resolve-then-classify**: we validate the scheme, resolve the host
  to its IP addresses, and reject the request if *any* resolved address lands in
  a private, loopback, link-local, unique-local, or cloud-metadata range. DNS is
  resolved here — not trusted by name — so a hostname that resolves to
  `169.254.169.254` (the cloud metadata endpoint) is blocked even though the
  string looks public. This defeats DNS-rebinding-by-name.

  Redirects are the classic bypass: a public URL can `302` to an internal
  address. Callers MUST therefore validate **every hop**, not just the first —
  see `Perplexica.SearchSources.Brave.scrape_url/2`, which disables automatic
  redirect following and re-validates each `Location`.

  The host resolver is injectable (`:resolver` option) so the classification
  logic is unit-testable offline.
  """

  @allowed_schemes ~w(http https)

  @typedoc "An IPv4 or IPv6 address tuple as returned by `:inet`."
  @type ip :: :inet.ip_address()

  @doc """
  Validate a URL for safe server-side fetching.

  Returns `:ok` if the URL uses an allowed scheme and every address its host
  resolves to is publicly routable. Returns `{:error, reason}` otherwise, where
  `reason` is one of `:invalid_url`, `:scheme_not_allowed`, `:no_host`,
  `:unresolved`, or `:blocked_destination`.

  ## Options
    * `:resolver` — `fun(host_string) :: {:ok, [ip]} | {:error, term}` used to
      resolve a hostname to addresses. Defaults to a real DNS lookup. IP-literal
      hosts skip the resolver entirely.
  """
  @spec validate(String.t(), keyword()) :: :ok | {:error, atom()}
  def validate(url, opts \\ []) when is_binary(url) do
    resolver = Keyword.get(opts, :resolver, &default_resolve/1)

    with {:ok, uri} <- parse(url),
         :ok <- check_scheme(uri),
         {:ok, host} <- host(uri),
         {:ok, ips} <- resolve(host, resolver),
         :ok <- check_ips(ips) do
      :ok
    end
  end

  defp parse(url) do
    case URI.parse(url) do
      %URI{scheme: nil} -> {:error, :invalid_url}
      %URI{} = uri -> {:ok, uri}
    end
  end

  defp check_scheme(%URI{scheme: scheme}) do
    if scheme in @allowed_schemes, do: :ok, else: {:error, :scheme_not_allowed}
  end

  defp host(%URI{host: host}) when is_binary(host) and host != "", do: {:ok, host}
  defp host(_), do: {:error, :no_host}

  # IP-literal hosts (incl. bracketed IPv6) are checked directly — no DNS.
  defp resolve(host, resolver) do
    case :inet.parse_address(to_charlist(strip_brackets(host))) do
      {:ok, ip} ->
        {:ok, [ip]}

      {:error, :einval} ->
        # Normalize any resolver failure to a single :unresolved reason.
        case resolver.(host) do
          {:ok, [_ | _] = ips} -> {:ok, ips}
          _ -> {:error, :unresolved}
        end
    end
  end

  defp strip_brackets("[" <> rest) do
    case String.split_at(rest, -1) do
      {inner, "]"} -> inner
      _ -> rest
    end
  end

  defp strip_brackets(host), do: host

  defp check_ips([]), do: {:error, :unresolved}

  defp check_ips(ips) do
    if Enum.any?(ips, &blocked?/1), do: {:error, :blocked_destination}, else: :ok
  end

  @doc """
  Classify an IP address tuple as non-public (`true`) or publicly routable
  (`false`). Exposed for testing; covers RFC-1918, loopback, link-local
  (incl. `169.254.169.254`), CGNAT, multicast, broadcast, and the IPv6
  equivalents (`::1`, `fe80::/10`, `fc00::/7`, multicast, and IPv4-mapped).
  """
  @spec blocked?(ip()) :: boolean()
  # --- IPv4 ---
  def blocked?({0, _, _, _}), do: true
  def blocked?({10, _, _, _}), do: true
  def blocked?({127, _, _, _}), do: true
  def blocked?({169, 254, _, _}), do: true
  def blocked?({172, b, _, _}) when b in 16..31, do: true
  def blocked?({192, 168, _, _}), do: true
  def blocked?({192, 0, 0, _}), do: true
  def blocked?({192, 0, 2, _}), do: true
  def blocked?({100, b, _, _}) when b in 64..127, do: true
  def blocked?({a, _, _, _}) when a in 224..255, do: true

  # --- IPv6 ---
  def blocked?({0, 0, 0, 0, 0, 0, 0, 0}), do: true
  def blocked?({0, 0, 0, 0, 0, 0, 0, 1}), do: true
  # IPv4-mapped (::ffff:a.b.c.d) — unwrap and re-check the embedded IPv4.
  def blocked?({0, 0, 0, 0, 0, 0xFFFF, g, h}) do
    blocked?({div(g, 256), rem(g, 256), div(h, 256), rem(h, 256)})
  end

  def blocked?({a, _, _, _, _, _, _, _}) when a >= 0xFF00, do: true
  def blocked?({a, _, _, _, _, _, _, _}) when a in 0xFE80..0xFEBF, do: true
  def blocked?({a, _, _, _, _, _, _, _}) when a in 0xFC00..0xFDFF, do: true

  # Anything not matched above is treated as publicly routable.
  def blocked?(_), do: false

  defp default_resolve(host) do
    charlist = to_charlist(host)

    v4 = safe_getaddrs(charlist, :inet)
    v6 = safe_getaddrs(charlist, :inet6)

    case v4 ++ v6 do
      [] -> {:error, :unresolved}
      ips -> {:ok, ips}
    end
  end

  defp safe_getaddrs(charlist, family) do
    case :inet.getaddrs(charlist, family) do
      {:ok, ips} -> ips
      {:error, _} -> []
    end
  end
end
