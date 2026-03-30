# Observability

## Description

Monitoring, error tracking, and analytics across both RedwoodJS frontend and Phoenix backend. New capability not present in the current system.

See: streaming, search-pipeline

## ADDED Requirements

### REQ-OBS-001: PostHog Event Tracking

The system must send structured events to PostHog for product analytics.

#### Scenario: Search started event
**Given** a user submits a search query
**When** the search session begins
**Then** a `search_started` event is sent to PostHog with properties: query length, optimization mode, source types, has_files

#### Scenario: Search completed event
**Given** a search session finishes successfully
**When** the answer is fully streamed
**Then** a `search_completed` event is sent with properties: duration_ms, iteration_count, source_count, provider_used, block_count

#### Scenario: Provider failover event
**Given** the primary provider (NIM) fails and GLM is used
**When** the failover occurs
**Then** a `provider_failover` event is sent with properties: primary_error, secondary_provider, latency_ms

#### Scenario: Frontend page view tracking
**Given** a user navigates to the discover page
**When** the page loads
**Then** a `$pageview` event is captured with the page path

### REQ-OBS-002: Sentry Error Tracking

The system must report errors to Sentry for debugging.

#### Scenario: Frontend React error
**Given** a React component throws during rendering
**When** the error boundary catches it
**Then** the error is reported to Sentry with component stack trace and user context

#### Scenario: Backend GenServer crash
**Given** a SearchSession GenServer crashes
**When** the supervisor receives the exit signal
**Then** the crash is reported to Sentry with GenServer state, stack trace, and session metadata

#### Scenario: API error response
**Given** a Phoenix resolver encounters an unexpected error
**When** the error is caught by the Absinthe middleware
**Then** the error is reported to Sentry with request context (query, variables)

### REQ-OBS-003: Phoenix Telemetry

The system must emit telemetry events for internal performance monitoring.

#### Scenario: Search duration metric
**Given** a search session completes
**When** the duration is measured
**Then** a `[:perplexica, :search, :complete]` telemetry event fires with `duration` measurement

#### Scenario: Provider latency metric
**Given** an AI provider call completes
**When** the response time is measured
**Then** a `[:perplexica, :provider, :request]` telemetry event fires with `latency` and `provider` metadata

#### Scenario: Active session gauge
**Given** the telemetry reporter polls every 10 seconds
**When** there are 3 active SearchSession GenServers
**Then** a `[:perplexica, :sessions, :active]` telemetry event fires with `count: 3`

#### Scenario: Database query timing
**Given** an Ecto query executes
**When** it completes
**Then** the standard `[:perplexica, :repo, :query]` telemetry event fires with query duration

### REQ-OBS-004: Health Check Endpoint

The Phoenix backend must expose a health check endpoint for Railway monitoring.

#### Scenario: Healthy system
**Given** the Phoenix app is running with database connected
**When** `GET /health` is called
**Then** it returns `200 OK` with `{"status": "ok", "db": "connected", "sessions": <count>}`

#### Scenario: Database disconnected
**Given** the PostgreSQL connection is lost
**When** `GET /health` is called
**Then** it returns `503 Service Unavailable` with `{"status": "degraded", "db": "disconnected"}`
