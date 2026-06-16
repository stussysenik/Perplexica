# Tasks: Add a DSPy Answer-Synthesis Service

Ordered by phase. Each task is independently verifiable. `[blocked: OQ-n]` marks tasks
waiting on an open question in `design.md`. The Phoenix in-process path stays live the
whole time; the service is promoted only after the parity gate (Phase 1) passes.

## Phase 0 — Service skeleton

- [ ] 0.1 Scaffold `answer-service/` (FastAPI) with one POST endpoint accepting
  `{query, sources[], custom_instructions}` `[satisfies REQ-ANS-001]`
  - Verify: endpoint returns 200 with a stubbed answer shape locally
- [ ] 0.2 Define the DSPy `Signature` + `Module` mirroring the ELI19 contract (voice,
  ~8 sentences, wiki tone, inline `[n]`, answer only from sources) `[satisfies REQ-ANS-002]`
  - Verify: a unit test asserts the Signature fields match the contract inputs/outputs
- [ ] 0.3 Wire the provider chain NIM `qwen/qwen3.5-397b-a17b` → `meta/llama-3.3-70b-instruct`
  → GLM-5.1 (Modal), reusing existing keys `[satisfies REQ-ANS-003]`
  - Verify: a live call returns a real completion; killing the primary falls to the next

## Phase 1 — Parity gate

- [ ] 1.1 Assemble a held-out eval set of real queries + source bundles `[blocked: OQ-2]`
  - Verify: eval set committed under `answer-service/evals/`
- [ ] 1.2 Run both the current Phoenix path and the DSPy service over the eval set
  `[satisfies REQ-ANS-004]`
  - Verify: a comparison report (length band, citation presence/order, no outside facts)
- [ ] 1.3 Meet the parity metric before any cut-over `[satisfies REQ-ANS-004]`
  - Verify: every eval item passes the contract rule checks for the DSPy output

## Phase 2 — Phoenix integration (shadow)

- [ ] 2.1 Add an HTTP client in Phoenix to call the service for the answer step
  `[satisfies REQ-ANS-005]`
  - Verify: Phoenix obtains an answer from the service in a dev run
- [ ] 2.2 Add timeout + circuit breaker + **in-process fallback** to `Perplexica.AI`
  `[satisfies REQ-ANS-006]`
  - Verify: with the service stopped, answers still generate via the in-process path,
    and a fallback event is logged
- [ ] 2.3 Run in shadow (service called, output compared, Phoenix still answers) `[blocked: OQ-3]`
  - Verify: shadow comparison logged for a traffic window with no user-visible change

## Phase 3 — Promote

- [ ] 3.1 Make the service primary for the answer step (fallback still live) `[satisfies REQ-ANS-005, REQ-ANS-006]`
  - Verify: answers are served from the service; forced service outage transparently
    falls back in-process
- [ ] 3.2 Add the service to `docker-compose.yml`, sized for the existing box (no GPU)
  `[satisfies REQ-ANS-007]`
  - Verify: `docker compose up` starts the service alongside the stack

## Phase 4 — Optimize & trace

- [ ] 4.1 Run a DSPy optimizer against the eval set; commit the compiled program `[blocked: OQ-1]`
  - Verify: optimized program scores ≥ the un-optimized baseline on the eval metric
- [ ] 4.2 Add optional Langfuse/LangSmith tracing behind an env flag (off by default)
  `[blocked: OQ-4]` `[satisfies REQ-ANS-008]`
  - Verify: with the flag on, the answer call appears as a trace; with it off, no external
    calls are made

## Validation

- [ ] V.1 Service down → Phoenix answers unchanged (fallback proven)
- [ ] V.2 `$0`/self-host constraint held — no new paid provider or GPU requirement
- [ ] V.3 `openspec validate add-dspy-answer-service --strict --no-interactive` passes
