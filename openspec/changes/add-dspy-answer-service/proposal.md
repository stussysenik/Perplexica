# Proposal: Add a DSPy Answer-Synthesis Service

> **STATUS: DEFERRED — future work, not active.** Intentionally deferred from
> `close-production-gaps` (Decision #8). The current in-process `Perplexica.AI` answer
> path works and stays the source of truth until this is picked up. No implementation has
> started (0/16). Do not begin without an explicit decision to prioritize it.

## Change ID
`add-dspy-answer-service`

## Status
Draft

## Motivation

Answer synthesis — the single most product-defining LLM call — currently lives inside
Phoenix in `Perplexica.AI` (`phoenix/lib/perplexica/ai.ex`). That module is already a
clean, centralized contract: "ELI19, ~8 sentences, wiki-flavored, inline `[n]`
citations, answer only from the provided sources," calling `qwen/qwen3.5-397b-a17b` over
NIM with a documented `meta/llama-3.3-70b-instruct` fallback. It works and it is the
right *contract*. What it cannot do is **improve itself**.

The answer prompt is a hand-written string. There is no way to compile it against
labeled examples, no structured signature, no systematic way to measure "did the answer
follow the contract" or to optimize the prompt as the model catalog changes. DSPy exists
exactly for this: express the answer as a typed **Signature** + **Module**, and let an
optimizer tune the prompt/demonstrations against a small eval set — instead of a human
re-guessing wording after every model EOL (the 2026-05 kimi-k2 incident is the cautionary
tale).

`close-production-gaps` Decision #8 deliberately deferred this so that change stayed
tight. This is that deferred work, now specified:

- Extract answer synthesis into a small **Python FastAPI + DSPy** service.
- Phoenix calls it over HTTP and keeps its current in-process `Perplexica.AI` path as a
  **graceful fallback**, so the box never loses answer generation if the service is down.
- Optional **free, self-hostable tracing** (Langfuse or LangSmith free tier) for the
  answer call, satisfying part of `close-production-gaps` REQ-OBS-002 (LLM visibility).

Constraint inherited from `VISION.md` and `close-production-gaps`: every dependency must
be **$0 or self-hostable** on the existing hardware. No managed orchestration platform
(Convex/LangChain were already rejected).

## Scope

**In scope:**

1. A standalone Python service (FastAPI) exposing a single answer-synthesis endpoint that
   takes `{query, sources[], custom_instructions}` and returns a contract-compliant
   answer with inline citations.
2. A DSPy `Signature` + `Module` encoding the existing ELI19 answer contract, calling
   NIM (`qwen/qwen3.5-397b-a17b`) primary with the documented fallback model, and GLM
   (Modal) as a secondary provider failover.
3. Phoenix integration: `Perplexica.AI` (or its call site) calls the service over HTTP,
   with a **circuit-breaking fallback** to the existing in-process synthesis if the
   service is unreachable, errors, or times out.
4. A small eval set + a DSPy optimization step that compiles the prompt/demonstrations,
   so the contract can be measured and improved rather than hand-edited.
5. Optional Langfuse/LangSmith free-tier tracing of the answer call, behind a flag.

**Out of scope:**

- Moving the *research/classify* multi-call steps out of Phoenix — only the single
  user-facing answer step is extracted. Those steps keep `NimProvider`.
- Replacing Phoenix's orchestration, GraphQL, persistence, or auth.
- Any new managed platform (Convex, LangChain) — explicitly rejected upstream.
- Training/fine-tuning a model — DSPy here optimizes prompts/demonstrations only.

## Approach (summary — full reasoning in `design.md`)

- **Contract first, parity second.** Port the exact `Perplexica.AI` contract into a DSPy
  Signature; prove output parity (voice, length, citations) against the current Phoenix
  output before cutting traffic over.
- **Fallback is mandatory, not optional.** The Python service is an *enhancement* of the
  answer path, never a new single point of failure. If it is down, Phoenix answers
  exactly as it does today. This is enforced by a timeout + circuit breaker.
- **Same models, same keys.** Reuse the existing NIM and GLM credentials/endpoints; the
  service does not introduce a new paid provider.
- **Self-host or free only.** FastAPI + DSPy run as one more small container in
  `docker-compose`; tracing uses a free tier or self-hosted Langfuse, behind a flag.

## Impact

### What changes
- New `answer-service/` (Python: FastAPI + DSPy) and a `docker-compose` service for it.
- `Perplexica.AI` / its call site gains an HTTP client + fallback to the in-process path.
- New env vars for the service URL, the existing NIM/GLM keys, and optional tracing keys.

### What's preserved
- The exact answer contract (ELI19 / ~8 sentences / wiki tone / inline citations / answer
  only from sources) and the primary + fallback models.
- Phoenix's ability to generate answers with the service absent (graceful degradation).
- The $0 / self-hostable hosting constraint.

### Risk
- A second LLM hop adds latency / a failure surface → mitigated by timeout + circuit
  breaker + in-process fallback, and by extracting only the single answer call.
- DSPy/prompt drift changes answer voice → mitigated by the parity eval gate before
  cut-over and the labeled eval set as a regression guard.
