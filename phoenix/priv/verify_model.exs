# Proves the pipeline's default LLM call now returns a real answer instead of
# the 410 that opened the NIM circuit breaker. Calls the REAL provider code
# with NO :model override, so it exercises @default_model exactly as the
# Researcher / SearchSession do.
#
#   set -a; source ../.env.local; set +a
#   MIX_ENV=prod mix run priv/verify_model.exs

alias Perplexica.Models.NimProvider

api_key = System.get_env("NVIDIA_NIM_API_KEY")

if api_key in [nil, ""] do
  IO.puts("FAIL: NVIDIA_NIM_API_KEY not set in env")
  System.halt(1)
end

config = %{
  api_key: api_key,
  base_url: System.get_env("NVIDIA_NIM_BASE_URL") || "https://integrate.api.nvidia.com/v1"
}

messages = [
  %{role: "system", content: "You are a concise assistant."},
  %{role: "user", content: "In one short sentence: what is the capital of France?"}
]

# Run a few times to confirm it's stable, not a fluke.
results =
  for i <- 1..3 do
    case NimProvider.chat_completion(config, messages, %{max_tokens: 64, temperature: 0.2}) do
      {:ok, %{content: content}} when is_binary(content) and content != "" ->
        IO.puts("PASS run #{i}: #{String.trim(content)}")
        true

      {:ok, other} ->
        IO.puts("FAIL run #{i}: empty/unexpected ok -> #{inspect(other)}")
        false

      {:error, err} ->
        IO.puts("FAIL run #{i}: #{inspect(err)}")
        false
    end
  end

if Enum.all?(results) do
  IO.puts("\nDEFAULT MODEL OK — #{length(results)}/#{length(results)} real answers, no 410 ✓")
else
  System.halt(1)
end
