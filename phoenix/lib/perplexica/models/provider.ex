defmodule Perplexica.Models.Provider do
  @moduledoc """
  Behaviour defining the contract for AI model providers.

  Each provider (NIM, GLM, etc.) implements these callbacks to support
  chat completions, streaming, structured output, and embeddings.

  ## Message Format

  Messages follow the OpenAI chat format:

      [
        %{role: "system", content: "You are helpful."},
        %{role: "user", content: "Hello"},
        %{role: "assistant", content: "Hi!", tool_calls: [...]},
        %{role: "tool", tool_call_id: "...", name: "...", content: "..."}
      ]

  ## Options

  Common options passed to all callbacks:

      %{
        model: "kimi-k2-instruct",
        temperature: 1.0,
        max_tokens: 4096,
        top_p: nil,
        stop: nil,
        tools: [%{name: "search", description: "...", parameters: %{...}}]
      }
  """

  @type message :: map()
  @type tool :: map()
  @type options :: map()
  @type tool_call :: map()
  @type completion_response :: map()
  @type stream_chunk :: map()

  @type config :: map()

  @doc "Non-streaming chat completion. Returns full response."
  @callback chat_completion(config(), [message()], options()) ::
              {:ok, completion_response()} | {:error, term()}

  @doc """
  Streaming chat completion. Returns a function that accepts a callback.
  The callback receives stream_chunk() messages and a final :done atom.
  """
  @callback stream_chat_completion(config(), [message()], options(), pid()) ::
              :ok | {:error, term()}

  @doc """
  Structured output — generates a JSON object matching the given schema.
  For non-OpenAI providers, injects the schema as a text instruction.
  """
  @callback generate_object(config(), [message()], json_schema :: map(), options()) ::
              {:ok, map()} | {:error, term()}

  @doc "Generate embeddings for text strings (query mode)."
  @callback embed_text(config(), [String.t()], options()) ::
              {:ok, [[float()]]} | {:error, term()}

  @doc "Generate embeddings for document chunks (passage mode)."
  @callback embed_chunks(config(), [String.t()], options()) ::
              {:ok, [[float()]]} | {:error, term()}

  @doc "Lightweight health check — verifies API connectivity."
  @callback health_check(config()) :: :ok | {:error, term()}

  @doc "Returns the list of available chat models."
  @callback chat_models() :: [%{key: String.t(), name: String.t()}]

  @doc "Returns the list of available embedding models."
  @callback embedding_models() :: [%{key: String.t(), name: String.t()}]
end
