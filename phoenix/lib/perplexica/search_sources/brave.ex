defmodule Perplexica.SearchSources.Brave do
  @moduledoc """
  Brave Search API client with Hammer rate limiting.

  Replaces the Node.js `searxng-proxy.mjs` from the original project.
  Supports web search and news search endpoints.

  ## Rate Limiting

  Brave free tier: 1 request per second, 2000 queries/month.
  Uses Hammer sliding window to enforce 1 req/1.1s.

  ## Response Format

  Results are normalized to a common `Chunk` format:

      %{
        url: "https://...",
        title: "Page Title",
        content: "Snippet text...",
        thumbnail: "https://...",
        engine: "brave_api" | "brave_api_news",
        category: "general" | "news"
      }
  """

  require Logger

  @web_search_url "https://api.search.brave.com/res/v1/web/search"
  @news_search_url "https://api.search.brave.com/res/v1/news/search"
  @rate_limit_key "brave_search"
  @rate_limit_scale 1_100
  @rate_limit_count 1

  @doc """
  Search the web via Brave Search API.
  Returns `{:ok, [result]}` or `{:error, reason}`.
  """
  def search_web(query, opts \\ []) do
    count = Keyword.get(opts, :count, 10)
    api_key = Keyword.get(opts, :api_key) || brave_api_key()

    with :ok <- rate_limit() do
      headers = [
        {"Accept", "application/json"},
        {"X-Subscription-Token", api_key}
      ]

      params = URI.encode_query(%{"q" => query, "count" => count})
      url = "#{@web_search_url}?#{params}"

      case HTTPoison.get(url, headers, recv_timeout: 10_000) do
        {:ok, %{status_code: 200, body: body}} ->
          parsed = Jason.decode!(body)
          web_results = parse_web_results(parsed)
          news_results = parse_news_from_web(parsed)
          {:ok, web_results ++ news_results}

        {:ok, %{status_code: status, body: body}} ->
          Logger.warning("[BraveSearch] Web search failed: #{status} #{String.slice(body, 0, 200)}")
          {:error, %{status: status, body: body}}

        {:error, %HTTPoison.Error{reason: reason}} ->
          Logger.warning("[BraveSearch] Web search error: #{inspect(reason)}")
          {:error, %{reason: reason}}
      end
    end
  end

  @doc """
  Search news via Brave News Search API.
  Returns `{:ok, [result]}` or `{:error, reason}`.
  """
  def search_news(query, opts \\ []) do
    count = Keyword.get(opts, :count, 20)
    api_key = Keyword.get(opts, :api_key) || brave_api_key()

    with :ok <- rate_limit() do
      headers = [
        {"Accept", "application/json"},
        {"X-Subscription-Token", api_key}
      ]

      params = URI.encode_query(%{"q" => query, "count" => count})
      url = "#{@news_search_url}?#{params}"

      case HTTPoison.get(url, headers, recv_timeout: 10_000) do
        {:ok, %{status_code: 200, body: body}} ->
          parsed = Jason.decode!(body)
          {:ok, parse_news_results(parsed)}

        {:ok, %{status_code: status, body: body}} ->
          Logger.warning("[BraveSearch] News search failed: #{status}")
          {:error, %{status: status, body: body}}

        {:error, %HTTPoison.Error{reason: reason}} ->
          Logger.warning("[BraveSearch] News search error: #{inspect(reason)}")
          {:error, %{reason: reason}}
      end
    end
  end

  @doc """
  Scrape a URL and extract text content.
  Uses a simple HTML-to-text approach via regex stripping.
  (Future: replace with Zig parser or Floki for better extraction.)
  """
  def scrape_url(url, opts \\ []) do
    timeout = Keyword.get(opts, :timeout, 10_000)

    case HTTPoison.get(url, [{"User-Agent", "Perplexica/1.0"}], recv_timeout: timeout, follow_redirect: true, max_redirect: 3) do
      {:ok, %{status_code: status, body: body}} when status in 200..299 ->
        text = extract_text_from_html(body)
        {:ok, %{url: url, content: text}}

      {:ok, %{status_code: status}} ->
        {:error, %{status: status, url: url}}

      {:error, %HTTPoison.Error{reason: reason}} ->
        {:error, %{reason: reason, url: url}}
    end
  end

  @doc """
  Fetch discover/news articles for a topic.
  Used by the Discover page — searches multiple site+query combos.
  """
  def discover_news(topic, opts \\ []) do
    mode = Keyword.get(opts, :mode, :normal)
    config = topics_config()[topic] || topics_config()["tech"]

    combos =
      case mode do
        :preview ->
          # Single random combo for preview
          link = Enum.random(config.links)
          query = Enum.random(config.queries)
          [{link, query}]

        :normal ->
          # Cartesian product
          for link <- config.links, query <- config.queries, do: {link, query}
      end

    results =
      combos
      |> Task.async_stream(
        fn {link, query} ->
          search_news("#{query} site:#{link}", count: 5)
        end,
        max_concurrency: 3,
        timeout: 15_000,
        on_timeout: :kill_task
      )
      |> Enum.flat_map(fn
        {:ok, {:ok, results}} -> results
        _ -> []
      end)
      |> deduplicate_results()
      |> Enum.shuffle()

    {:ok, results}
  end

  # ── Rate Limiting ──────────────────────────────────────────────────

  defp rate_limit do
    alias Perplexica.SearchSources.RateLimiter

    case RateLimiter.hit(@rate_limit_key, @rate_limit_scale, @rate_limit_count) do
      {:allow, _count} ->
        :ok

      {:deny, _retry_after} ->
        # Wait and retry once
        Process.sleep(@rate_limit_scale)

        case RateLimiter.hit(@rate_limit_key, @rate_limit_scale, @rate_limit_count) do
          {:allow, _count} -> :ok
          {:deny, _retry_after} -> {:error, %{reason: :rate_limited}}
        end
    end
  end

  # ── Response Parsing ───────────────────────────────────────────────

  defp parse_web_results(parsed) do
    (parsed["web"] || %{})
    |> Map.get("results", [])
    |> Enum.map(fn r ->
      %{
        url: r["url"],
        title: r["title"] || "",
        content: r["description"] || "",
        thumbnail: get_in(r, ["thumbnail", "src"]),
        engine: "brave_api",
        category: "general"
      }
    end)
  end

  defp parse_news_from_web(parsed) do
    (parsed["news"] || %{})
    |> Map.get("results", [])
    |> Enum.map(fn r ->
      %{
        url: r["url"],
        title: r["title"] || "",
        content: r["description"] || "",
        thumbnail: get_in(r, ["thumbnail", "src"]),
        engine: "brave_api_news",
        category: "news"
      }
    end)
  end

  defp parse_news_results(parsed) do
    (parsed["results"] || [])
    |> Enum.map(fn r ->
      %{
        url: r["url"],
        title: r["title"] || "",
        content: r["description"] || "",
        thumbnail: get_in(r, ["thumbnail", "src"]),
        engine: "brave_api_news",
        category: "news"
      }
    end)
  end

  defp deduplicate_results(results) do
    results
    |> Enum.uniq_by(fn r -> String.downcase(String.trim(r.url || "")) end)
  end

  # ── HTML Text Extraction ───────────────────────────────────────────

  defp extract_text_from_html(html) do
    html
    |> String.replace(~r/<script[^>]*>[\s\S]*?<\/script>/i, "")
    |> String.replace(~r/<style[^>]*>[\s\S]*?<\/style>/i, "")
    |> String.replace(~r/<[^>]+>/, " ")
    |> String.replace(~r/&[a-z]+;/, " ")
    |> String.replace(~r/\s+/, " ")
    |> String.trim()
    |> String.slice(0, 10_000)
  end

  # ── Topic Configuration ────────────────────────────────────────────

  defp topics_config do
    %{
      "research" => %{
        queries: ["scientific research", "academic breakthroughs", "quantum physics", "biotechnology"],
        links: ["phys.org", "sciencedaily.com", "nature.com"]
      },
      "analysis" => %{
        queries: ["market analysis", "economic trends", "data analysis", "geopolitics"],
        links: ["economist.com", "ft.com", "reuters.com"]
      },
      "discovery" => %{
        queries: ["new discoveries", "hidden gems", "exploration", "innovation"],
        links: ["nationalgeographic.com", "smithsonianmag.com", "npr.org"]
      },
      "tech" => %{
        queries: ["technology news", "latest tech", "AI", "science and innovation"],
        links: ["techcrunch.com", "wired.com", "theverge.com"]
      },
      "finance" => %{
        queries: ["finance news", "economy", "stock market", "investing"],
        links: ["bloomberg.com", "cnbc.com", "marketwatch.com"]
      },
      "art" => %{
        queries: ["art news", "culture", "modern art", "cultural events"],
        links: ["artnews.com", "hyperallergic.com", "theartnewspaper.com"]
      },
      "sports" => %{
        queries: ["sports news", "latest sports", "cricket football tennis"],
        links: ["espn.com", "bbc.com/sport", "skysports.com"]
      },
      "entertainment" => %{
        queries: ["entertainment news", "movies", "TV shows", "celebrities"],
        links: ["hollywoodreporter.com", "variety.com", "deadline.com"]
      }
    }
  end

  defp brave_api_key do
    # Accept either BRAVE_SEARCH_API_KEY (canonical) or BRAVE_API_KEY (shorthand).
    System.get_env("BRAVE_SEARCH_API_KEY") || System.get_env("BRAVE_API_KEY") || ""
  end
end
