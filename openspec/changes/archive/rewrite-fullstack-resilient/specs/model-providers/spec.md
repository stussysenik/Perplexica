# Model Providers

## Description

AI model provider management with NVIDIA NIM as primary and Zhipu GLM as failover. Replaces `src/lib/models/registry.ts` and `src/lib/models/providers/` with a Phoenix GenServer-based registry supporting health monitoring and automatic failover.

See: search-pipeline, streaming

## ADDED Requirements

### REQ-MODEL-001: ModelRegistry GenServer

A GenServer must manage all configured AI providers, their health state, and model loading.

#### Scenario: Registry initialization
**Given** the application starts with `NVIDIA_NIM_API_KEY` and `GLM_API_KEY` environment variables set
**When** the ModelRegistry GenServer starts
**Then** both NIM and GLM providers are registered with health status "healthy"

#### Scenario: Loading a chat model
**Given** the ModelRegistry has NIM provider registered
**When** `load_chat_model("nim", "kimi-k2-instruct")` is called
**Then** an API client configured for NIM's Kimi K2 Instruct model is returned

#### Scenario: Loading an embedding model
**Given** the ModelRegistry has NIM provider registered
**When** `load_embedding_model("nim", "nv-embedqa-e5-v5")` is called
**Then** an embedding client configured for NV EmbedQA with asymmetric `input_type` support is returned

### REQ-MODEL-002: NIM Provider (OpenAI-Compatible)

The NIM provider must support chat completions, streaming, structured output, and embeddings via the OpenAI-compatible API.

#### Scenario: Chat completion
**Given** a configured NIM provider with Kimi K2 Instruct
**When** a chat completion request is made with messages and max_tokens
**Then** a complete response is returned with content

#### Scenario: Streaming chat completion
**Given** a configured NIM provider
**When** a streaming chat completion request is made
**Then** response chunks are yielded as they arrive, each with delta content

#### Scenario: Structured output for classification
**Given** a configured NIM provider
**When** a chat completion request includes JSON mode or function calling
**Then** the response is valid JSON matching the requested schema

#### Scenario: Embedding generation
**Given** a configured NIM provider with NV EmbedQA
**When** `embed_text(["hello world"], input_type: "query")` is called
**Then** a 1024-dimensional embedding vector is returned

#### Scenario: Request timeout
**Given** a NIM API call takes longer than 120 seconds
**When** the timeout fires
**Then** the request is cancelled and an error is returned to the caller

### REQ-MODEL-003: GLM Provider

The GLM provider must support chat completions and streaming via Zhipu AI's API.

#### Scenario: Chat completion with GLM-5.1
**Given** a configured GLM provider with coding plan subscription
**When** a chat completion request is made
**Then** the response uses GLM-5.1 model

#### Scenario: Free tier fallback
**Given** the GLM coding plan has insufficient balance
**When** the GLM provider detects a balance error
**Then** it automatically falls back to GLM-4.7-Flash (free tier)

### REQ-MODEL-004: Automatic Failover

The system must automatically fail over from the primary provider (NIM) to the secondary (GLM) on errors.

#### Scenario: Failover on HTTP 429
**Given** NIM returns a 429 (rate limited) response
**When** the ModelRegistry processes the error
**Then** the same request is retried with the GLM provider

#### Scenario: Failover on HTTP 500
**Given** NIM returns a 500 (server error) response
**When** the ModelRegistry processes the error
**Then** the same request is retried with the GLM provider

#### Scenario: Failover on timeout
**Given** NIM times out (120s)
**When** the ModelRegistry processes the timeout
**Then** the same request is retried with the GLM provider

#### Scenario: Both providers fail
**Given** both NIM and GLM return errors
**When** the ModelRegistry has exhausted all providers
**Then** the error is propagated to the caller with details from both failures

### REQ-MODEL-005: Circuit Breaker

The ModelRegistry must implement circuit breaker logic to avoid hammering failing providers.

#### Scenario: Circuit opens after 3 failures
**Given** NIM has failed 3 consecutive times
**When** a new request arrives
**Then** NIM is skipped (circuit open) and the request goes directly to GLM

#### Scenario: Circuit recovery after cooldown
**Given** NIM's circuit has been open for 60 seconds
**When** a new request arrives
**Then** NIM is tried first (circuit half-open), and if successful, the circuit closes

#### Scenario: Health check ping
**Given** the ModelRegistry's 60-second health check timer fires
**When** a lightweight test request is sent to each provider
**Then** provider health status is updated (healthy/degraded/down)

### REQ-MODEL-006: Provider Configuration from Database

Model provider configurations must be stored in PostgreSQL and editable via the API.

#### Scenario: Adding a new provider
**Given** a user adds a new NIM provider via the settings page
**When** the provider config (API key, base URL) is submitted
**Then** the provider is stored in `model_providers` table and registered in the ModelRegistry GenServer

#### Scenario: Removing a provider
**Given** a user removes a provider via the settings page
**When** the delete request is processed
**Then** the provider is removed from both the database and the ModelRegistry GenServer

#### Scenario: Environment variable initialization
**Given** `NVIDIA_NIM_API_KEY` is set as an environment variable
**When** the application starts and no NIM provider exists in the database
**Then** a NIM provider is automatically created from the environment variable
