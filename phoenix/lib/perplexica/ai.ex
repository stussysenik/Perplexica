defmodule Perplexica.AI do
  @moduledoc """
  Centralized AI product-engineering layer.

  This is the **single source of truth** for how the application talks to the
  language model when it synthesizes an answer for the user. Everything that
  used to be scattered across the search pipeline — which model to call, the
  system prompt, the response shape, and the generation parameters — lives
  here, in one file, on purpose.

  The Elixir backend has no Zod, but this module plays the same role a Zod
  schema would in a TypeScript codebase: it pins the *contract* of an answer
  (voice, length, citation style, output shape) in one place so the prompt
  stays consistent no matter which call site triggers a search.

  ## The answer contract — "ELI19, 8 sentences, wiki-flavored"

  Answers are written for a sharp nineteen-year-old: plain language, jargon
  defined in passing, never condescending. The voice is encyclopedic and
  neutral (wiki-flavored), the length is disciplined (about eight sentences),
  and every claim drawn from a source carries an inline `[n]` citation.

  ## Model

  All search modes use one max-quality model for answer synthesis. The model
  is verified live in the NIM catalog (see `priv/verify_model.exs`); changing
  it is a one-line edit here. The many-call research/classify steps keep the
  faster `NimProvider` default — only the single user-facing answer step pays
  for the flagship.
  """

  # Verified returning real completions against the live NIM catalog 2026-06-16.
  # `deepseek-ai/deepseek-v4-pro` is a flagship MoE — top answer quality at
  # sub-second synthesis latency on this NIM key.
  #
  # NOTE: the previous answer model `qwen/qwen3.5-397b-a17b` — and every other
  # qwen variant — stopped serving on this key on 2026-06-16. They are still
  # listed in `/v1/models` but every `/chat/completions` call hangs to the 120s
  # timeout, so the search would run and then fail with "Failed to generate
  # answer". The whole qwen family is down; this swap was mandatory.
  @answer_model "deepseek-ai/deepseek-v4-pro"

  # Documented fallback if the flagship is ever pulled from the catalog. Kept
  # in lock-step with NimProvider's @default_model so a single EOL can't take
  # answer generation down again (the 2026-05 kimi-k2 incident, and the
  # 2026-06 qwen hang). Now actually wired into the answer step in
  # `SearchSession`: when the primary errors or times out, generation retries
  # once on this model before surfacing an error to the user.
  @answer_fallback_model "meta/llama-3.3-70b-instruct"

  @answer_max_tokens 4096
  @answer_temperature 0.7

  @doc "Model used for user-facing answer synthesis (same for every mode)."
  def answer_model(_mode \\ nil), do: @answer_model

  @doc "Documented fallback model, used if the primary is unavailable."
  def answer_fallback_model, do: @answer_fallback_model

  @doc """
  Generation options for the answer step, passed straight to
  `Perplexica.Models.Registry.chat_completion/2`.
  """
  def answer_opts(mode \\ nil) do
    %{
      model: answer_model(mode),
      max_tokens: @answer_max_tokens,
      temperature: @answer_temperature
    }
  end

  @doc """
  Generation options for the answer step's fallback model — identical to
  `answer_opts/1` but pinned to `answer_fallback_model/0`. Used by the search
  session when the primary answer model errors or times out.
  """
  def answer_fallback_opts do
    %{
      model: answer_fallback_model(),
      max_tokens: @answer_max_tokens,
      temperature: @answer_temperature
    }
  end

  @doc """
  Build the answer system prompt.

  `context` is the pre-formatted `<source>` block built from search results;
  `custom_instructions` is the user's optional steering string ("None" when
  unset).
  """
  def answer_system_prompt(context, custom_instructions \\ "None") do
    """
    You are FYOA — Find Your Own Answer — an AI search assistant. Answer the
    user's query using ONLY the provided search results.

    User's custom instructions: #{custom_instructions}

    Voice & shape (the answer contract — follow it exactly):
    - Explain it like the reader is a sharp 19-year-old: plain, direct language,
      and briefly define any jargon you must use. Never condescend.
    - Write in a neutral, encyclopedic, wiki-flavored tone — factual and
      balanced, not chatty or salesy.
    - Keep it to about EIGHT sentences. Be complete but disciplined; do not pad.
    - Cite sources inline with [1], [2], … matching the order of the sources
      below. Every factual claim that comes from a source must carry a citation.
    - If sources conflict, say so in one sentence. If the sources don't answer
      the question, say that plainly rather than guessing.
    - Use light markdown (bold for key terms) only where it aids readability.

    Search results:
    #{context}
    """
  end
end
