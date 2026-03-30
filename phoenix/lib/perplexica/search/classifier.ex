defmodule Perplexica.Search.Classifier do
  @moduledoc """
  Query classifier — uses LLM structured output to determine search
  strategy, widget triggers, and reformulate follow-up queries.

  ## Classification Output

      %{
        "skipSearch" => false,
        "personalSearch" => false,
        "academicSearch" => false,
        "discussionSearch" => false,
        "showWeatherWidget" => false,
        "showStockWidget" => false,
        "showCalculationWidget" => false,
        "standaloneFollowUp" => "reformulated query"
      }
  """

  alias Perplexica.Models.Registry

  @classification_schema %{
    "type" => "object",
    "properties" => %{
      "skipSearch" => %{"type" => "boolean", "description" => "True if the query is a simple greeting or doesn't need web search"},
      "personalSearch" => %{"type" => "boolean", "description" => "True if the query is about personal uploaded files"},
      "academicSearch" => %{"type" => "boolean", "description" => "True if the query needs academic/research sources"},
      "discussionSearch" => %{"type" => "boolean", "description" => "True if the query would benefit from forum/discussion results"},
      "showWeatherWidget" => %{"type" => "boolean", "description" => "True if the query asks about weather"},
      "showStockWidget" => %{"type" => "boolean", "description" => "True if the query asks about stock prices"},
      "showCalculationWidget" => %{"type" => "boolean", "description" => "True if the query involves math calculations"},
      "standaloneFollowUp" => %{"type" => "string", "description" => "The query reformulated as a standalone, context-independent search query"}
    },
    "required" => ["skipSearch", "standaloneFollowUp"]
  }

  @doc """
  Classify a user query to determine search strategy.
  Returns `{:ok, classification}` or `{:error, reason}`.
  """
  def classify(query, chat_history \\ [], opts \\ %{}) do
    system_prompt = """
    You are a query classifier for a search engine. Analyze the user's query and chat history to determine:

    1. Whether a web search is needed (skipSearch = true for greetings, simple questions)
    2. What type of search sources would be most helpful
    3. Whether any widgets should be shown (weather, stock, calculation)
    4. A reformulated standalone version of the query that doesn't depend on chat context

    Always set standaloneFollowUp to a clear, context-independent search query.
    If the query references previous messages, incorporate that context into standaloneFollowUp.
    """

    history_context =
      if chat_history != [] do
        formatted =
          chat_history
          |> Enum.map(fn
            %{role: "user", content: c} -> "User: #{c}"
            %{role: "assistant", content: c} -> "Assistant: #{String.slice(c, 0, 200)}"
            _ -> ""
          end)
          |> Enum.join("\n")

        "\n\nChat history:\n#{formatted}"
      else
        ""
      end

    messages = [
      %{role: "system", content: system_prompt},
      %{role: "user", content: "Query: #{query}#{history_context}"}
    ]

    case Registry.generate_object(messages, @classification_schema, opts) do
      {:ok, _key, {:ok, classification}} ->
        {:ok, normalize_classification(classification, query)}

      {:error, _key, {:error, _reason}} ->
        # On classification failure, return a safe default
        {:ok, default_classification(query)}

      _ ->
        {:ok, default_classification(query)}
    end
  end

  defp normalize_classification(raw, query) do
    %{
      skip_search: raw["skipSearch"] == true,
      personal_search: raw["personalSearch"] == true,
      academic_search: raw["academicSearch"] == true,
      discussion_search: raw["discussionSearch"] == true,
      show_weather_widget: raw["showWeatherWidget"] == true,
      show_stock_widget: raw["showStockWidget"] == true,
      show_calculation_widget: raw["showCalculationWidget"] == true,
      standalone_follow_up: raw["standaloneFollowUp"] || query
    }
  end

  defp default_classification(query) do
    %{
      skip_search: false,
      personal_search: false,
      academic_search: false,
      discussion_search: false,
      show_weather_widget: false,
      show_stock_widget: false,
      show_calculation_widget: false,
      standalone_follow_up: query
    }
  end
end
