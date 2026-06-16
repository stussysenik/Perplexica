# Tasks: Rewrite to Full-Stack Resilient Architecture

## Phase 0: Foundation (Week 1)

- [ ] **T01: Initialize monorepo structure**
  - Create root directory with `redwood/`, `phoenix/`, `zig/`, `openspec/` folders
  - Set up root `.gitignore`, README, CI workflow stubs
  - **Acceptance**: `ls` shows all top-level directories, git initialized

- [ ] **T02: Scaffold RedwoodJS app**
  - `yarn create redwood-app redwood` with TypeScript
  - Configure `redwood.toml` for Vercel deployment
  - Install core dependencies: Apollo, Tailwind, Radix UI, Lucide icons
  - **Acceptance**: `yarn rw dev` starts without errors, blank page renders

- [ ] **T03: Scaffold Phoenix app**
  - `mix phx.new phoenix --no-html --no-assets` (API-only)
  - Add dependencies: Absinthe, Hammer, Jason, HTTPoison, Sentry, PostHog
  - Configure for Railway deployment (Dockerfile, `runtime.exs`)
  - **Acceptance**: `mix phx.server` starts, `/health` returns 200

- [ ] **T04: Set up PostgreSQL schema**
  - Create Ecto migrations for all tables (chats, messages, search_sessions, config, model_providers, uploads, upload_chunks, users)
  - Enable pgvector extension for upload_chunks.embedding
  - Run `mix ecto.migrate` against local PostgreSQL
  - Sync Prisma schema with `prisma db pull`
  - **Acceptance**: All tables exist, Prisma can query them, Ecto can write to them

## Phase 1: Core Backend — AI Providers (Week 2)

- [ ] **T05: Implement ModelRegistry GenServer**
  - GenServer holding provider state (health, config, circuit breaker)
  - `load_chat_model/2` and `load_embedding_model/2` callbacks
  - Health check timer (60s interval)
  - **Acceptance**: GenServer starts under supervision, handles `:load_chat_model` calls

- [ ] **T06: Implement NIM provider module**
  - OpenAI-compatible chat completion API client
  - Streaming support via SSE parsing
  - Structured output (JSON mode) for classification
  - Models: Kimi K2 Instruct, Llama 3.3 70B, DeepSeek V3.2
  - Embedding support with `input_type` for NV EmbedQA
  - **Acceptance**: Can call NIM API, stream response, generate embeddings
  - **Depends on**: T05

- [ ] **T07: Implement GLM provider module**
  - Zhipu AI chat completion API client
  - Streaming + structured output support
  - Models: GLM-5.1 (coding plan), GLM-4.7-Flash (free)
  - **Acceptance**: Can call GLM API, stream response
  - **Depends on**: T05

- [ ] **T08: Implement provider failover logic**
  - Try NIM → catch 429/500/timeout → try GLM
  - Circuit breaker: 3 failures → 60s cooldown
  - Exponential backoff within provider
  - **Acceptance**: When NIM returns 429, GLM is called automatically; after 3 NIM failures, NIM is skipped for 60s
  - **Depends on**: T06, T07

## Phase 2: Core Backend — Search Pipeline (Week 3-4)

- [ ] **T09: Implement BraveSearch rate-limited client**
  - Hammer-based sliding window: 1 req/1.1s
  - Web search + news search endpoints
  - Response mapping to internal `Chunk` format
  - **Acceptance**: Brave API called with rate limiting, results parsed correctly

- [ ] **T10: Implement query classifier**
  - LLM structured output call with classification schema
  - Fields: skipSearch, personalSearch, academicSearch, discussionSearch, widget flags, standaloneFollowUp
  - **Acceptance**: Given a query, returns classification matching current TypeScript Zod schema
  - **Depends on**: T05

- [ ] **T11: Implement action registry + actions**
  - Registry module with `register/1`, `available_actions/1`, `execute_all/2`
  - Actions: web_search, scrape_url, academic_search, discussion_search, uploads_search, done
  - Each action has `enabled?/1` and `execute/2` callbacks
  - **Acceptance**: All 6 actions registered, can execute in parallel, results aggregated
  - **Depends on**: T09

- [ ] **T12: Implement researcher agentic loop**
  - Iteration-based loop with mode limits (speed:2, balanced:6, quality:25)
  - Per-iteration: LLM call with tools → collect tool calls → execute all → aggregate
  - Break conditions: empty tool calls or `done` action
  - Emits ResearchBlock with substeps
  - **Acceptance**: Given a query, runs correct number of iterations, collects search results
  - **Depends on**: T10, T11

