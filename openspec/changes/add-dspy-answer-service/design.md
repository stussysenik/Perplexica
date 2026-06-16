# Design: DSPy Answer-Synthesis Service

## Context

`Perplexica.AI` already centralizes the answer contract, but it is a static string prompt
with no way to measure or optimize itself. DSPy turns that contract into a typed,
compilable program. The risk is regression (answer voice drift) and a new failure
surface (a second network hop on the most important call). The whole design is built to
neutralize both: parity-gate before cut-over, and a mandatory in-process fallback so the
service can never take answer generation down.

## Evidence (current state, read 2026-06-16)

| Fact | Value | Source |
|---|---|---|
| Answer model (primary) | `qwen/qwen3.5-397b-a17b` (397B MoE) over NIM | `phoenix/lib/perplexica/ai.ex:35` |
| Answer fallback model | `meta/llama-3.3-70b-instruct` | `ai.ex:40` |
| Gen params | `max_tokens 4096`, `temperature 0.7` | `ai.ex:42-43` |
| Contract | ELI19, ~8 sentences, wiki tone, inline `[n]`, answer only from sources | `ai.ex:70-92` |
| Call path | `Registry.chat_completion/2` from the search session | `ai.ex:55-61` |
| Secondary provider available | GLM-5.1 (Modal) — `GLM_MODAL_KEY` | global agent config |
| Upstream decision | DSPy + LLM tracing deferred from `close-production-gaps` (Decision #8) | that change |

## Decisions

1. **Extract only the answer step.** The many-call research/classify steps stay in
   Phoenix on `NimProvider`. Only the single, flagship, user-facing synthesis call moves,
   keeping the blast radius and added latency minimal.
2. **DSPy Signature mirrors the contract exactly.** Inputs: `query`, `sources` (ordered,
   for `[n]` citation indexing), `custom_instructions`. Output: a contract-compliant
   answer string. The voice/length/citation rules become the Signature instructions, not
   a free-form string, so they are inspectable and optimizable.
3. **Provider chain reuses existing creds.** NIM `qwen/qwen3.5-397b-a17b` → NIM
   `meta/llama-3.3-70b-instruct` → GLM-5.1 (Modal). No new paid provider. Same EOL-hedge
   logic the kimi-k2 incident taught.
4. **Mandatory in-process fallback.** Phoenix wraps the HTTP call in a timeout + circuit
   breaker; on unreachable/error/timeout it calls the existing `Perplexica.AI`
   in-process path. The service is strictly additive to reliability, never subtractive.
5. **Parity gate before cut-over.** A held-out set of real queries is run through both the
   current Phoenix path and the DSPy service; answers must match on the measurable
   contract dimensions (length band, citation presence/order, "no outside facts") before
   any production traffic uses the service.
6. **Optimize prompts, not weights.** DSPy compiles demonstrations / instruction wording
   against a small labeled eval set. No fine-tuning, no training infra.
7. **Tracing is free/self-host and flagged.** Optional Langfuse (self-hostable) or
   LangSmith free tier, enabled by env flag; off by default; satisfies part of
   `close-production-gaps` REQ-OBS-002 when on.
8. **One more small container.** The service ships as a `docker-compose` service sized to
   fit the existing box; it must not require a GPU or a larger instance.

## Open questions (resolve during apply)

- **OQ-1 (DSPy optimizer):** Which DSPy optimizer fits a tiny eval set — `BootstrapFewShot`
  (simple, few examples) vs `MIPROv2` (stronger, needs more)? Default: start with
  `BootstrapFewShot`, revisit if the eval set grows.
- **OQ-2 (eval metric):** What is the automated parity/quality metric — rule checks
  (sentence count band, every claim cited, no URL outside sources) vs an LLM-judge?
  Default: rule checks first (deterministic, $0), LLM-judge only if rules prove too blunt.
- **OQ-3 (cut-over strategy):** Shadow-only first (service runs, output logged/compared,
  Phoenix still answers) → then primary-with-fallback? Default: yes, shadow then promote.
- **OQ-4 (tracing backend):** Self-hosted Langfuse container vs LangSmith free tier?
  Default: Langfuse self-host (keeps data on owned infra, consistent with VISION).

## Phased plan (maps to `tasks.md`)

- **Phase 0 — Service skeleton.** FastAPI app + DSPy Signature/Module mirroring the
  contract; NIM/GLM provider chain; local smoke test returns a contract-shaped answer.
- **Phase 1 — Parity.** Build the eval set; run both paths; meet the parity metric.
- **Phase 2 — Phoenix integration (shadow).** HTTP client + timeout + circuit breaker +
  in-process fallback; run in shadow, compare outputs.
- **Phase 3 — Promote.** Make the service primary for the answer step with fallback live;
  add the `docker-compose` service.
- **Phase 4 — Optimize & trace.** Run the DSPy optimizer against the eval set; enable
  optional Langfuse/LangSmith tracing behind a flag.

## Relationship to other changes

- Depends on `consolidate-monorepo` landing first (clean tree to add a new service into).
- Implements the deferred half of `close-production-gaps` Decision #8 and contributes to
  its REQ-OBS-002 (LLM cost/trace visibility). Does not touch its security/durability work.
