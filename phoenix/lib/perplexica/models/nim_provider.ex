defmodule Perplexica.Models.NimProvider do
  @moduledoc """
  NVIDIA NIM provider — OpenAI-compatible API for chat completions,
  streaming, structured output, and embeddings.

  ## Supported Models

  Chat (verified against the live NIM catalog 2026-06):
  - `meta/llama-3.3-70b-instruct` (default — fast, reliable)
  - `moonshotai/kimi-k2.6` (successor to the EOL `kimi-k2-instruct`)
  - `deepseek-ai/deepseek-v4-flash`
  - `qwen/qwen3.5-397b-a17b`
  - `openai/gpt-oss-120b`
  - `mistralai/mistral-large-3-675b-instruct-2512`

  Embedding:
  - `nvidia/nv-embedqa-e5-v5` (1024-dim, asymmetric input_type)

  ## Key Differences from OpenAI

  - Uses `max_tokens` (not `max_completion_tokens`)
  - No native structured output (`parse()`) — uses JSON schema injection
  - Embeddings require `input_type: "query"|"passage"` for NV EmbedQA
  - Base URL: `https://integrate.api.nvidia.com/v1`
  """

  @behaviour Perplexica.Models.Provider

  alias Perplexica.Models.HttpClient

  # `moonshotai/kimi-k2-instruct` reached end-of-life on 2026-05-12 and now
  # returns HTTP 410, which opened the NIM circuit breaker and made every
  # search fail at answer generation. Default to a model that is confirmed
  # live in the NIM catalog. (Verified with a real completion 2026-06.)
  @default_model "meta/llama-3.3-70b-instruct"
  @default_embedding_model "nvidia/nv-embedqa-e5-v5"

  # ── Chat Models ──────────────────────────────────────────────────

  @impl true
  def chat_models do
    [
      %{key: "meta/llama-3.3-70b-instruct", name: "Llama 3.3 70B"},
      %{key: "moonshotai/kimi-k2.6", name: "Kimi K2.6"},
      %{key: "deepseek-ai/deepseek-v4-flash", name: "DeepSeek V4 Flash"},
      # `qwen/qwen3.5-397b-a17b` (and the whole qwen family) stopped serving on
      # this NIM key 2026-06-16 — listed but hangs to timeout. Replaced with the
      # DeepSeek V4 Pro flagship, which is the live answer model (see AI module).
      %{key: "deepseek-ai/deepseek-v4-pro", name: "DeepSeek V4 Pro"},
      %{key: "openai/gpt-oss-120b", name: "GPT-OSS 120B"},
      %{key: "mistralai/mistral-large-3-675b-instruct-2512", name: "Mistral Large 3 675B"}
    ]
  end

  @impl true
  def embedding_models do
    [
      %{key: "nvidia/nv-embedqa-e5-v5", name: "NV EmbedQA E5 v5 (1024-dim)"}
    ]
  end

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
    # For non-OpenAI providers: inject JSON schema as instruction
    schema_instruction = """
    You MUST respond with valid JSON only. No markdown, no explanation, no extra text.
    Your response must match this exact JSON schema:

    #{Jason.encode!(json_schema, pretty: true)}

    Respond with ONLY the JSON object, nothing else.
    """

    # Append instruction to the last user message or add as system message
    augmented_messages = inject_schema_instruction(messages, schema_instruction)

    # Use low temperature for deterministic output
    structured_opts = Map.merge(opts, %{temperature: 0.1})

    case chat_completion(config, augmented_messages, structured_opts) do
      {:ok, %{content: content}} when is_binary(content) ->
        # Try to parse JSON, cleaning markdown fences if present
        cleaned = clean_json_response(content)

        case Jason.decode(cleaned) do
          {:ok, parsed} ->
            {:ok, parsed}

          {:error, _} ->
            # Try to extract JSON from the response
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

  # ── Embeddings ─────────────────────────────────────────────────────

  @impl true
  def embed_text(config, texts, opts) do
    create_embedding(config, texts, "query", opts)
  end

  @impl true
  def embed_chunks(config, chunks, opts) do
    create_embedding(config, chunks, "passage", opts)
  end

  defp create_embedding(config, inputs, input_type, opts) do
    url = "#{config.base_url}/embeddings"
    model = opts[:embedding_model] || @default_embedding_model

    body = %{
      "model" => model,
      "input" => inputs,
      "input_type" => input_type
    }

    case HttpClient.post(url, body, auth_headers(config)) do
      {:ok, %{"data" => data}} ->
        embeddings = Enum.map(data, fn d -> d["embedding"] end)
        {:ok, embeddings}

      {:ok, unexpected} ->
        {:error, %{reason: :unexpected_response, body: unexpected}}

      {:error, _} = error ->
        error
    end
  end

  # ── Health Check ───────────────────────────────────────────────────

  @impl true
  def health_check(config) do
    url = "#{config.base_url}/models"

    case HttpClient.post(
           url,
           %{},
           auth_headers(config),
           timeout: 10_000
         ) do
      {:ok, _} -> :ok
      # Models endpoint may return 404 — that's fine, API is reachable
      {:error, %{status: 404}} -> :ok
      {:error, %{status: status}} when status in 200..499 -> :ok
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
    |> maybe_put("frequency_penalty", opts[:frequency_penalty])
    |> maybe_put("presence_penalty", opts[:presence_penalty])
  end

  defp maybe_add_tools(body, opts) do
    case opts[:tools] do
      nil ->
        body

      [] ->
        body

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

  defp inject_schema_instruction(messages, instruction) do
    # Add schema instruction as a system message at the beginning
    [%{role: "system", content: instruction} | messages]
  end

  defp clean_json_response(content) do
    content
    |> String.trim()
    |> String.replace(~r/^```json\s*/, "")
    |> String.replace(~r/\s*```$/, "")
    |> String.trim()
  end

  defp extract_json(content) do
    # Try to find a JSON object in the content
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
