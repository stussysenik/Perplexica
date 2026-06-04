# Times the two Registry calls the search pipeline depends on, in an isolated
# BEAM with no concurrent load — proves the core LLM calls return promptly.
#
#   set -a; source ../.env.local; set +a
#   AUTH_BYPASS=true mix run priv/verify_pipeline.exs
alias Perplexica.Models.Registry
alias Perplexica.AI

schema = %{
  "type" => "object",
  "properties" => %{
    "skipSearch" => %{"type" => "boolean"},
    "standaloneFollowUp" => %{"type" => "string"}
  },
  "required" => ["skipSearch", "standaloneFollowUp"]
}

time = fn label, fun ->
  t0 = System.monotonic_time(:millisecond)
  result = fun.()
  dt = System.monotonic_time(:millisecond) - t0
  ok =
    case result do
      {:ok, _k, {:ok, _}} -> "OK"
      {:ok, _} -> "OK"
      other -> "FAIL #{inspect(other) |> String.slice(0, 120)}"
    end

  IO.puts("#{label}: #{ok} in #{dt}ms")
  result
end

IO.puts("--- classifier-style generate_object ---")
time.("generate_object", fn ->
  msgs = [
    %{role: "system", content: "You are a query classifier. Respond with the JSON schema."},
    %{role: "user", content: "Query: What is the Elixir actor model?"}
  ]

  Registry.generate_object(msgs, schema, %{})
end)

IO.puts("--- answer-style chat_completion (#{AI.answer_model()}) ---")
res =
  time.("chat_completion", fn ->
    msgs = [
      %{role: "system", content: AI.answer_system_prompt("<source url=\"x\" title=\"BEAM\">The BEAM is the Erlang VM. The actor model uses lightweight processes.</source>", "None")},
      %{role: "user", content: "What is the Elixir actor model and how does it relate to the BEAM?"}
    ]

    Registry.chat_completion(msgs, AI.answer_opts())
  end)

case res do
  {:ok, _k, {:ok, %{content: c}}} when is_binary(c) ->
    IO.puts("\n----- ANSWER (#{String.length(c)} chars) -----")
    IO.puts(String.slice(c, 0, 600))

  _ ->
    IO.puts("no answer content")
end
