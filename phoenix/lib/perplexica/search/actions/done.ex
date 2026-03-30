defmodule Perplexica.Search.Actions.Done do
  @moduledoc "Signal that research is complete — terminates the agentic loop."

  def name, do: "done"

  def enabled?(_config), do: true

  def tool_definition do
    %{
      name: "done",
      description: "Signal that you have gathered enough information and are ready to write the final answer. Call this when you have sufficient context.",
      parameters: %{
        "type" => "object",
        "properties" => %{
          "reason" => %{
            "type" => "string",
            "description" => "Brief reason why research is complete"
          }
        },
        "required" => ["reason"]
      }
    }
  end

  def execute(args, _config) do
    {:ok, %{type: "done", reason: args["reason"] || "Research complete"}}
  end
end
