defmodule Perplexica.Search.Actions.WebSearch do
  @moduledoc "Search the web via Brave Search API."

  alias Perplexica.SearchSources.Brave

  def name, do: "web_search"

  def enabled?(_config), do: true

  def tool_definition do
    %{
      name: "web_search",
      description: "Search the web for information. Use this to find current information, facts, and data from websites.",
      parameters: %{
        "type" => "object",
        "properties" => %{
          "queries" => %{
            "type" => "array",
            "items" => %{"type" => "string"},
            "description" => "List of search queries to execute"
          }
        },
        "required" => ["queries"]
      }
    }
  end

  def execute(args, _config) do
    queries = args["queries"] || []

    results =
      queries
      |> Task.async_stream(
        fn query -> Brave.search_web(query, count: 10) end,
        max_concurrency: 3,
        timeout: 15_000,
        on_timeout: :kill_task
      )
      |> Enum.flat_map(fn
        {:ok, {:ok, results}} -> results
        _ -> []
      end)
      |> Enum.uniq_by(fn r -> String.downcase(r.url || "") end)

    {:ok, %{type: "search_results", results: results, queries: queries}}
  end
end
