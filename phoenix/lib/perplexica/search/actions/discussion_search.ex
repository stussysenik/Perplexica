defmodule Perplexica.Search.Actions.DiscussionSearch do
  @moduledoc "Search forums and discussion platforms (Reddit, StackOverflow, etc.)."

  alias Perplexica.SearchSources.Brave

  def name, do: "discussion_search"

  def enabled?(config), do: config[:discussion_search] == true

  def tool_definition do
    %{
      name: "discussion_search",
      description: "Search discussion forums and community platforms for opinions, experiences, and solutions.",
      parameters: %{
        "type" => "object",
        "properties" => %{
          "queries" => %{
            "type" => "array",
            "items" => %{"type" => "string"},
            "description" => "Discussion search queries"
          }
        },
        "required" => ["queries"]
      }
    }
  end

  def execute(args, _config) do
    queries = args["queries"] || []

    discussion_queries = Enum.map(queries, fn q -> "#{q} site:reddit.com OR site:stackoverflow.com OR site:news.ycombinator.com" end)

    results =
      discussion_queries
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
