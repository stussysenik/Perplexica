# Perplexica - AI Search Engine

## Overview
Perplexica is a privacy-focused AI-powered search engine (open-source alternative to Perplexity AI). It combines web search with LLM capabilities to deliver answers with cited sources.

## Architecture
- **Framework**: Next.js 16 (App Router, webpack mode)
- **Database**: SQLite via better-sqlite3 + Drizzle ORM (stored in `data/db.sqlite`)
- **Config**: JSON config at `data/config.json`
- **Primary AI Provider**: NVIDIA NIM via OpenAI-compatible API
  - Base URL: `https://integrate.api.nvidia.com/v1`
  - Default model: Kimi K2 Instruct (fast, 1-2s per call)
  - Also available: Llama 3.3 70B, DeepSeek V3.2, Qwen 3.5 397B, Llama 3.1 405B, Mistral Large 3 675B, Kimi K2.5 (thinking/slow), Llama 3.1 8B (fast)
  - Embeddings: NV EmbedQA E5 v5, NV Embed v1
- **Secondary AI Provider**: GLM (Zhipu AI Direct)
  - Base URL: `https://open.bigmodel.cn/api/paas/v4`
  - Models: GLM-5, GLM-4.7, GLM-4.5
  - Note: Requires sufficient API balance to function
- **Search Backend**: Local SearxNG-compatible proxy (Brave Search API, port 4000)

## Key Directories
- `src/app/` - Next.js app router pages and API routes
- `src/components/` - React components (Chat, Settings, Setup wizard, etc.)
- `src/lib/` - Core library (config, models, agents, search, db)
- `data/` - Runtime data (SQLite DB, config.json, uploads)
- `drizzle/` - Database migrations
- `public/` - Static assets
- `searxng-proxy.mjs` - Local SearxNG-compatible search proxy using Brave Search

## Workflows
- **Start application**: `npx next dev --webpack -p 5000` (main app on port 5000)
- **SearxNG Proxy**: `node searxng-proxy.mjs` (search proxy on port 4000)

## Key Modifications from Upstream Perplexica
- `src/lib/models/providers/openai/openaiLLM.ts` - Modified for non-OpenAI provider compatibility:
  - Non-OpenAI providers use standard `chat.completions.create` instead of `parse()` with structured outputs
  - Non-OpenAI providers use streaming chat completions instead of `responses.stream()`
  - Uses `max_tokens` instead of `max_completion_tokens` for non-OpenAI
  - JSON schema conversion via manual `zodSchemaToDescription` helper (Zod v3 compat)
  - Tool parameters extracted via `zodFunction` from openai SDK
  - Handles `reasoning_content` from thinking models (Kimi K2.5, etc.)
  - 120s timeout for slower models
- `src/lib/models/providers/openai/openaiEmbedding.ts` - NVIDIA NIM embedding compatibility:
  - Uses `input_type: 'query'` for text queries and `input_type: 'passage'` for document chunks (NVIDIA asymmetric models)
- `src/lib/agents/search/index.ts` - Added error handling for API errors (429, etc.)
- `src/lib/session.ts` - Fixed EventEmitter error handling for unregistered listeners
- `postcss.config.cjs` - Renamed from .js due to ESM "type": "module"
- `src/components/AssistantSteps.tsx` - BookSearch icon replaced with BookOpen (lucide-react compat)
- `searxng-proxy.mjs` - Custom SearxNG-compatible proxy using Brave Search API (structured JSON with descriptions)

## Environment Variables
- `.env.local` contains:
  - `SEARXNG_API_URL=http://localhost:4000`
  - `NVIDIA_NIM_API_KEY` - API key for NVIDIA NIM
  - `GLM_API_KEY` - API key for Zhipu AI (GLM)
  - `BRAVE_SEARCH_API_KEY` - API key for Brave Search API
- API keys are also stored in `data/config.json` under modelProviders config

## Authentication
- Basic password auth via Next.js middleware (`src/middleware.ts`)
- Login page at `/login`, API at `/api/auth/login`
- Session: HMAC-SHA256 signed cookie (`auth_session`), 30-day expiry
- Uses `AUTH_PASSWORD` env var for password, `SESSION_SECRET` for HMAC signing
- Weather icons and static assets are excluded from auth

## Deployment
- `start.sh` runs both SearxNG proxy and Next.js app together
- Deployment target: VM (needs persistent proxy process + SQLite)
- Run command: `bash start.sh`

## Source Traceability
- Each source card in `MessageSources.tsx` has a collapsible "View extracted text" panel
- Shows the actual snippet/content fed to the AI for each source
- Full information flow visibility: source URL → extracted text → AI answer with citations

## PWA (Progressive Web App)
- Full PWA manifest at `src/app/manifest.ts` (standalone, portrait)
- Icons: 50, 100, 180 (Apple touch), 192 (PWA standard), 440, 512 (splash)
- Apple meta tags: `apple-mobile-web-app-capable`, `black-translucent` status bar
- Viewport: `width=device-width`, `viewport-fit=cover`, `userScalable=false`
- Theme color: dynamic light (#ffffff) / dark (#0a0a0a) based on system preference
- Middleware allows manifest.webmanifest and /icon* through auth

## Notes
- Docker is NOT available on Replit; all services run natively
- The `--webpack` flag is required for Next.js (Turbopack has compatibility issues)
- Initial page compilation takes ~23s (webpack), subsequent loads are fast
- Kimi K2.5 is a thinking model (70s+ per call) — use Kimi K2 Instruct as default for speed
- NVIDIA NIM embedding models require `input_type` parameter for asymmetric models
- Brave Search API is used for web search with rate limiting (1 req/sec queue for free tier)
- `next build` times out on Replit — deployed with dev server for now
