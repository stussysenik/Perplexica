defmodule Perplexica.Search.Actions.ExaSearch do
  @moduledoc "Neural search via Exa.ai API."

  alias Perplexica.SearchSources.Exa

  def name, do: "exa_search"

  def enabled?(config) do
    # Enabled by default if API key is present, or specifically requested in config
    System.get_env("EXA_AI_API_KEY") != nil or System.get_env("EXA_API_KEY") != nil or config[:use_exa] == true
  end

  def tool_definition do
    %{
      name: "exa_search",
      description: "Search the web using neural search. Best for finding high-quality, relevant websites based on meaning rather than keywords. Returns detailed snippets.",
      parameters: %{
        "type" => "object",
        "properties" => %{
          "queries" => %{
            "type" => "array",
            "items" => %{"type" => "string"},
            "description" => "List of neural search queries to execute"
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
        fn query -> Exa.search(query, num_results: 10) end,
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
