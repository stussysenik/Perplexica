defmodule Perplexica.Models.GlmProvider do
  @moduledoc """
  Zhipu AI (GLM) provider — OpenAI-compatible API for chat completions
  and streaming. Used as failover when NVIDIA NIM is unavailable.

  ## Supported Models

  Chat:
  - `glm-4-flash` (free tier)
  - `glm-4.7-flash` (free tier)
  - `glm-5.1` (coding plan subscription, ~$3/mo)

  ## Balance Error Handling

  When the coding plan has insufficient balance (error contains "余额"),
  the provider automatically retries with the free tier model (glm-4-flash).

  ## No Embeddings

  GLM does not support embeddings. Use NIM for embedding generation.
  """

  @behaviour Perplexica.Models.Provider

  alias Perplexica.Models.HttpClient

  @default_model "glm-4-flash"
  @free_tier_model "glm-4-flash"

  # ── Chat Models ──────────────────────────────────────────────────

  @impl true
  def chat_models do
    [
      %{key: "glm-4-flash", name: "GLM-4 Flash (Free)"},
      %{key: "glm-4.7-flash", name: "GLM-4.7 Flash (Free)"},
      %{key: "glm-5.1", name: "GLM-5.1 (Coding Plan)"}
    ]
  end

  @impl true
  def embedding_models, do: []

  # ── Chat Completion ────────────────────────────────────────────────

  @impl true
  def chat_completion(config, messages, opts) do
    url = "#{config.base_url}/chat/completions"
    model = opts[:model] || @default_model

    body =
      build_completion_body(model, messages, opts)
      |> maybe_add_tools(opts)

    case HttpClient.post(url, body, auth_headers(config)) do
      {:ok, response} ->
        {:ok, parse_completion_response(response)}

      {:error, %{body: body} = error} ->
        # Check for balance error (余额) — fall back to free tier
        if is_binary(body) && String.contains?(body, "余额") && model != @free_tier_model do
          fallback_opts = Map.put(opts, :model, @free_tier_model)
          chat_completion(config, messages, fallback_opts)
        else
          {:error, error}
        end

      {:error, _} = error ->
        error
    end
  end

  # ── Streaming Chat Completion ──────────────────────────────────────

  @impl true
  def stream_chat_completion(config, messages, opts, caller_pid) do
    url = "#{config.base_url}/chat/completions"
    model = opts[:model] || @default_model

    body =
      build_completion_body(model, messages, opts)
      |> maybe_add_tools(opts)

    HttpClient.stream_post(url, body, auth_headers(config), caller_pid)
  end

  # ── Structured Output ──────────────────────────────────────────────

  @impl true
  def generate_object(config, messages, json_schema, opts) do
    schema_instruction = """
    You MUST respond with valid JSON only. No markdown, no explanation, no extra text.
    Your response must match this exact JSON schema:

    #{Jason.encode!(json_schema, pretty: true)}

    Respond with ONLY the JSON object, nothing else.
    """

    augmented_messages = [%{role: "system", content: schema_instruction} | messages]
    structured_opts = Map.merge(opts, %{temperature: 0.1})

    case chat_completion(config, augmented_messages, structured_opts) do
      {:ok, %{content: content}} when is_binary(content) ->
        cleaned = clean_json_response(content)

        case Jason.decode(cleaned) do
          {:ok, parsed} -> {:ok, parsed}
          {:error, _} ->
            case extract_json(content) do
              {:ok, parsed} -> {:ok, parsed}
              :error -> {:error, %{reason: :json_parse_error, raw: content}}
            end
        end

      {:ok, %{content: nil}} ->
        {:error, %{reason: :empty_response}}

      {:error, _} = error ->
        error
    end
  end

  # ── Embeddings (Not Supported) ─────────────────────────────────────

  @impl true
  def embed_text(_config, _texts, _opts) do
    {:error, %{reason: :not_supported, message: "GLM does not support embeddings"}}
  end

  @impl true
  def embed_chunks(_config, _chunks, _opts) do
    {:error, %{reason: :not_supported, message: "GLM does not support embeddings"}}
  end

  # ── Health Check ───────────────────────────────────────────────────

  @impl true
  def health_check(config) do
    # Simple lightweight request to verify API connectivity
    url = "#{config.base_url}/chat/completions"

    body = %{
      "model" => @free_tier_model,
      "messages" => [%{"role" => "user", "content" => "ping"}],
      "max_tokens" => 1
    }

    case HttpClient.post(url, body, auth_headers(config), timeout: 15_000) do
      {:ok, _} -> :ok
      {:error, %{status: status}} when status in [400, 401, 403] -> {:error, :auth_error}
      {:error, reason} -> {:error, reason}
    end
  end

  # ── Private Helpers ────────────────────────────────────────────────

  defp auth_headers(config) do
    [{"Authorization", "Bearer #{config.api_key}"}]
  end

  defp build_completion_body(model, messages, opts) do
    body = %{
      "model" => model,
      "messages" => format_messages(messages)
    }

    body
    |> maybe_put("temperature", opts[:temperature])
    |> maybe_put("max_tokens", opts[:max_tokens])
    |> maybe_put("top_p", opts[:top_p])
    |> maybe_put("stop", opts[:stop])
  end

  defp maybe_add_tools(body, opts) do
    case opts[:tools] do
      nil -> body
      [] -> body
      tools ->
        openai_tools =
          Enum.map(tools, fn tool ->
            %{
              "type" => "function",
              "function" => %{
                "name" => tool.name,
                "description" => tool.description,
                "parameters" => tool.parameters
              }
            }
          end)

        Map.put(body, "tools", openai_tools)
    end
  end

  defp format_messages(messages) do
    Enum.map(messages, fn msg ->
      base = %{"role" => to_string(msg.role), "content" => msg[:content] || ""}

      base
      |> maybe_put_msg("tool_calls", format_tool_calls(msg[:tool_calls]))
      |> maybe_put_msg("tool_call_id", msg[:tool_call_id])
      |> maybe_put_msg("name", msg[:name])
    end)
  end

  defp format_tool_calls(nil), do: nil
  defp format_tool_calls([]), do: nil

  defp format_tool_calls(tool_calls) do
    Enum.map(tool_calls, fn tc ->
      %{
        "id" => tc.id,
        "type" => "function",
        "function" => %{
          "name" => tc.name,
          "arguments" =>
            if(is_binary(tc.arguments), do: tc.arguments, else: Jason.encode!(tc.arguments))
        }
      }
    end)
  end

  defp parse_completion_response(response) do
    choice = List.first(response["choices"] || []) || %{}
    message = choice["message"] || %{}
    usage = response["usage"] || %{}

    tool_calls =
      (message["tool_calls"] || [])
      |> Enum.map(fn tc ->
        args =
          case Jason.decode(tc["function"]["arguments"] || "{}") do
            {:ok, parsed} -> parsed
            {:error, _} -> %{}
          end

        %{
          id: tc["id"],
          name: tc["function"]["name"],
          arguments: args
        }
      end)

    %{
      content: message["content"],
      tool_calls: tool_calls,
      usage: %{
        prompt_tokens: usage["prompt_tokens"] || 0,
        completion_tokens: usage["completion_tokens"] || 0
      }
    }
  end

  defp clean_json_response(content) do
    content
    |> String.trim()
    |> String.replace(~r/^```json\s*/, "")
    |> String.replace(~r/\s*```$/, "")
    |> String.trim()
  end

  defp extract_json(content) do
    case Regex.run(~r/\{[\s\S]*\}/, content) do
      [json_str] ->
        case Jason.decode(json_str) do
          {:ok, parsed} -> {:ok, parsed}
          {:error, _} -> :error
        end

      _ ->
        :error
    end
  end

  defp maybe_put(map, _key, nil), do: map
  defp maybe_put(map, key, value), do: Map.put(map, key, value)

  defp maybe_put_msg(map, _key, nil), do: map
  defp maybe_put_msg(map, key, value), do: Map.put(map, key, value)
end
