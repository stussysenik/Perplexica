defmodule Perplexica.Models.Registry do
  @moduledoc """
  GenServer managing AI model providers with automatic failover
  and circuit breaker protection.

  ## Supervision

  Started under the application supervisor. On init, loads providers
  from environment variables and the `model_providers` database table.

  ## Failover Strategy

  Providers are tried in order (NIM first, GLM second). On retryable
  errors (429, 500, 502, 503, timeout), the next provider is tried.
  Non-retryable errors (400, 401) are returned immediately.

  ## Circuit Breaker

  After 3 consecutive failures, a provider's circuit opens for 60 seconds.
  During this window, requests skip directly to the next provider.
  After 60s, the circuit enters half-open state — one request is allowed
  through. If it succeeds, the circuit closes. If it fails, it re-opens.

  ## Health Checks

  Every 60 seconds, a lightweight request is sent to each provider.
  Provider health is updated based on the result.
  """

  use GenServer
  require Logger

  alias Perplexica.Models.{HttpClient, NimProvider, GlmProvider}

  @circuit_breaker_threshold 3
  @circuit_breaker_cooldown_ms 60_000
  @health_check_interval_ms 60_000

  # ── Public API ─────────────────────────────────────────────────────

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @doc """
  Chat completion with automatic failover across providers.
  """
  def chat_completion(messages, opts \\ %{}) do
    GenServer.call(__MODULE__, {:chat_completion, messages, opts}, 150_000)
  end

  @doc """
  Streaming chat completion. Spawns a stream process and sends
  chunks to the caller as messages. Returns {:ok, ref} or {:error, reason}.
  """
  def stream_chat_completion(messages, opts \\ %{}) do
    GenServer.call(__MODULE__, {:stream_chat_completion, messages, opts, self()}, 150_000)
  end

  @doc """
  Generate a JSON object matching the given schema.
  """
  def generate_object(messages, json_schema, opts \\ %{}) do
    GenServer.call(__MODULE__, {:generate_object, messages, json_schema, opts}, 150_000)
  end

  @doc """
  Generate embeddings for text queries (uses 'query' input_type).
  No failover — only NIM supports embeddings.
  """
  def embed_text(texts, opts \\ %{}) do
    GenServer.call(__MODULE__, {:embed_text, texts, opts}, 60_000)
  end

  @doc """
  Generate embeddings for document chunks (uses 'passage' input_type).
  """
  def embed_chunks(chunks, opts \\ %{}) do
    GenServer.call(__MODULE__, {:embed_chunks, chunks, opts}, 60_000)
  end

  @doc "List all registered providers with their health status."
  def list_providers do
    GenServer.call(__MODULE__, :list_providers)
  end

  @doc "Add a provider at runtime."
  def add_provider(key, module, config) do
    GenServer.call(__MODULE__, {:add_provider, key, module, config})
  end

  @doc "Remove a provider at runtime."
  def remove_provider(key) do
    GenServer.call(__MODULE__, {:remove_provider, key})
  end

  # ── GenServer Callbacks ────────────────────────────────────────────

  @impl true
  def init(_opts) do
    state = %{
      providers: %{},
      provider_order: []
    }

    state = initialize_from_env(state)

    # Schedule periodic health checks
    Process.send_after(self(), :health_check, @health_check_interval_ms)

    Logger.info("[ModelRegistry] Started with providers: #{inspect(Map.keys(state.providers))}")
    {:ok, state}
  end

  @impl true
  def handle_call({:chat_completion, messages, opts}, _from, state) do
    result = try_providers(state, :chat_completion, [messages, opts])
    {:reply, result, update_state_from_result(state, result)}
  end

  @impl true
  def handle_call({:stream_chat_completion, messages, opts, caller_pid}, _from, state) do
    result = try_providers_stream(state, messages, opts, caller_pid)
    {:reply, result, update_state_from_result(state, result)}
  end

  @impl true
  def handle_call({:generate_object, messages, json_schema, opts}, _from, state) do
    result = try_providers(state, :generate_object, [messages, json_schema, opts])
    {:reply, result, update_state_from_result(state, result)}
  end

  @impl true
  def handle_call({:embed_text, texts, opts}, _from, state) do
    # Embeddings only supported by NIM — no failover
    case find_embedding_provider(state) do
      {:ok, key, provider} ->
        result = provider.module.embed_text(provider.config, texts, opts)

        state =
          case result do
            {:ok, _} -> record_success(state, key)
            {:error, _} -> record_failure(state, key)
          end

        {:reply, result, state}

      :error ->
        {:reply, {:error, %{reason: :no_embedding_provider}}, state}
    end
  end

  @impl true
  def handle_call({:embed_chunks, chunks, opts}, _from, state) do
    case find_embedding_provider(state) do
      {:ok, key, provider} ->
        result = provider.module.embed_chunks(provider.config, chunks, opts)

        state =
          case result do
            {:ok, _} -> record_success(state, key)
            {:error, _} -> record_failure(state, key)
          end

        {:reply, result, state}

      :error ->
        {:reply, {:error, %{reason: :no_embedding_provider}}, state}
    end
  end

  @impl true
  def handle_call(:list_providers, _from, state) do
    providers =
      Enum.map(state.providers, fn {key, p} ->
        %{
          key: key,
          module: p.module,
          health: p.health,
          failures: p.failures,
          circuit_open: p.circuit_open_at != nil
        }
      end)

    {:reply, providers, state}
  end

  @impl true
  def handle_call({:add_provider, key, module, config}, _from, state) do
    provider_entry = new_provider_entry(module, config)
    providers = Map.put(state.providers, key, provider_entry)

    order =
      if key in state.provider_order,
        do: state.provider_order,
        else: state.provider_order ++ [key]

    {:reply, :ok, %{state | providers: providers, provider_order: order}}
  end

  @impl true
  def handle_call({:remove_provider, key}, _from, state) do
    providers = Map.delete(state.providers, key)
    order = Enum.reject(state.provider_order, &(&1 == key))
    {:reply, :ok, %{state | providers: providers, provider_order: order}}
  end

  @impl true
  def handle_info(:health_check, state) do
    state = run_health_checks(state)
    Process.send_after(self(), :health_check, @health_check_interval_ms)
    {:noreply, state}
  end

  @impl true
  def handle_info(_msg, state), do: {:noreply, state}

  # ── Failover Logic ─────────────────────────────────────────────────

  defp try_providers(state, operation, args) do
    errors =
      Enum.reduce_while(state.provider_order, [], fn key, errors ->
        provider = state.providers[key]

        if provider && should_try?(provider) do
          result = apply(provider.module, operation, [provider.config | args])

          case result do
            {:ok, _} = success ->
              {:halt, {:success, key, success}}

            {:error, error} ->
              if HttpClient.retryable?(error) do
                Logger.warning("[ModelRegistry] #{key} failed (retryable): #{inspect(error.reason)}")
                {:cont, [{key, error} | errors]}
              else
                # Non-retryable error — return immediately
                {:halt, {:failure, key, {:error, error}}}
              end
          end
        else
          {:cont, errors}
        end
      end)

    case errors do
      {:success, key, result} -> {:ok, key, result}
      {:failure, key, result} -> {:error, key, result}
      error_list when is_list(error_list) ->
        if error_list == [] do
          {:error, nil, {:error, %{reason: :no_providers_available}}}
        else
          # All providers failed with retryable errors
          {last_key, last_error} = hd(error_list)
          {:error, last_key, {:error, last_error}}
        end
    end
  end

  defp try_providers_stream(state, messages, opts, caller_pid) do
    result =
      Enum.reduce_while(state.provider_order, :no_provider, fn key, _acc ->
        provider = state.providers[key]

        if provider && should_try?(provider) do
          # For streaming, we spawn a process to handle the stream
          stream_pid =
            spawn(fn ->
              provider.module.stream_chat_completion(provider.config, messages, opts, caller_pid)
            end)

          {:halt, {:ok, key, stream_pid}}
        else
          {:cont, :no_provider}
        end
      end)

    case result do
      {:ok, key, stream_pid} -> {:ok, key, {:ok, stream_pid}}
      :no_provider -> {:error, nil, {:error, %{reason: :no_providers_available}}}
    end
  end

  defp should_try?(provider) do
    case provider.circuit_open_at do
      nil ->
        true

      opened_at ->
        # Half-open: allow if cooldown has passed
        elapsed = System.monotonic_time(:millisecond) - opened_at
        elapsed >= @circuit_breaker_cooldown_ms
    end
  end

  # ── State Updates ──────────────────────────────────────────────────

  defp update_state_from_result(state, {:ok, key, _result}) when is_binary(key) do
    record_success(state, key)
  end

  defp update_state_from_result(state, {:error, key, _result}) when is_binary(key) do
    record_failure(state, key)
  end

  defp update_state_from_result(state, _), do: state

  defp record_success(state, key) do
    update_provider(state, key, fn p ->
      %{p | failures: 0, circuit_open_at: nil, health: :healthy}
    end)
  end

  defp record_failure(state, key) do
    update_provider(state, key, fn p ->
      new_failures = p.failures + 1

      if new_failures >= @circuit_breaker_threshold do
        Logger.warning(
          "[ModelRegistry] Circuit opened for #{key} after #{new_failures} failures"
        )

        %{p | failures: new_failures, circuit_open_at: System.monotonic_time(:millisecond), health: :down}
      else
        %{p | failures: new_failures, health: :degraded}
      end
    end)
  end

  defp update_provider(state, key, update_fn) do
    case state.providers[key] do
      nil -> state
      provider -> %{state | providers: Map.put(state.providers, key, update_fn.(provider))}
    end
  end

  # ── Initialization ─────────────────────────────────────────────────

  defp initialize_from_env(state) do
    state
    |> maybe_add_nim_from_env()
    |> maybe_add_glm_from_env()
  end

  defp maybe_add_nim_from_env(state) do
    case System.get_env("NVIDIA_NIM_API_KEY") do
      nil ->
        state

      "" ->
        state

      api_key ->
        base_url =
          System.get_env("NVIDIA_NIM_BASE_URL") || "https://integrate.api.nvidia.com/v1"

        config = %{api_key: api_key, base_url: base_url}
        entry = new_provider_entry(NimProvider, config)

        Logger.info("[ModelRegistry] Registered NIM provider from env")

        %{
          state
          | providers: Map.put(state.providers, "nim", entry),
            provider_order: state.provider_order ++ ["nim"]
        }
    end
  end

  defp maybe_add_glm_from_env(state) do
    case System.get_env("GLM_API_KEY") do
      nil ->
        state

      "" ->
        state

      api_key ->
        base_url =
          System.get_env("GLM_BASE_URL") || "https://open.bigmodel.cn/api/paas/v4"

        config = %{api_key: api_key, base_url: base_url}
        entry = new_provider_entry(GlmProvider, config)

        Logger.info("[ModelRegistry] Registered GLM provider from env")

        %{
          state
          | providers: Map.put(state.providers, "glm", entry),
            provider_order: state.provider_order ++ ["glm"]
        }
    end
  end

  defp new_provider_entry(module, config) do
    %{
      module: module,
      config: config,
      health: :healthy,
      failures: 0,
      circuit_open_at: nil
    }
  end

  # ── Health Checks ──────────────────────────────────────────────────

  defp run_health_checks(state) do
    Enum.reduce(state.providers, state, fn {key, provider}, acc ->
      case provider.module.health_check(provider.config) do
        :ok ->
          if provider.health != :healthy do
            Logger.info("[ModelRegistry] #{key} recovered — marking healthy")
          end

          update_provider(acc, key, fn p ->
            %{p | health: :healthy, failures: 0, circuit_open_at: nil}
          end)

        {:error, reason} ->
          Logger.warning("[ModelRegistry] #{key} health check failed: #{inspect(reason)}")

          update_provider(acc, key, fn p ->
            %{p | health: :degraded}
          end)
      end
    end)
  end

  # ── Embedding Provider Lookup ──────────────────────────────────────

  defp find_embedding_provider(state) do
    # NIM is the only provider with embeddings
    case state.providers["nim"] do
      nil -> :error
      provider -> {:ok, "nim", provider}
    end
  end
end
