defmodule Perplexica.Models.HttpClient do
  @moduledoc """
  Shared HTTP client for AI provider API calls.

  Handles:
  - JSON POST requests with auth headers
  - SSE (Server-Sent Events) streaming for chat completions
  - Timeout management (120s default for slow models)
  - Error classification (retryable vs non-retryable)

  ## SSE Streaming

  OpenAI-compatible APIs stream responses as Server-Sent Events:

      data: {"choices":[{"delta":{"content":"Hello"}}]}
      data: {"choices":[{"delta":{"content":" world"}}]}
      data: [DONE]

  The `stream_post/4` function spawns a process that parses these
  chunks and sends them to the caller as `{:chunk, map}` messages.
  """

  require Logger

  @default_timeout 120_000
  @stream_recv_timeout 130_000

  @doc """
  POST a JSON request and return the parsed response body.
  """
  def post(url, body, headers, opts \\ []) do
    timeout = Keyword.get(opts, :timeout, @default_timeout)

    headers = [{"Content-Type", "application/json"} | headers]

    case HTTPoison.post(url, Jason.encode!(body), headers, recv_timeout: timeout) do
      {:ok, %HTTPoison.Response{status_code: status, body: resp_body}}
      when status in 200..299 ->
        case Jason.decode(resp_body) do
          {:ok, parsed} -> {:ok, parsed}
          {:error, _} -> {:error, %{status: status, body: resp_body, reason: :json_parse_error}}
        end

      {:ok, %HTTPoison.Response{status_code: status, body: resp_body}} ->
        {:error, %{status: status, body: resp_body, reason: classify_error(status)}}

      {:error, %HTTPoison.Error{reason: :timeout}} ->
        {:error, %{status: 0, body: "", reason: :timeout}}

      {:error, %HTTPoison.Error{reason: reason}} ->
        {:error, %{status: 0, body: "", reason: reason}}
    end
  end

  @doc """
  POST a streaming request. Spawns a process that sends SSE chunks
  to the given `caller_pid` as `{:stream_chunk, chunk_map}` messages.
  Sends `{:stream_done, tool_calls}` when complete.
  Sends `{:stream_error, error}` on failure.
  """
  def stream_post(url, body, headers, caller_pid) do
    headers = [{"Content-Type", "application/json"} | headers]
    stream_body = Map.put(body, "stream", true)

    # Use HTTPoison async streaming
    case HTTPoison.post(
           url,
           Jason.encode!(stream_body),
           headers,
           stream_to: self(),
           async: :once,
           recv_timeout: @stream_recv_timeout
         ) do
      {:ok, %HTTPoison.AsyncResponse{id: ref}} ->
        stream_loop(ref, caller_pid, "")
        :ok

      {:error, %HTTPoison.Error{reason: reason}} ->
        send(caller_pid, {:stream_error, %{reason: reason}})
        {:error, reason}
    end
  end

  # ── SSE Stream Parser ──────────────────────────────────────────────

  defp stream_loop(ref, caller_pid, buffer) do
    receive do
      %HTTPoison.AsyncStatus{id: ^ref, code: code} when code in 200..299 ->
        HTTPoison.stream_next(%HTTPoison.AsyncResponse{id: ref})
        stream_loop(ref, caller_pid, buffer)

      %HTTPoison.AsyncStatus{id: ^ref, code: code} ->
        # Non-2xx status — collect body for error
        HTTPoison.stream_next(%HTTPoison.AsyncResponse{id: ref})
        collect_error_body(ref, caller_pid, code, "")

      %HTTPoison.AsyncHeaders{id: ^ref} ->
        HTTPoison.stream_next(%HTTPoison.AsyncResponse{id: ref})
        stream_loop(ref, caller_pid, buffer)

      %HTTPoison.AsyncChunk{id: ^ref, chunk: chunk} ->
        new_buffer = buffer <> chunk
        {remaining, events} = parse_sse_events(new_buffer)

        done? =
          Enum.reduce_while(events, false, fn event, _acc ->
            case event do
              "[DONE]" ->
                {:halt, true}

              json_str ->
                case Jason.decode(json_str) do
                  {:ok, parsed} ->
                    send(caller_pid, {:stream_chunk, parse_stream_choice(parsed)})
                    {:cont, false}

                  {:error, _} ->
                    # Malformed JSON chunk, skip
                    {:cont, false}
                end
            end
          end)

        if done? do
          send(caller_pid, {:stream_done})
        else
          HTTPoison.stream_next(%HTTPoison.AsyncResponse{id: ref})
          stream_loop(ref, caller_pid, remaining)
        end

      %HTTPoison.AsyncEnd{id: ^ref} ->
        send(caller_pid, {:stream_done})

      %HTTPoison.Error{id: ^ref, reason: reason} ->
        send(caller_pid, {:stream_error, %{reason: reason}})
    after
      @stream_recv_timeout ->
        send(caller_pid, {:stream_error, %{reason: :timeout}})
    end
  end

  defp collect_error_body(ref, caller_pid, status_code, body) do
    receive do
      %HTTPoison.AsyncChunk{id: ^ref, chunk: chunk} ->
        HTTPoison.stream_next(%HTTPoison.AsyncResponse{id: ref})
        collect_error_body(ref, caller_pid, status_code, body <> chunk)

      %HTTPoison.AsyncEnd{id: ^ref} ->
        send(
          caller_pid,
          {:stream_error, %{status: status_code, body: body, reason: classify_error(status_code)}}
        )

      %HTTPoison.AsyncHeaders{id: ^ref} ->
        HTTPoison.stream_next(%HTTPoison.AsyncResponse{id: ref})
        collect_error_body(ref, caller_pid, status_code, body)
    after
      10_000 ->
        send(
          caller_pid,
          {:stream_error, %{status: status_code, body: body, reason: classify_error(status_code)}}
        )
    end
  end

  @doc """
  Parse SSE event stream buffer into individual events.
  Returns {remaining_buffer, [event_data_strings]}.
  """
  def parse_sse_events(buffer) do
    lines = String.split(buffer, "\n")

    # The last element might be incomplete
    {complete_lines, remaining} =
      case List.last(lines) do
        "" -> {Enum.drop(lines, -1), ""}
        partial -> {Enum.drop(lines, -1), partial}
      end

    events =
      complete_lines
      |> Enum.filter(&String.starts_with?(&1, "data: "))
      |> Enum.map(fn line ->
        line
        |> String.trim_leading("data: ")
        |> String.trim()
      end)
      |> Enum.reject(&(&1 == ""))

    {remaining, events}
  end

  defp parse_stream_choice(parsed) do
    choice = List.first(parsed["choices"] || []) || %{}
    delta = choice["delta"] || %{}
    finish_reason = choice["finish_reason"]

    %{
      content_delta: delta["content"],
      tool_call_deltas: delta["tool_calls"],
      finish_reason: finish_reason,
      done: finish_reason != nil
    }
  end

  @doc """
  Classify HTTP status codes for retry/failover decisions.
  """
  def classify_error(status) when status in [429], do: :rate_limited
  def classify_error(status) when status in [500, 502, 503], do: :server_error
  def classify_error(status) when status in [401, 403], do: :auth_error
  def classify_error(status) when status in [400], do: :bad_request
  def classify_error(status) when status in [404], do: :not_found
  def classify_error(_status), do: :unknown_error

  @doc """
  Check if an error is retryable (should trigger failover).
  """
  def retryable?(%{reason: :rate_limited}), do: true
  def retryable?(%{reason: :server_error}), do: true
  def retryable?(%{reason: :timeout}), do: true
  def retryable?(_), do: false
end
