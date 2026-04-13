defmodule Perplexica.SearchSources.Exa do
  @moduledoc """
  Exa.ai API client (formerly Metaphor).
  Provides neural search optimized for LLMs.
  """

  require Logger

  @search_url "https://api.exa.ai/search"
  @contents_url "https://api.exa.ai/contents"

  @doc """
  Search via Exa.ai neural search.
  Returns `{:ok, [result]}` or `{:error, reason}`.
  """
  def search(query, opts \\ []) do
    api_key = Keyword.get(opts, :api_key) || api_key()
    num_results = Keyword.get(opts, :num_results, 10)
    use_autoprompt = Keyword.get(opts, :use_autoprompt, true)

    headers = [
      {"Accept", "application/json"},
      {"Content-Type", "application/json"},
      {"x-api-key", api_key}
    ]

    body = Jason.encode!(%{
      "query" => query,
      "numResults" => num_results,
      "useAutoprompt" => use_autoprompt,
      "text" => %{"maxCharacters" => 1000}
    })

    case HTTPoison.post(@search_url, body, headers, recv_timeout: 15_000) do
      {:ok, %{status_code: 200, body: response_body}} ->
        parsed = Jason.decode!(response_body)
        results = parse_results(parsed)
        {:ok, results}

      {:ok, %{status_code: status, body: response_body}} ->
        Logger.warning("[Exa] Search failed: #{status} #{String.slice(response_body, 0, 200)}")
        {:error, %{status: status, body: response_body}}

      {:error, %HTTPoison.Error{reason: reason}} ->
        Logger.warning("[Exa] Search error: #{inspect(reason)}")
        {:error, %{reason: reason}}
    end
  end

  defp parse_results(parsed) do
    (parsed["results"] || [])
    |> Enum.map(fn r ->
      %{
        url: r["url"],
        title: r["title"] || "",
        content: r["text"] || "",
        id: r["id"],
        score: r["score"],
        published_date: r["publishedDate"],
        author: r["author"],
        engine: "exa_api",
        category: "general"
      }
    end)
  end

  defp api_key do
    System.get_env("EXA_AI_API_KEY") || System.get_env("EXA_API_KEY") || ""
  end
end
