defmodule Perplexica.Search.Actions.ScrapeUrl do
  @moduledoc "Fetch and extract text content from URLs."

  alias Perplexica.SearchSources.Brave

  def name, do: "scrape_url"

  def enabled?(_config), do: true

  def tool_definition do
    %{
      name: "scrape_url",
      description: "Fetch a webpage and extract its text content. Use to read full articles or pages from search results.",
      parameters: %{
        "type" => "object",
        "properties" => %{
          "urls" => %{
            "type" => "array",
            "items" => %{"type" => "string"},
            "description" => "URLs to scrape"
          }
        },
        "required" => ["urls"]
      }
    }
  end

  def execute(args, _config) do
    urls = args["urls"] || []

    results =
      urls
      |> Enum.take(5)
      |> Task.async_stream(
        fn url -> Brave.scrape_url(url) end,
        max_concurrency: 5,
        timeout: 15_000,
        on_timeout: :kill_task
      )
      |> Enum.flat_map(fn
        {:ok, {:ok, result}} -> [result]
        _ -> []
      end)

    {:ok, %{type: "scrape_results", results: results}}
  end
end
