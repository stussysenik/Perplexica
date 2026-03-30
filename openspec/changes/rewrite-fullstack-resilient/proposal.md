# Proposal: Rewrite to Full-Stack Resilient Architecture

## Change ID
`rewrite-fullstack-resilient`

## Status
Draft

## Motivation

Perplexica runs on Replit as a Next.js dev server because `next build` times out. The Replit deployment auto-dies due to process sleeping, losing all in-memory search sessions. There is no crash recovery, no observability, and no process isolation. The system needs to be rebuilt on infrastructure that stays up permanently.

Secondary motivation: learn Elixir and Zig while building something production-grade. The architecture should teach patterns (supervision trees, GenServers, Cells) while delivering reliability.

## Scope

**Full rewrite** of the entire application across three services:

| Service | Stack | Hosting | Cost |
|---------|-------|---------|------|
| Frontend + API proxy | RedwoodJS 8 | Vercel free tier | $0 |
| Core backend | Elixir/Phoenix | Railway Hobby | ~$8-15/mo |
| HTML parser (stretch) | Zig binary | Railway (same) | Included |

**In scope:**
- All existing features: search, chat, discover, library, widgets, file uploads, auth
- New: crash-resilient sessions (GenServer supervision), dual AI failover (NIM + GLM), observability (PostHog + Sentry), PostgreSQL persistence

**Out of scope (for now):**
- WolframAlpha integration
- Multi-user/team features
- Self-hosted SearxNG (keeping Brave Search API)

## Approach: "Full Stack Learning" (Approach B)

### RedwoodJS on Vercel
- **Why RedwoodJS**: Cells pattern (Loading/Error/Empty/Success), conventions-over-config, GraphQL-first, Prisma ORM, monorepo structure
- **Role**: Frontend rendering, GraphQL API layer (proxy to Phoenix), auth (dbAuth), static pages
- **Streaming**: Apollo Client subscribes to Phoenix Absinthe GraphQL subscriptions via WebSocket

### Phoenix on Railway
- **Why Phoenix**: Supervision trees for crash recovery, GenServer-per-search for session isolation, Absinthe for type-safe GraphQL subscriptions, Hammer for rate limiting, Phoenix Telemetry for observability
- **Role**: Search pipeline orchestration, AI provider management, search session lifecycle, Brave Search rate limiting, file processing
- **Key pattern**: Each search session is a supervised GenServer process — if it crashes, the supervisor restarts it with state recovery from PostgreSQL checkpoints

### Zig (Stretch Goal)
- **Why Zig**: Zero-overhead HTML parsing for scrape_url hot-path, compiles to native binary
- **When**: After benchmarking Phoenix's built-in HTML parsing. Only if parsing is a measurable bottleneck.
- **Integration**: Standalone HTTP service or Erlang NIF

### NVIDIA NIM + Zhipu GLM
- **Primary**: NVIDIA NIM (Kimi K2 Instruct, Llama 3.3 70B, DeepSeek V3.2, etc.)
- **Failover**: Zhipu GLM (GLM-5.1/GLM-5 via coding plan, GLM-4.7-Flash free tier)
- **Strategy**: Try NIM first, fall back to GLM on 429/500/timeout errors

### PostgreSQL on Railway
- Replaces SQLite + file-based config
- Stores: chats, messages, response blocks, config, file upload metadata + embeddings
- Managed by Prisma (Redwood side) and Ecto (Phoenix side) with shared schema

### Observability
- **PostHog** (free: 1M events): Search analytics, feature usage, funnel tracking
- **Sentry** (free: 5K errors): Error tracking, performance monitoring
- **Phoenix Telemetry**: Internal metrics, GenServer health, search latency

## Impact

### What Changes
- Every file in `src/` is replaced by RedwoodJS + Phoenix equivalents
- SQLite/Drizzle replaced by PostgreSQL/Prisma+Ecto
- In-memory sessions replaced by supervised GenServers
- SearxNG proxy replaced by Phoenix GenServer with Hammer rate limiting
- NDJSON streaming replaced by Absinthe GraphQL subscriptions

### What's Preserved
- Block/patch streaming protocol (TextBlock, SourceBlock, etc. with RFC-6902 patches)
- Agentic research loop (classify → research → answer)
- Action registry pattern (web_search, scrape_url, academic_search, etc.)
- Mode-based iteration limits (speed: 2, balanced: 6, quality: 25)
- Source traceability (extracted text per source)
- All widget types (weather, stock, calculation)
- Discover page with topic-based news
- Library/chat history
- File upload processing (PDF/DOCX/TXT with embeddings)
- Password authentication

## Risks

| Risk | Mitigation |
|------|-----------|
| Railway cost exceeds budget | Monitor usage, optimize GenServer memory, consider Fly.io if needed |
| Elixir learning curve | Start with simple GenServer, iterate; Phoenix docs are excellent |
| Two-service latency (Vercel ↔ Railway) | GraphQL subscriptions are persistent WebSocket — no per-message HTTP overhead |
| Zig integration complexity | Stretch goal — only attempt after Phoenix baseline works |
| GLM API balance issues | Free tier (GLM-4.7-Flash) as emergency fallback; coding plan for primary |
