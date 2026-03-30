<div align="center">

# Perplexica

### AI-Powered Search Engine

[![Language](https://img.shields.io/github/languages/top/stussysenik/Perplexica?style=flat-square)]()
[![License](https://img.shields.io/github/license/stussysenik/Perplexica?style=flat-square)]()
[![Last Commit](https://img.shields.io/github/last-commit/stussysenik/Perplexica?style=flat-square)]()
[![Stars](https://img.shields.io/github/stars/stussysenik/Perplexica?style=flat-square)]()
[![Repo Size](https://img.shields.io/github/repo-size/stussysenik/Perplexica?style=flat-square)]()

</div>

---

A self-hosted, privacy-focused alternative to Perplexity AI. Uses an agentic research loop with Brave Search API and NVIDIA NIM large language models to deliver cited, source-traceable answers.

Built with **RedwoodJS** (React frontend) + **Elixir/Phoenix** (fault-tolerant backend) + **PostgreSQL** (persistent data with pgvector embeddings).

> Based on [ItzCrazyKns/Perplexica](https://github.com/ItzCrazyKns/Perplexica), rewritten as a resilient multi-service architecture.

## Features

- **AI-Powered Web Search** — Ask questions in natural language, get answers with inline citation badges `[1][2]` linking back to sources
- **Source Traceability** — Collapsible "View extracted text" on every source card. See exactly what the AI read from each website
- **Agentic Research Loop** — Iterative search: classify query, search web, scrape pages, reason, repeat. Speed (2 iterations), Balanced (6), Quality (25)
- **Fault-Tolerant Backend** — Each search runs in its own supervised Elixir GenServer. Crashes are isolated — other searches continue unaffected
- **AI Provider Failover** — NVIDIA NIM (primary) with automatic failover to Zhipu GLM. Circuit breaker opens after 3 failures, recovers after 60s
- **Brave Search API** — Rate-limited (Hammer, 1 req/s free tier) web + news search with URL scraping
- **Discover Page** — Topic-based news feed (Tech, Finance, Art, Sports, Entertainment) with card grid
- **Library** — Chat history with delete, powered by PostgreSQL
- **Light & Dark Mode** — Polished light theme with warm stone tones, dark mode toggle. Montserrat font
- **Mobile Responsive** — Sidebar collapses on mobile, works on phone browsers
- **GraphQL API** — Absinthe schema with queries, mutations, and WebSocket subscriptions
- **pgvector Embeddings** — 1024-dim NV EmbedQA vectors for uploaded file search

## Architecture

```
┌─────────────────────┐     ┌──────────────────────────────────┐
│  RedwoodJS (Vercel)  │     │  Phoenix/Elixir (Railway)        │
│                      │     │                                  │
│  React UI            │────▶│  Absinthe GraphQL API            │
│  Tailwind + Radix    │ GQL │  ┌─────────────────────────┐    │
│  Apollo Client       │     │  │ SearchSupervisor         │    │
│                      │     │  │  ├─ SearchSession [GS]   │    │
│  Pages:              │     │  │  ├─ SearchSession [GS]   │    │
│  - Search (/)        │     │  │  └─ SearchSession [GS]   │    │
│  - Discover          │     │  └─────────────────────────┘    │
│  - Library           │     │  ModelRegistry [GenServer]       │
└─────────────────────┘     │  ├─ NIM Provider (failover) ────▶ NVIDIA NIM API
                             │  └─ GLM Provider (fallback) ────▶ Zhipu GLM API
                             │  BraveSearch [Hammer rate limit] ▶ Brave Search API
                             │  PostgreSQL + pgvector            │
                             └──────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | RedwoodJS 8.9, React 18, Tailwind CSS, Montserrat |
| Backend | Elixir 1.19, Phoenix 1.8, Absinthe GraphQL |
| Database | PostgreSQL 17 + pgvector 0.8 (Ecto + Prisma) |
| AI Provider | NVIDIA NIM (OpenAI-compatible) + Zhipu GLM failover |
| Search | Brave Search API + Hammer rate limiting |
| Embeddings | NV EmbedQA E5 v5 (1024-dim, asymmetric) |
| HTML Parser | Zig 0.15 (stretch goal, placeholder) |

## Setup

### Prerequisites

- Elixir 1.15+ and Erlang/OTP 26+
- Node.js 20 (use `mise` or `nvm`)
- PostgreSQL 14+ with pgvector extension
- NVIDIA NIM API key ([nvidia.com/nim](https://build.nvidia.com/explore/discover))
- Brave Search API key ([brave.com/search/api](https://brave.com/search/api/))

### Environment Variables

**Phoenix** (`phoenix/.env.local`):
```env
NVIDIA_NIM_API_KEY=your_nvidia_nim_api_key
BRAVE_SEARCH_API_KEY=your_brave_search_api_key
# Optional:
GLM_API_KEY=your_glm_api_key
GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
```

**Redwood** (`redwood/.env`):
```env
DATABASE_URL=postgresql://user@localhost:5432/perplexica_dev
PHOENIX_URL=http://localhost:4000
```

### Running Locally

```bash
# 1. Set up database
createdb perplexica_dev
psql -d perplexica_dev -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 2. Start Phoenix backend
cd phoenix
mix setup          # Install deps, create DB, run migrations
mix phx.server     # Starts on :4000

# 3. Start Redwood frontend (separate terminal)
cd redwood
yarn install
yarn rw dev web    # Starts on :8910
```

Open **http://localhost:8910** to use the app.

### Deploying

**Phoenix → Railway:**
```bash
cd phoenix
# Railway auto-detects the Dockerfile
# Set env vars: DATABASE_URL, SECRET_KEY_BASE, NVIDIA_NIM_API_KEY, BRAVE_SEARCH_API_KEY, PHX_HOST, PHX_SERVER=true
```

**Redwood → Vercel:**
```bash
cd redwood
# Connect repo to Vercel, set root directory to "redwood"
# Set env var: PHOENIX_URL=https://your-railway-app.railway.app
```

## Project Structure

```
perplexica/
├── phoenix/                    # Elixir/Phoenix backend
│   ├── lib/perplexica/
│   │   ├── models/             # AI providers (NIM, GLM, registry, failover)
│   │   ├── search/             # Search pipeline (classifier, researcher, actions, session)
│   │   ├── search_sources/     # Brave Search client + rate limiter
│   │   ├── uploads/            # File processing + pgvector embeddings
│   │   ├── chat.ex             # Chat Ecto schema
│   │   └── message.ex          # Message Ecto schema
│   ├── lib/perplexica_web/
│   │   ├── schema.ex           # Absinthe GraphQL root schema
│   │   ├── schema/             # GraphQL type definitions
│   │   ├── resolvers/          # Query/mutation resolvers
│   │   └── channels/           # WebSocket for subscriptions
│   ├── priv/repo/migrations/   # Database migrations (source of truth)
│   ├── Dockerfile              # Railway deployment
│   └── railway.json
├── redwood/                    # RedwoodJS frontend
│   ├── web/src/
│   │   ├── pages/              # HomePage, DiscoverPage, LibraryPage
│   │   ├── components/         # Chat, Sources, MessageBox, MessageInput
│   │   ├── layouts/            # AppLayout with sidebar
│   │   └── lib/                # Phoenix client, useSearch hook, theme
│   ├── api/db/schema.prisma    # Prisma schema (synced from Ecto)
│   └── vercel.json
├── zig/                        # Zig HTML parser (stretch goal)
│   ├── src/main.zig
│   └── build.zig
├── openspec/                   # Architecture specs and proposals
│   └── changes/rewrite-fullstack-resilient/
└── src/                        # Original Next.js code (reference)
```

## Database Schema

9 tables in PostgreSQL:

| Table | Purpose |
|-------|---------|
| `chats` | Conversation threads |
| `messages` | Query-response pairs with JSONB response blocks |
| `search_sessions` | GenServer state checkpoints for crash recovery |
| `config` | Application configuration (key-value JSONB) |
| `model_providers` | AI provider configs (NIM, GLM) |
| `uploads` | File upload metadata |
| `upload_chunks` | Embedded text chunks with pgvector(1024) |
| `users` | Password auth (bcrypt) |

## License

Same license as upstream [Perplexica](https://github.com/ItzCrazyKns/Perplexica).
