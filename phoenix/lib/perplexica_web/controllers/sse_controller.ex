defmodule PerplexicaWeb.SseController do
  @moduledoc """
  Server-Sent Events (SSE) endpoint for streaming search events to browsers.

  Alternative transport to Absinthe WebSocket subscriptions. When the
  WebSocket connection fails (proxy issues, firewall, etc.), the frontend
  falls back to this SSE endpoint.

  ## Endpoint

      GET /api/sse/search/:session_id

  The session cookie authenticates the request (same as /api/graphql).

  ## Event Format

  Events are spec-compliant SSE (W3C), with JSON payloads:

      event: block
      data: {"type":"block","block":{"type":"text","id":"...","data":"Hello"}}

      event: update_block
      data: {"type":"update_block","blockId":"...","patch":[...]}

      event: research_complete
      data: {"type":"research_complete"}

      event: message_end
      data: {"type":"message_end"}

      event: error
      data: {"type":"error","data":"Something went wrong"}
  """

  use PerplexicaWeb, :controller
  require Logger
  alias Plug.Conn

  @connection_ttl_ms 5 * 60 * 1_000  # 5 minutes max per SSE connection

  def search(conn, %{"session_id" => session_id}) do
    topic = "search:#{session_id}"

    conn =
      conn
      |> put_resp_content_type("text/event-stream")
      |> put_resp_header("cache-control", "no-cache, no-transform")
      |> put_resp_header("connection", "keep-alive")
      |> put_resp_header("x-accel-buffering", "no")  # Disable nginx buffering
      |> Conn.send_chunked(200)

    # Subscribe to the session's PubSub topic
    Phoenix.PubSub.subscribe(Perplexica.PubSub, topic)

    # Send an initial connected event so the client knows the stream is alive
    {:ok, conn} =
      Conn.chunk(conn, format_sse("connected", Jason.encode!(%{session_id: session_id})))

    Logger.debug("[SSE] Stream opened for session #{session_id}")

    # Enter the event stream loop — runs until the client disconnects
    # or the connection times out
    stream_loop(conn, session_id, topic, :erlang.monotonic_time(:millisecond))
  end

  # ── Event Stream Loop ──────────────────────────────────────────────

  defp stream_loop(conn, session_id, topic, started_at) do
    elapsed = :erlang.monotonic_time(:millisecond) - started_at

    if elapsed > @connection_ttl_ms do
      Logger.debug("[SSE] Connection TTL reached for session #{session_id}")
      {:ok, conn} = Conn.chunk(conn, format_sse("message_end", "{}"))
      conn
    else
      receive do
        # ── PubSub events from the search session ──────────────────
        {:search_event, ^session_id, event} ->
          case format_search_event(event) do
            {:ok, sse_data} ->
              case Conn.chunk(conn, sse_data) do
                {:ok, conn} ->
                  if is_terminal_event?(event) do
                    Logger.debug("[SSE] Terminal event for session #{session_id}")
                    conn
                  else
                    stream_loop(conn, session_id, topic, started_at)
                  end

                {:error, :closed} ->
                  Logger.debug("[SSE] Client disconnected for session #{session_id}")
                  conn
              end

            :skip ->
              stream_loop(conn, session_id, topic, started_at)
          end

        # ── Client disconnect ─────────────────────────────────────
        {:socket_closed, _reason} ->
          Logger.debug("[SSE] Socket closed for session #{session_id}")
          Phoenix.PubSub.unsubscribe(Perplexica.PubSub, topic)
          conn

        # ── Keep-alive to prevent proxy timeout ───────────────────
      after
        # Send a keep-alive comment every 15 seconds to keep proxies
        # and load balancers from timing out the connection.
        # SSE spec: comment lines (starting with ':') are ignored by clients.
        15_000 ->
          case Conn.chunk(conn, ": keepalive\n\n") do
            {:ok, conn} ->
              stream_loop(conn, session_id, topic, started_at)

            {:error, :closed} ->
              Logger.debug("[SSE] Client disconnected for session #{session_id}")
              conn
          end
      end
    end
  end

  # ── Event Formatting ───────────────────────────────────────────────

  @doc """
  Format a search event as a spec-compliant SSE data frame.

  Returns {:ok, sse_string} for valid events, or :skip for events
  that shouldn't be forwarded to the client.
  """
  def format_search_event(event) do
    case event do
      {:block, block} ->
        json = Jason.encode!(%{type: "block", block: block})
        {:ok, format_sse("block", json)}

      {:update_block, block_id, patch} ->
        json = Jason.encode!(%{type: "update_block", block_id: block_id, patch: patch})
        {:ok, format_sse("update_block", json)}

      :research_complete ->
        json = Jason.encode!(%{type: "research_complete"})
        {:ok, format_sse("research_complete", json)}

      :message_end ->
        json = Jason.encode!(%{type: "message_end"})
        {:ok, format_sse("message_end", json)}

      {:error, message} ->
        json = Jason.encode!(%{type: "error", data: message})
        {:ok, format_sse("error", json)}

      _other ->
        # Unknown events are silently skipped
        :skip
    end
  end

  @doc """
  Format an SSE event with event type and data payload.
  Does NOT add 'id:' or 'retry:' — clients handle reconnection themselves
  via the xstate machine.
  """
  def format_sse(event_type, data) do
    lines =
      data
      |> String.split("\n")
      |> Enum.map(&"data: #{&1}")

    ["event: #{event_type}" | lines]
    |> Enum.join("\n")
    |> Kernel.<>("\n\n")
  end

  # ── Helpers ────────────────────────────────────────────────────────

  defp is_terminal_event?(:message_end), do: true
  defp is_terminal_event?({:error, _}), do: true
  defp is_terminal_event?(_), do: false
end
