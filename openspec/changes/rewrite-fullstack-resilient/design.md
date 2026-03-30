# Design: Full-Stack Resilient Architecture

## System Architecture

```
                          +-----------------------+
                          |      User Browser     |
                          +----------+------------+
                                     |
                          GraphQL + WS Subscriptions
                                     |
                          +----------v------------+
                          |   RedwoodJS (Vercel)  |
                          |                       |
                          |  web/  - React UI     |
                          |  api/  - GraphQL SDL  |
                          |         (proxy layer) |
                          +----------+------------+
                                     |
                          GraphQL over HTTPS/WS
                                     |
                          +----------v------------+
                          |  Phoenix (Railway)    |
                          |                       |
                          |  Absinthe GraphQL     |
                          |  SearchSupervisor     |
                          |    └─ SearchSession   |
                          |       GenServer(s)    |
                          |  ModelRegistry        |
                          |  BraveSearchWorker    |
                          |  FileProcessor        |
                          +----------+------------+
                                     |
                     +---------------+---------------+
                     |               |               |
              +------v------+ +-----v------+ +------v------+
              | PostgreSQL  | | NVIDIA NIM | | Brave Search|
              | (Railway)   | | API        | | API         |
              +-------------+ +-----+------+ +-------------+
                                    |
                              +-----v------+
                              | Zhipu GLM  |
                              | (failover) |
                              +------------+
```

## Service Boundaries

### RedwoodJS (Vercel) — Presentation + API Proxy

**Responsibilities:**
- React UI rendering (Cells pattern)
- GraphQL schema definition (SDL-first)
- Auth via dbAuth (password-based, cookie sessions)
- Static assets, PWA manifest
- Apollo Client for queries, mutations, and subscriptions

**Does NOT do:**
- AI provider calls
- Search orchestration
- File content extraction
- Rate limiting

**Key Redwood Patterns:**
- **Cells**: `ChatCell`, `DiscoverCell`, `LibraryCell` — each with Loading/Error/Empty/Success states
- **Services**: Thin proxy functions that forward to Phoenix GraphQL
- **SDL**: Type definitions matching Phoenix's Absinthe schema
- **dbAuth**: Password hashing, session cookies, CSRF protection

### Phoenix (Railway) — Core Backend

**Responsibilities:**
- Search session lifecycle (GenServer-per-search)
- AI provider management (NIM + GLM with failover)
- Query classification, researcher loop, action execution
- Brave Search rate limiting (Hammer library)
- File upload processing + embedding generation
- GraphQL API via Absinthe (queries, mutations, subscriptions)
- Telemetry + observability hooks

**Supervision Tree:**
```
Application
├── Repo (Ecto/PostgreSQL)
├── PubSub (Phoenix.PubSub)
├── Telemetry
├── Endpoint (Absinthe WebSocket)
├── SearchSupervisor (DynamicSupervisor)
│   ├── SearchSession.GenServer (per active search)
│   ├── SearchSession.GenServer ...
│   └── SearchSession.GenServer ...
├── ModelRegistry (GenServer)
│   ├── NIM provider state
│   └── GLM provider state
├── BraveSearch.RateLimiter (GenServer + Hammer)
└── FileProcessor.Supervisor
    └── FileProcessor.Worker (per upload)
```

**Key Design Decisions:**

1. **GenServer-per-search**: Each search session is an isolated process. If it crashes (LLM timeout, parsing error), only that session is affected. The supervisor restarts it, and the client reconnects via subscription.

2. **State checkpointing**: After each research iteration, the GenServer checkpoints its state to PostgreSQL (`search_sessions` table). On restart, it resumes from the last checkpoint rather than starting over.

3. **Absinthe subscriptions**: The streaming protocol maps naturally:
   - `subscription { searchUpdated(sessionId: ID!) { type, block, patch } }`
   - Each GenServer publishes to `Absinthe.Subscription.publish/3` on block emit/update
   - Client receives typed GraphQL events instead of raw NDJSON

4. **Hammer rate limiting**: Replaces the manual request queue in `searxng-proxy.mjs`. Hammer provides sliding-window rate limiting backed by ETS — 1 request/1.1s for Brave Search free tier.

### Zig Service (Stretch Goal)

**Responsibilities:**
- HTML → text extraction for `scrape_url` action
- Called by Phoenix over HTTP (`POST /parse` with HTML body)
- Returns structured text content

**Decision gate**: Benchmark Phoenix's built-in HTML parsing (Floki library) first. Only proceed with Zig if parsing is >50ms per page or memory usage is a concern.

## Data Architecture

### PostgreSQL Schema (Shared)

