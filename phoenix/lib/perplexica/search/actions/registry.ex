defmodule Perplexica.Search.Actions.Registry do
  @moduledoc """
  Action registry for the agentic research loop.

  Each action module implements `enabled?/1` and `execute/2` callbacks.
  The registry provides tools descriptions for the LLM and parallel
  execution of selected actions.

  ## Actions

  - `web_search` — Search the web via Brave Search API
  - `academic_search` — Search with academic focus
  - `discussion_search` — Search forums and discussion platforms
  - `scrape_url` — Fetch and extract text from a URL
  - `uploads_search` — Search over uploaded file embeddings
  - `done` — Signal that research is complete
  """

  alias Perplexica.Search.Actions.{WebSearch, ExaSearch, AcademicSearch, DiscussionSearch, ScrapeUrl, Done}

  @actions [WebSearch, ExaSearch, AcademicSearch, DiscussionSearch, ScrapeUrl, Done]

  @doc "Get all actions that are enabled for the given config."
  def available_actions(config) do
    Enum.filter(@actions, fn action -> action.enabled?(config) end)
  end

  @doc "Get tool definitions for enabled actions (for LLM tool calling)."
  def available_tools(config) do
    config
    |> available_actions()
    |> Enum.map(fn action -> action.tool_definition() end)
  end

  @doc """
  Execute multiple tool calls in parallel.
  Returns a list of `{action_name, result}` tuples.
  """
  def execute_all(tool_calls, config) do
    action_map =
      @actions
      |> Enum.map(fn a -> {a.name(), a} end)
      |> Map.new()

    tool_calls
    |> Task.async_stream(
      fn tool_call ->
        action = action_map[tool_call.name]

        if action do
          result = action.execute(tool_call.arguments, config)
          {tool_call.name, tool_call.id, result}
        else
          {tool_call.name, tool_call.id, {:error, :unknown_action}}
        end
      end,
      max_concurrency: 5,
      timeout: 30_000,
      on_timeout: :kill_task
    )
    |> Enum.map(fn
      {:ok, result} -> result
      {:exit, _} -> {"unknown", "", {:error, :timeout}}
    end)
  end
end
