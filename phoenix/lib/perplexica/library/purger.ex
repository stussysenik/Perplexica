defmodule Perplexica.Library.Purger do
  @moduledoc """
  Background GenServer that hard-deletes trashed chats older than 30 days.

  Runs `Perplexica.Library.purge_expired_trash/0` once per day, plus once
  immediately on boot so a restart doesn't skip the window. Idempotent —
  if nothing has expired, the call is a cheap no-op SQL query with a
  `WHERE trashed_at < cutoff` filter that matches nothing.

  Chosen over an Oban/Quantum schedule because the only recurring job
  this app has today is this one, and a plain Task would not survive
  crashes. A GenServer with `Process.send_after/3` is ~30 lines and
  needs no new dependencies.
  """

  use GenServer
  require Logger

  @one_day_ms 24 * 60 * 60 * 1_000

  # ── Public API ────────────────────────────────────────────────────

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  # ── GenServer callbacks ───────────────────────────────────────────

  @impl true
  def init(_opts) do
    # Fire once on boot so a midnight restart still runs today's purge,
    # then schedule the next tick 24h out. We send a message to self
    # rather than calling purge/0 inline so init stays non-blocking.
    send(self(), :purge)
    {:ok, %{}}
  end

  @impl true
  def handle_info(:purge, state) do
    try do
      count = Perplexica.Library.purge_expired_trash()

      if count > 0 do
        Logger.info("[Library.Purger] Hard-deleted #{count} expired trashed chat(s)")
      end
    rescue
      e ->
        # A purge failure must not kill the GenServer — the next tick
        # will retry. Log the crash so a persistent failure is visible.
        Logger.error("[Library.Purger] purge crashed: #{Exception.message(e)}")
    end

    Process.send_after(self(), :purge, @one_day_ms)
    {:noreply, state}
  end

  # Accept unknown messages so a stray send/2 doesn't crash the server.
  @impl true
  def handle_info(_msg, state), do: {:noreply, state}
end