- [ ] **T13: Implement widget executors**
  - Weather widget (Open-Meteo API)
  - Stock widget (Yahoo Finance)
  - Calculation widget (math expression evaluation)
  - Parallel execution during classification
  - **Acceptance**: Each widget returns correct data, all run in parallel

- [ ] **T14: Implement SearchSession GenServer**
  - GenServer managing full search lifecycle: classify → widgets + research → stream answer
  - Block emission via `Absinthe.Subscription.publish/3`
  - State checkpointing to PostgreSQL after each iteration
  - Crash recovery: on restart, load last checkpoint and resume
  - **Acceptance**: Full search completes end-to-end, blocks stream to subscriber, crash + restart resumes correctly
  - **Depends on**: T08, T12, T13

- [ ] **T15: Implement SearchSupervisor**
  - DynamicSupervisor for SearchSession processes
  - `start_search/1` creates new supervised GenServer
  - Automatic restart on crash (`:transient` restart strategy)
  - **Acceptance**: Supervisor starts sessions, crashed session restarts, other sessions unaffected
  - **Depends on**: T14

## Phase 3: Core Backend — Absinthe GraphQL (Week 4)

- [ ] **T16: Define Absinthe schema types**
  - Block types: TextBlock, SourceBlock, SuggestionBlock, WidgetBlock, ResearchBlock
  - Event types: BlockEvent, UpdateBlockEvent, ResearchCompleteEvent, MessageEndEvent, ErrorEvent
  - Chat/message types, provider types, config types
  - **Acceptance**: Schema compiles, introspection query returns all types

- [ ] **T17: Implement search subscription**
  - `subscription { searchUpdated(sessionId: ID!) { ... } }`
  - Triggers on GenServer block emissions
  - **Acceptance**: Client subscribes, receives block events in real-time during search
  - **Depends on**: T15, T16

- [ ] **T18: Implement queries and mutations**
  - Queries: chats, chat(id), messages(chatId), config, providers, providerModels
  - Mutations: startSearch, deleteChat, updateConfig, addProvider, removeProvider
  - **Acceptance**: All queries/mutations work via GraphQL playground
  - **Depends on**: T16

## Phase 4: File Uploads (Week 5)

- [ ] **T19: Implement file processor**
  - PDF text extraction (via Elixir PDF library)
  - DOCX text extraction
  - Plain text handling
  - Chunk splitting (512 chars, 128 overlap)
  - Embedding generation via NIM EmbedQA
  - Storage in upload_chunks with pgvector
  - **Acceptance**: Upload PDF, chunks stored with embeddings, vector similarity search works
  - **Depends on**: T04, T06

- [ ] **T20: Implement uploads_search action**
  - Vector similarity search over upload_chunks using pgvector
  - Reciprocal rank fusion for multi-query results
  - Top-K retrieval (default: 10)
  - **Acceptance**: Given file IDs and queries, returns relevant chunks ranked by similarity
  - **Depends on**: T19

## Phase 5: Frontend — RedwoodJS (Week 5-6)

- [ ] **T21: Set up Redwood auth (dbAuth)**
  - Password-based auth with bcrypt hashing
  - Login/logout pages
  - Protected routes via `<Private>` wrapper
  - **Acceptance**: Can login with password, protected pages redirect to login, session persists
  - **Depends on**: T04

- [ ] **T22: Implement ChatCell + chat UI**
  - `ChatCell` with Loading/Error/Empty/Success states
  - Message list with markdown rendering
  - Message input with auto-expand textarea
  - Source cards with collapsible extracted text
  - Widget rendering (weather, stock, calculation)
  - Research step display (ThinkBox equivalent)
  - **Acceptance**: Chat page renders, can view existing chats with all block types
  - **Depends on**: T16

- [ ] **T23: Implement search streaming via Apollo subscriptions**
  - Apollo Client subscription to `searchUpdated`
  - Real-time block rendering as events arrive
  - RFC-6902 patch application for incremental updates
  - Loading/error states during search
  - **Acceptance**: Type a query, see research steps stream in, then answer with sources
  - **Depends on**: T17, T22

