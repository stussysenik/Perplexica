# Perplexica — Development Progress

## Project Goal

AI-powered search engine with source traceability, rewritten from Next.js to a resilient multi-service architecture: RedwoodJS (frontend) + Elixir/Phoenix (backend) + PostgreSQL + NVIDIA NIM.

---

## Completed Work

### Phase 1-7: Original Next.js Implementation (Replit)

- Forked Perplexica codebase, adapted for Replit (no Docker)
- NVIDIA NIM integration with 6 models
- Brave Search API proxy with rate limiting
- Source traceability (collapsible extracted text)
- Password auth (HMAC-SHA256)
- Weather widget, PWA support
- **Known issue**: Replit deployment auto-dies (process sleeping, build timeouts)

### Phase 8: Full-Stack Rewrite — RedwoodJS + Elixir/Phoenix

#### 8.0: Foundation
- Monorepo structure: `phoenix/`, `redwood/`, `zig/`, `openspec/`
- RedwoodJS 8.9 scaffolded with TypeScript, Tailwind, Radix UI, Lucide icons
- Phoenix 1.8 scaffolded (API-only) with Absinthe, Hammer, Sentry, pgvector
- Zig 0.15 placeholder (builds and runs)
- PostgreSQL 17 with 9 tables + pgvector 0.8 extension
- Prisma synced from Ecto migrations (dual ORM)

#### 8.1: AI Provider System
- `ModelRegistry` GenServer with supervision
- NVIDIA NIM provider: chat completions, streaming (SSE), structured output (JSON injection), embeddings (1024-dim, asymmetric input_type)
- Zhipu GLM provider: chat completions, streaming, balance error fallback to free tier
- Automatic failover: NIM → GLM on 429/500/timeout
- Circuit breaker: 3 failures → 60s cooldown → half-open recovery
- Health check timer (60s interval)

#### 8.2: Search Pipeline
- Brave Search client with Hammer v7 rate limiting (1 req/1.1s)
- Web search, news search, URL scraping, discover news (topic-based)
- Query classifier via LLM structured output
- Action registry: web_search, academic_search, discussion_search, scrape_url, done
- Agentic researcher loop: speed (2 iter), balanced (6), quality (25)
- Parallel action execution with Task.async_stream

#### 8.3: Search Session Management
- `SearchSession` GenServer (one per active search, supervised)
- `SearchSupervisor` DynamicSupervisor for crash isolation
- Block emission via Phoenix.PubSub: research, source, text, widget blocks
- Message persistence to PostgreSQL (status lifecycle: answering → completed | error)
- 30-minute TTL cleanup

#### 8.4: GraphQL API (Absinthe)
- Schema: queries (chats, chat, messages, providers, discover, health)
- Mutations: startSearch, deleteChat
- Subscriptions: searchUpdated (WebSocket via Absinthe.Phoenix)
- Resolvers: search, chat, provider
- CORS enabled for cross-origin requests
- GraphiQL playground at `/api/graphiql`
- Health endpoint at `/health` (Railway monitoring)

#### 8.5: Redwood Frontend
- `HomePage` with search input, mode selector (speed/balanced/quality), suggestion cards
- `MessageBox` with Perplexity-style citation badges [1][2], markdown rendering
- `Sources` component: numbered cards, favicons, domain names, collapsible extracted text
- `DiscoverPage`: topic pills, news article grid with thumbnails
- `LibraryPage`: chat history list with delete, relative timestamps
- `AppLayout`: sidebar navigation (Search, Discover, Library), light/dark toggle
- `useSearch` hook: query → Phoenix GraphQL → poll for results → render
- `ThemeProvider`: localStorage persistence, system preference detection
- Tailwind CSS with Typography plugin, Montserrat font
- Light mode: warm stone tones (#FAFAF9 bg, cyan accents)
- Dark mode: deep stone (#0C0A09 bg, cyan-300 accents)

#### 8.6: Deployment Configuration
- Phoenix Dockerfile (multi-stage: builder → runner, Debian bookworm)
- `railway.json` with health check config
- `rel/overlays/bin/server` and `bin/migrate` release scripts
- `vercel.json` for Redwood deployment
- Node 20 pinned via mise for Redwood compatibility

---

## Test Results (All Passing)

| Component | Status | Details |
|-----------|--------|---------|
| Health check | PASS | `{"status":"ok","db":"connected"}` |
| GraphQL providers | PASS | NIM: 6 chat + 1 embedding model, healthy |
| Brave Web Search | PASS | 5 results for test query |
| NIM Chat Completion | PASS | Correct response, 2 tokens |
| NIM Embeddings | PASS | 2 x 1024-dim vectors |
| Query Classifier | PASS | Weather widget detected, query reformulated |
| Full E2E Pipeline | PASS | 14 sources → cited answer → DB persist |
| 3 Concurrent Searches | PASS | All completed, no interference |
| Discover (3 topics) | PASS | Tech: 5, Sports: 5 articles |
| Library CRUD | PASS | List, read, delete chats |
| CORS | PASS | Redwood → Phoenix cross-origin |
| Phoenix prod compile | PASS | 0 warnings |
| Redwood dev server | PASS | Serves on :8910 |

---

## Environment Variables

| Variable | Service | Required | Description |
|----------|---------|----------|-------------|
| `NVIDIA_NIM_API_KEY` | Phoenix | Yes | NVIDIA NIM API key |
| `BRAVE_SEARCH_API_KEY` | Phoenix | Yes | Brave Search API key |
| `GLM_API_KEY` | Phoenix | Optional | Zhipu AI GLM API key (failover) |
| `DATABASE_URL` | Both | Prod only | PostgreSQL connection string |
| `SECRET_KEY_BASE` | Phoenix | Prod only | Phoenix session signing |
| `PHX_HOST` | Phoenix | Prod only | Production hostname |
| `PHX_SERVER` | Phoenix | Prod only | Set to `true` for release |
| `PHOENIX_URL` | Redwood | Yes | Phoenix backend URL |

---

## Remaining Work

| Item | Priority | Notes |
|------|----------|-------|
| File upload processing | Medium | PDF/DOCX/TXT → pgvector chunks |
| WebSocket streaming | Medium | Replace polling with Absinthe subscriptions |
| PostHog + Sentry | Low | Observability integration |
| Zig HTML parser | Low | Benchmark Floki first, only if needed |
| PWA manifest | Low | Icons, service worker in Redwood |
| dbAuth | Low | Redwood auth integration |
