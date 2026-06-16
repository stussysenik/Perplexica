# Observability

## Description

Minimal, free-tier / self-hostable visibility into errors and the LLM path so failures
and runaway cost are detectable in production. Complements (does not replace) the
Sentry/PostHog/Phoenix Telemetry described in `rewrite-fullstack-resilient`.

See: security, data-durability

## ADDED Requirements

### REQ-OBS-001: Error tracking is confirmed working

Production errors MUST surface to an error tracker, verified by a real signal — not
assumed from configuration.

#### Scenario: A test error appears in the tracker
**Given** the production deployment with error tracking configured
**When** a deliberate test error is raised
**Then** it appears in the error tracker with environment and stack context

### REQ-OBS-002: LLM cost and failure visibility

Calls to LLM providers (NIM/GLM) and paid search APIs MUST be observable for failures
and volume, using a $0 or self-hostable mechanism (no Convex/LangChain dependency).

#### Scenario: Provider failures and fallbacks are visible
**Given** the answer pipeline calling NIM with GLM fallback
**When** a provider call fails and triggers fallback
**Then** the failure and the fallback are recorded (logs/metrics/traces) with enough
detail to diagnose, without logging secrets

#### Scenario: Request volume is countable
**Given** production traffic over a period
**When** LLM/search usage is reviewed
**Then** request counts per provider are available to detect abuse or runaway cost