```sql
-- Managed by Prisma (Redwood reads) + Ecto (Phoenix writes)

-- Core chat data
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  sources JSONB NOT NULL DEFAULT '[]',
  files JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  message_id TEXT NOT NULL,
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  backend_id TEXT NOT NULL,
  query TEXT NOT NULL,
  response_blocks JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'answering'
    CHECK (status IN ('answering', 'completed', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Search session checkpoints (Phoenix only)
CREATE TABLE search_sessions (
  id UUID PRIMARY KEY,
  chat_id UUID REFERENCES chats(id),
  message_id TEXT NOT NULL,
  state JSONB NOT NULL,  -- serialized GenServer state
  iteration INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'crashed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Configuration (replaces data/config.json)
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Model providers
CREATE TABLE model_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  chat_models JSONB NOT NULL DEFAULT '[]',
  embedding_models JSONB NOT NULL DEFAULT '[]',
  hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- File uploads
CREATE TABLE uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  storage_key TEXT NOT NULL,  -- S3/R2 key or local path
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE upload_chunks (
  id SERIAL PRIMARY KEY,
  upload_id UUID NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(1024) NOT NULL,  -- pgvector for NV EmbedQA
  chunk_index INTEGER NOT NULL
);

-- Auth (Redwood dbAuth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  reset_token TEXT,
  reset_token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Dual ORM Strategy:**
- **Prisma** (Redwood): Reads for UI (chats, messages, config, uploads metadata). Schema defined in `schema.prisma`.
- **Ecto** (Phoenix): Writes for search pipeline (messages, search_sessions, upload_chunks). Migrations managed by Ecto.
- **Coordination**: Ecto owns migrations. Prisma uses `prisma db pull` to sync schema. Both connect to the same PostgreSQL instance.

### Block Protocol (Preserved)

The streaming block protocol is preserved exactly, now typed as GraphQL:

```graphql
union SearchEvent = BlockEvent | UpdateBlockEvent | ResearchCompleteEvent | MessageEndEvent | ErrorEvent

type BlockEvent {
  type: String!  # "block"
  block: Block!
}

type UpdateBlockEvent {
  type: String!  # "updateBlock"
  blockId: ID!
  patch: JSON!   # RFC-6902 patch array
}

type ResearchCompleteEvent {
  type: String!  # "researchComplete"
}

type MessageEndEvent {
  type: String!  # "messageEnd"
}

type ErrorEvent {
  type: String!  # "error"
  data: String!
}

union Block = TextBlock | SourceBlock | SuggestionBlock | WidgetBlock | ResearchBlock

type TextBlock {
  id: ID!
  type: String!
  data: String!
}

type SourceBlock {
  id: ID!
  type: String!
  data: [Chunk!]!
}

# ... etc, matching current TypeScript types exactly
```

## AI Provider Failover

```
Request → NIM Provider
            ├── Success → return response
            └── Error (429/500/timeout)
                  → GLM Provider
                       ├── Success → return response
                       └── Error → raise, checkpoint state, retry later
```

**ModelRegistry GenServer** maintains:
- Provider health status (healthy/degraded/down)
- Exponential backoff timers per provider
- Circuit breaker: after 3 consecutive failures, mark provider as "down" for 60s
- Automatic recovery: periodic health check pings

**Provider Configuration:**
- NIM: `NVIDIA_NIM_API_KEY`, base URL `https://integrate.api.nvidia.com/v1`
- GLM: `GLM_API_KEY`, base URL from Zhipu API docs
- Both use OpenAI-compatible chat completion API

## Observability Stack

### PostHog (Free: 1M events/mo)
- **Search events**: query submitted, classification result, sources found, answer generated
- **Feature usage**: discover page views, file uploads, widget interactions
- **Performance**: search latency percentiles, provider response times
- **Integration**: `posthog-js` in Redwood frontend, `posthog-elixir` in Phoenix

### Sentry (Free: 5K errors/mo)
- **Frontend**: React error boundaries, failed API calls
- **Backend**: GenServer crashes, provider errors, parsing failures
- **Integration**: `@sentry/react` in Redwood, `sentry` Elixir package in Phoenix

### Phoenix Telemetry
- GenServer count, memory usage, message queue lengths
- Search iteration counts, average duration
- Database query times
- Exported to PostHog via custom reporter

## Deployment Topology

### Vercel (Free Tier)
- **Build**: `yarn rw build` (standard Redwood build)
- **Functions**: Serverless (10s timeout for queries/mutations)
- **Edge**: Not needed — subscriptions go directly to Phoenix WebSocket
- **Bandwidth**: 100GB/mo (sufficient for single-user)
- **Env vars**: `PHOENIX_URL`, `DATABASE_URL` (for Prisma reads), auth secrets