- [ ] **T24: Implement DiscoverCell + discover page**
  - Topic-based news feed (tech, finance, art, sports, entertainment)
  - News card components (major + small variants)
  - Responsive grid layout
  - **Acceptance**: Discover page loads news by topic, cards display with thumbnails
  - **Depends on**: T09

- [ ] **T25: Implement LibraryCell + library page**
  - Chat history list with metadata
  - Delete chat functionality
  - Navigation to individual chats
  - **Acceptance**: Library shows all chats, can delete, can navigate to chat detail
  - **Depends on**: T18

- [ ] **T26: Implement settings page**
  - Model provider management (add/remove/configure)
  - Theme toggle (light/dark)
  - System instructions
  - Optimization mode selector
  - **Acceptance**: Can add NIM provider with API key, change theme, set instructions
  - **Depends on**: T18

- [ ] **T27: Port PWA configuration**
  - Manifest with icons (180, 192, 512)
  - Service worker for offline shell
  - Apple touch icon + meta tags
  - **Acceptance**: App installable as PWA on mobile, correct icons displayed

## Phase 6: Observability (Week 6)

- [ ] **T28: Integrate PostHog**
  - Frontend: `posthog-js` initialized in Redwood
  - Backend: `posthog-elixir` in Phoenix
  - Events: search_started, search_completed, search_failed, provider_failover, discover_viewed
  - **Acceptance**: Events appear in PostHog dashboard after performing searches

- [ ] **T29: Integrate Sentry**
  - Frontend: `@sentry/react` with error boundaries
  - Backend: `sentry` Elixir package with Plug integration
  - GenServer crash reporting
  - **Acceptance**: Intentional error appears in Sentry dashboard

- [ ] **T30: Phoenix Telemetry setup**
  - Telemetry events for: search duration, provider latency, GenServer count, DB query time
  - Custom reporter exporting to PostHog
  - **Acceptance**: Telemetry events fire during search, visible in PostHog

## Phase 7: Deployment (Week 7)

- [ ] **T31: Deploy Phoenix to Railway**
  - Dockerfile with Elixir release build
  - Railway service with PostgreSQL addon
  - Environment variables configured
  - Health check endpoint verified
  - **Acceptance**: Phoenix running on Railway, health check green, can connect to PostgreSQL

- [ ] **T32: Deploy RedwoodJS to Vercel**
  - Vercel project linked to monorepo `redwood/` directory
  - Environment variables: `PHOENIX_URL`, `DATABASE_URL`, auth secrets
  - Build succeeds, pages render
  - **Acceptance**: Vercel deployment live, can access login page, GraphQL queries work

- [ ] **T33: End-to-end integration test**
  - Login → search query → see streaming results → verify sources → check library
  - Discover page loads news
  - File upload → search over uploaded content
  - Provider failover (simulate NIM failure)
  - **Acceptance**: All flows work in production environment

## Phase 8: Zig HTML Parser (Stretch — Week 8+)

- [ ] **T34: Benchmark Phoenix HTML parsing**
  - Measure Floki parsing latency on 100 real web pages
  - Profile memory usage during concurrent scraping
  - **Acceptance**: Benchmark report with p50/p95/p99 latencies

- [ ] **T35: Implement Zig HTML parser (if needed)**
  - HTTP server accepting `POST /parse` with HTML body
  - Return extracted text content as JSON
  - Deploy as Railway sidecar
  - **Acceptance**: Zig parser is faster than Floki by >2x on p95, integrated with Phoenix scrape_url action
  - **Depends on**: T34 (only if benchmarks justify)

## Dependencies Graph

```
T01 → T02, T03
T03 → T04
T04 → T05, T19, T21
T05 → T06, T07, T10
T06 → T08, T19
T07 → T08
T08 → T14
T09 → T11, T24
T10 → T12
T11 → T12
T12 → T14
T13 → T14
T14 → T15
T15 → T17
T16 → T17, T18
T17 → T23
T18 → T25, T26
T19 → T20
T21 → T22
T22 → T23
T34 → T35
```

## Parallelization Opportunities

- **T02 + T03**: Scaffold Redwood and Phoenix simultaneously
- **T06 + T07**: NIM and GLM providers are independent
- **T09 + T10 + T13**: Search sources, classifier, and widgets are independent (all depend on T05)
- **T21 + T24 + T25 + T26**: Frontend pages can be built in parallel once schema types exist
- **T28 + T29 + T30**: Observability integrations are independent
- **T31 + T32**: Deploy both services in parallel
