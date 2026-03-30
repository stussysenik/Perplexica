defmodule Perplexica.Search.Supervisor do
  @moduledoc """
  DynamicSupervisor for SearchSession GenServers.

  Each active search runs as a supervised child process.
  If a session crashes, the supervisor handles cleanup.
  Other sessions are unaffected (crash isolation).
  """

  use DynamicSupervisor

  def start_link(init_arg) do
    DynamicSupervisor.start_link(__MODULE__, init_arg, name: __MODULE__)
  end

  @impl true
  def init(_init_arg) do
    DynamicSupervisor.init(strategy: :one_for_one)
  end

  @doc """
  Start a new search session. Returns `{:ok, pid, session_id}`.
  """
  def start_search(opts) do
    session_id = opts[:session_id] || Ecto.UUID.generate()
    opts = Keyword.put(opts, :session_id, session_id)

    case DynamicSupervisor.start_child(__MODULE__, {Perplexica.Search.Session, opts}) do
      {:ok, pid} -> {:ok, pid, session_id}
      {:error, reason} -> {:error, reason}
    end
  end

  @doc "Count active search sessions."
  def active_count do
    DynamicSupervisor.count_children(__MODULE__).active
  end
end