### Railway (Hobby: $5/mo base + usage)
- **Phoenix app**: Single Elixir release, ~256MB RAM
- **PostgreSQL**: Managed instance (included in Railway)
- **Zig binary**: Sidecar process (if needed)
- **No sleep**: Hobby plan keeps processes running 24/7
- **Health check**: Phoenix endpoint `/health` for Railway monitoring

### Estimated Monthly Cost
| Item | Cost |
|------|------|
| Vercel | $0 (free tier) |
| Railway Hobby base | $5 |
| Railway Phoenix usage | ~$3-8 |
| Railway PostgreSQL | ~$2-5 |
| NVIDIA NIM | $0 (free tier API) |
| GLM coding plan | $3 |
| PostHog | $0 (free tier) |
| Sentry | $0 (free tier) |
| **Total** | **~$13-21/mo** |

## Monorepo Structure

```
perplexica/
├── README.md
├── .github/
│   └── workflows/
│       ├── deploy-web.yml      # Vercel deploy on push
│       └── deploy-phoenix.yml  # Railway deploy on push
├── redwood/                    # RedwoodJS app
│   ├── web/                    # React frontend
│   │   ├── src/
│   │   │   ├── components/     # UI components
│   │   │   ├── layouts/        # Page layouts
│   │   │   ├── pages/          # Route pages
│   │   │   └── cells/          # Redwood Cells
│   │   └── public/             # Static assets
│   ├── api/                    # GraphQL API (proxy)
│   │   ├── src/
│   │   │   ├── graphql/        # SDL type definitions
│   │   │   ├── services/       # Service functions
│   │   │   └── lib/            # Auth, utilities
│   │   └── db/
│   │       └── schema.prisma   # Database schema
│   ├── redwood.toml
│   └── package.json
├── phoenix/                    # Elixir/Phoenix app
│   ├── lib/
│   │   ├── perplexica/         # Business logic
│   │   │   ├── search/         # Search pipeline
│   │   │   │   ├── session.ex          # GenServer
│   │   │   │   ├── supervisor.ex       # DynamicSupervisor
│   │   │   │   ├── classifier.ex       # Query classification
│   │   │   │   ├── researcher.ex       # Agentic loop
│   │   │   │   └── actions/            # Action modules
│   │   │   │       ├── registry.ex
│   │   │   │       ├── web_search.ex
│   │   │   │       ├── scrape_url.ex
│   │   │   │       ├── academic_search.ex
│   │   │   │       ├── social_search.ex
│   │   │   │       ├── uploads_search.ex
│   │   │   │       └── done.ex
│   │   │   ├── models/         # AI provider management
│   │   │   │   ├── registry.ex         # GenServer
│   │   │   │   ├── nim_provider.ex
│   │   │   │   └── glm_provider.ex
│   │   │   ├── search_sources/ # External search
│   │   │   │   └── brave.ex           # Rate-limited client
│   │   │   ├── uploads/        # File processing
│   │   │   │   ├── processor.ex
│   │   │   │   └── store.ex
│   │   │   └── widgets/        # Widget executors
│   │   │       ├── weather.ex
│   │   │       ├── stock.ex
│   │   │       └── calculation.ex
│   │   ├── perplexica_web/     # Web layer
│   │   │   ├── schema.ex               # Absinthe root schema
│   │   │   ├── schema/
│   │   │   │   ├── search_types.ex     # Block/event types
│   │   │   │   ├── chat_types.ex
│   │   │   │   └── provider_types.ex
│   │   │   ├── resolvers/
│   │   │   │   ├── search_resolver.ex
│   │   │   │   ├── chat_resolver.ex
│   │   │   │   └── provider_resolver.ex
│   │   │   └── channels/
│   │   │       └── absinthe_socket.ex
│   │   └── perplexica/         # Ecto schemas
│   │       ├── chat.ex
│   │       ├── message.ex
│   │       ├── search_session.ex
│   │       ├── model_provider.ex
│   │       └── upload.ex
│   ├── priv/
│   │   └── repo/migrations/    # Ecto migrations (source of truth)
│   ├── config/
│   │   ├── config.exs
│   │   ├── dev.exs
│   │   ├── prod.exs
│   │   └── runtime.exs         # Env var loading
│   ├── mix.exs
│   └── mix.lock
├── zig/                        # Zig HTML parser (stretch goal)
│   ├── src/
│   │   └── main.zig
│   └── build.zig
└── openspec/                   # This spec directory
```
