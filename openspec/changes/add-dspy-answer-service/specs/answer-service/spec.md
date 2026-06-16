# Answer Service

## Description

A standalone Python (FastAPI + DSPy) service that performs the single user-facing answer
synthesis step, encoding the existing `Perplexica.AI` answer contract as an optimizable
DSPy program. Phoenix calls it over HTTP but retains its in-process synthesis as a
mandatory fallback, so the service is strictly additive to reliability.

See: observability

## ADDED Requirements

### REQ-ANS-001: Single answer-synthesis endpoint

The service MUST expose one endpoint that takes a query, an ordered list of sources, and
optional custom instructions, and returns a synthesized answer.

#### Scenario: Endpoint returns a contract-shaped answer
**Given** a POST request with `{query, sources[], custom_instructions}`
**When** the service processes it
**Then** it returns an answer string plus the citation indices used
**And** malformed requests (missing query or sources) are rejected with a 4xx error

### REQ-ANS-002: The answer contract is preserved exactly

The synthesized answer MUST follow the same contract as the current `Perplexica.AI`
path: ELI19 plain language, neutral wiki-flavored tone, about eight sentences, inline
`[n]` citations matching source order, and answering only from the provided sources.

#### Scenario: Output obeys the contract
**Given** a query and a set of sources
**When** the service produces an answer
**Then** the answer is in the ~8-sentence band, uses inline `[n]` citations indexed to
the provided source order, and introduces no facts absent from the sources

#### Scenario: Insufficient sources are admitted, not fabricated
**Given** sources that do not answer the query
**When** the service produces an answer
**Then** it states plainly that the sources do not answer the question rather than
inventing an answer

### REQ-ANS-003: Provider chain reuses existing models with failover

The service MUST call NIM `qwen/qwen3.5-397b-a17b` as primary, fall back to
`meta/llama-3.3-70b-instruct`, and then to GLM-5.1 (Modal), using existing credentials,
without introducing a new paid provider.

#### Scenario: Primary model unavailable falls through the chain
**Given** the primary NIM model is unavailable
**When** the service synthesizes an answer
**Then** it transparently uses the next provider in the chain
**And** the provider actually used is recorded

### REQ-ANS-004: Parity gate before production cut-over

The DSPy service output MUST meet a defined parity metric against the current Phoenix
answer path before any production traffic is served from it.

#### Scenario: Cut-over is blocked until parity passes
**Given** a held-out eval set of real queries and source bundles
**When** both the current Phoenix path and the DSPy service are run over it
**Then** the DSPy output meets the contract rule checks (length band, citations present
and correctly ordered, no facts outside the sources) on every item
**And** until that holds, the service does not serve production answer traffic

### REQ-ANS-005: Phoenix integration over HTTP

Phoenix MUST be able to obtain the user-facing answer from the service over HTTP for the
answer step.

#### Scenario: Phoenix uses the service for synthesis
**Given** the service is healthy and configured
**When** the search pipeline reaches the answer step
**Then** Phoenix requests the answer from the service and returns it to the user

### REQ-ANS-006: Mandatory in-process fallback

Answer generation MUST NOT depend on the service being available; if the service is
unreachable, errors, or times out, Phoenix MUST fall back to its in-process
`Perplexica.AI` synthesis.

#### Scenario: Service outage degrades gracefully
**Given** the answer service is down or times out
**When** the search pipeline reaches the answer step
**Then** Phoenix generates the answer via its in-process path with the same contract
**And** the fallback event is logged, with no user-visible failure

### REQ-ANS-007: Fits the existing hardware at zero added cost

The service MUST run within the existing self-hosted infrastructure without requiring a
GPU or a larger instance, and MUST NOT add a paid dependency.

#### Scenario: Service runs as one more small container
**Given** the existing Docker host
**When** the stack is brought up with `docker compose`
**Then** the answer service starts alongside the other services without a GPU or an
instance upgrade

### REQ-ANS-008: Optional, free, self-hostable tracing

LLM tracing for the answer call MAY be enabled, but only via a free-tier or self-hostable
backend, behind an environment flag, off by default.

#### Scenario: Tracing is opt-in and free/self-hosted
**Given** the tracing flag is enabled
**When** the service synthesizes an answer
**Then** the call is recorded in the self-hostable/free tracing backend
**And** with the flag disabled, no external tracing calls are made
