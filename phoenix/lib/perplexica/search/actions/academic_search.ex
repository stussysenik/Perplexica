defmodule Perplexica.Search.Actions.AcademicSearch do
  @moduledoc "Search with academic focus — boosts .edu, arxiv, scholar results."

  alias Perplexica.SearchSources.Brave

  def name, do: "academic_search"

  def enabled?(config), do: config[:academic_search] == true

  def tool_definition do
    %{
      name: "academic_search",
      description: "Search for academic papers, research, and scholarly sources. Use for scientific or educational queries.",
      parameters: %{
        "type" => "object",
        "properties" => %{
          "queries" => %{
            "type" => "array",
            "items" => %{"type" => "string"},
            "description" => "Academic search queries"
          }
        },
        "required" => ["queries"]
      }
    }
  end

  def execute(args, _config) do
    queries = args["queries"] || []

    # Append academic modifiers
    academic_queries = Enum.map(queries, fn q -> "#{q} site:arxiv.org OR site:scholar.google.com OR site:.edu" end)

    results =
      academic_queries
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
