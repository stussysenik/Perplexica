<div align="center">

# Perplexica

![Demo](demo.gif)

### Research-Grade AI Search

[![Language](https://img.shields.io/github/languages/top/stussysenik/Perplexica?style=flat-square)]()
[![License](https://img.shields.io/github/license/stussysenik/Perplexica?style=flat-square)]()
[![Last Commit](https://img.shields.io/github/last-commit/stussysenik/Perplexica?style=flat-square)]()
[![Version](https://img.shields.io/badge/version-1.0.0-blue?style=flat-square)]()
[![Lighthouse](https://img.shields.io/badge/Lighthouse-100%2F100%2F100-brightgreen?style=flat-square)]()

[Live Demo](https://perplexica-production-41f5.up.railway.app/) — hosted on Railway

</div>

---

A self-hosted, privacy-focused alternative to Perplexity AI. Uses an agentic research loop with Brave Search API and NVIDIA NIM large language models to deliver cited, source-traceable answers.

Built with **RedwoodJS** (React frontend) + **Elixir/Phoenix** (fault-tolerant backend) + **PostgreSQL** (persistent data with pgvector embeddings).

> Based on [ItzCrazyKns/Perplexica](https://github.com/ItzCrazyKns/Perplexica), rewritten as a resilient multi-service architecture with a neuroscience-based design system.

---

## Table of Contents

- [What It Is](#what-it-is)
- [Why It Exists](#why-it-exists)
- [How It Works](#how-it-works)
- [Authentication](#authentication)
- [Screenshots](#screenshots)
- [Features](#features)
- [Design System](#design-system)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Setup](#setup)
- [Deploying to Railway](#deploying-to-railway)
- [Project Structure](#project-structure)
- [Audit Results](#audit-results)
- [Database Schema](#database-schema)
- [Changelog](#changelog)
- [License](#license)

---

## What It Is

Perplexica is an AI-powered search engine that doesn't just return links -- it reads, analyzes, and synthesizes information from the web into cited answers. Every claim links back to its source with inline citation badges `[1][2]`, and you can expand any source card to see exactly what text the AI extracted.

Think Google Scholar meets ChatGPT, but self-hosted, privacy-first, and with full source traceability.

## Why It Exists

Most AI search tools are black boxes. You ask a question, get an answer, and have no idea where it came from or whether it's accurate. Perplexica solves this by:

1. **Showing its work** -- every source is visible, expandable, and linkable
2. **Running on your infrastructure** -- no data sent to third parties beyond the search and AI APIs you configure
3. **Being fault-tolerant** -- each search runs in an isolated Elixir GenServer. One crash doesn't take down the system
4. **Failing over gracefully** -- if NVIDIA NIM goes down, it automatically switches to Zhipu GLM

## How It Works

```
User types query
    |
    v
[1. CLASSIFY] -- Determine query type, skip search if unnecessary
    |
    v
[2. RESEARCH] -- Agentic loop: search web, scrape pages, reason, repeat
    |            Speed: 2 iterations | Balanced: 6 | Quality: 25
    |            Real-time progress via WebSocket: "Searching (3 sources)..."
    v
[3. SYNTHESIZE] -- Generate answer with inline citations [1][2][3]
    |
    v
[4. DELIVER] -- Sources + answer + TOC + action bar (copy, share, bookmark, PDF, TTS)
```

**Real-time search progress**: When you submit a query, Perplexica connects via WebSocket and shows you exactly what's happening -- classifying your query, searching the web (with source count), analyzing sources, and writing the answer. No more staring at a spinner for 10 seconds.

**Agentic research loop**: The backend doesn't just do one search. It iterates -- searching, reading, reasoning, and searching again. In Quality mode, it can run up to 25 iterations, building a comprehensive understanding before answering.

**Source traceability**: Every source card shows the domain, title, and a citation badge. Click the badge in the answer to jump to the source. Expand "View extracted text" to see the raw content the AI used.

## Authentication

Perplexica is a **private search console** — access is gated behind GitHub OAuth and a server-side allowlist. There is no public sign-up.

### How it works

```
Browser → /auth/github → GitHub OAuth → /auth/github/callback
                                              │
                              username in GITHUB_ALLOWLIST?
                                    │                    │
                                   yes                   no
                                    │                    │
                          set HttpOnly session      redirect /?auth_error=forbidden
                          cookie + redirect /
                                    │
                          GET /auth/whoami → {signed_in: true}
                          → app renders
```

1. **Sign in** — The splash screen (`SignInGate`) navigates to `/auth/github`. Ueberauth redirects to GitHub with a CSRF `state` parameter. GitHub redirects back to `/auth/github/callback`.
2. **Allowlist check** — Phoenix extracts the GitHub username from the OAuth token and compares it (case-insensitively) against `GITHUB_ALLOWLIST`. If it's not there, the session is dropped and the user is redirected with `?auth_error=forbidden`.
3. **Session cookie** — On success, Phoenix writes a signed `HttpOnly` session cookie (`SameSite=Lax`, `Secure=true` in production, 30-day `max_age`). The cookie is scoped to the domain, so it works for every subsequent request without any client-side token management.
4. **Every page load** — `SessionProvider` calls `GET /auth/whoami`. Phoenix reads the session cookie and returns `{signed_in, username, avatar_url}`. The React tree either renders the splash or the full app based on this.
5. **Gated API** — Every `POST /api/graphql` request passes through `RequireOwner` in the Phoenix pipeline. No valid session → `401`. Username removed from allowlist → `403`. Both dispatch `fyoa:session-revoked` in the browser, which triggers a `whoami` refresh.

### Why this design

| Choice | Reason |
|--------|--------|
| **Session cookie, not a JWT** | No client-side token storage. `HttpOnly` means XSS cannot steal the credential. The server is the only party that can read or invalidate the session. |
| **Single domain** (Phoenix serves Redwood static files) | `SameSite=Lax` cookies don't cross origins. Serving the SPA from the same Phoenix process and domain means every fetch — including `credentials: 'include'` GraphQL calls — is same-origin. No CORS cookie negotiation needed. |
| **GITHUB_ALLOWLIST as env var** | One operator, one process. An env var is the simplest possible gate: `railway variable set GITHUB_ALLOWLIST=yourusername`. No admin UI, no database table, instant to update. |
| **`whoami` on every load** | Single authoritative source of truth. No stale client cache. Cost is one sub-millisecond Phoenix read per page load. |

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_CLIENT_ID` | Yes | OAuth App client ID from github.com/settings/developers |
| `GITHUB_CLIENT_SECRET` | Yes | OAuth App client secret |
| `GITHUB_ALLOWLIST` | Yes | Comma-separated GitHub usernames allowed to sign in (e.g. `alice,bob`) |
| `SECRET_KEY_BASE` | Yes | Session signing key — generate with `mix phx.gen.secret` |
| `PHX_HOST` | Yes (prod) | The production hostname (e.g. `your-app.up.railway.app`) |

> **GitHub OAuth App setup**: Register at github.com/settings/developers. Set "Authorization callback URL" to `https://your-domain/auth/github/callback`. Homepage URL can be anything.

---

## Screenshots

### Search Flow (Desktop)
![Demo](demo.gif)
> Type a query, see real-time search progress, sources appear with citation badges, answer streams in with table of contents.

### Discover Page
![Discover](docs/screenshots/discover.gif)
> Browse topics (Tech, Finance, Art, Sports, Entertainment) — click tabs to switch, article cards load with stagger animation.

### Mobile Experience
<p align="center">
<img src="docs/screenshots/mobile.gif" width="300" alt="Mobile search flow">
</p>

> Full functionality on mobile — bottom nav, search, navigate between pages. Dark mode shown.

### Light Mode
| Home | Discover | Library |
|:----:|:--------:|:-------:|
| ![](docs/screenshots/home-light.png) | ![](docs/screenshots/discover-light.png) | ![](docs/screenshots/library-light.png) |

### Dark Mode
![Home Dark](docs/screenshots/home-dark.png)

## Features

- **Private GitHub OAuth Gate** -- Sign in with GitHub; only allowlisted usernames can access the app. HttpOnly session cookie, no client-side token storage.
- **AI-Powered Web Search** -- Natural language queries with cited, source-traceable answers
- **Real-Time Search Progress** -- WebSocket-powered staged indicators: classifying, searching (N sources), analyzing, writing
- **Source Traceability** -- Expandable source cards with "View extracted text" for full transparency
- **Agentic Research Loop** -- Iterative search: Speed (2 iterations), Balanced (6), Quality (25)
- **Fault-Tolerant Backend** -- Each search in its own supervised Elixir GenServer with crash isolation
- **AI Provider Failover** -- NVIDIA NIM primary, Zhipu GLM fallback. Circuit breaker: 3 failures, 60s cooldown
- **Discover Page** -- Topic-based news feed (Tech, Finance, Art, Sports, Entertainment)
- **Library** -- Chat history + bookmarks with delete confirmation
- **Shared Links** -- Share any answer via `/s/{slug}` read-only URL
- **Answer Actions** -- Copy, Share, Bookmark, PDF Export, Text-to-Speech
- **Table of Contents** -- Auto-generated from answer headings with scroll tracking
- **Light & Dark Mode** -- Light-first design, dark mode toggle, system preference detection
- **Mobile Responsive** -- Bottom nav on mobile, sidebar on desktop, 44px touch targets
- **GraphQL API** -- Absinthe schema with queries, mutations, and WebSocket subscriptions
- **pgvector Embeddings** -- 1024-dim NV EmbedQA vectors for uploaded file search
- **XSS Protection** -- DOMPurify sanitization on all rendered markdown
- **WCAG 2.1 AA** -- Color contrast 4.85:1, ARIA live regions, skip-to-content, keyboard navigation
- **Lighthouse 100/100/100** -- Perfect scores: Accessibility, Best Practices, SEO

## Design System

Perplexica uses a **neuroscience-based design system** inspired by Linear and Vercel, tailored for researchers and scientists.

### Visual DNA

| Principle | Implementation |
|-----------|---------------|
| **1px outlines** | Every container defined by its border, never by a fill |
| **Color spine** | 3px left-border accent (blue) on cards and active nav items |
| **Text-link actions** | No button backgrounds -- just icon + text that responds to hover |
| **Outlined human icons** | Phosphor Icons (`weight="light"`) for navigation |
| **Whisper fill** | 3% opacity tint on hover/active states only |
| **8px grid** | All spacing multiples of 8 |

### Cognitive Science Principles Applied

- **Fitts's Law** -- 44px minimum touch targets, frequent actions in thumb zones
- **Hick's Law** -- 3 search modes (Speed/Balanced/Quality), 3 nav items
- **Miller's Law** -- Max 4 source cards visible before "Show more"
- **Gestalt Proximity** -- Related elements grouped, unrelated elements spaced
- **Von Restorff Effect** -- Active states use accent color spine, visually distinct

### Motion

- All animations < 300ms (Emil Kowalski rules)
- `ease-out` for entering elements, `ease-in-out` for morphing
- Staggered reveals on source cards and list items (50ms between)
- `prefers-reduced-motion` respected globally (CSS + JS)

### Typography

Montserrat with 7-step scale on an 8px baseline: Display (32), H1 (24), H2 (20), H3 (16), Body (15), Small (13), Caption (11). `-webkit-font-smoothing: antialiased`, `text-wrap: balance` on headings, `text-wrap: pretty` on body.

## Architecture

Everything runs in a **single process on Railway**. The Dockerfile builds the Redwood frontend to static files and embeds them inside the Phoenix OTP release — Phoenix serves both the SPA and the API from one domain. This is intentional: it eliminates cross-origin cookie problems and simplifies deployment to one service, one `Dockerfile`, one Railway project.

```
User Browser
    │
    │  GET /  → Phoenix serves priv/static/index.html (compiled Redwood SPA)
    │  GET /auth/whoami → session check
    │  POST /api/graphql → gated by RequireOwner plug
    │  WSS /socket → Absinthe subscriptions (search progress)
    │
    ▼
Phoenix/Elixir OTP Release (Railway — single binary)
    │
    ├── PerplexicaWeb.Endpoint
    │     Plug.Static  ──────────────────── serves /priv/static/ (Redwood SPA)
    │     RequireOwner ──────────────────── GitHub session gate on /api/*
    │     Absinthe.Plug ─────────────────── GraphQL API on /api/graphql
    │
    ├── Auth pipeline (/auth/*)
    │     Ueberauth  ──────────────────────  /auth/github  → GitHub OAuth redirect
    │     AuthController ─────────────────  /auth/github/callback → set session cookie
    │                                        /auth/whoami → session introspection
    │                                        DELETE /auth/session → sign out
    │
    ├── SearchSupervisor [DynamicSupervisor]
    │     └── SearchSession [GenServer] ──  one per active search, crash-isolated
    │           Classifier  ──────────────  detects query type, skips web search if unnecessary
    │           Researcher  ──────────────  agentic loop: search → scrape → reason → repeat
    │           ModelRegistry [GenServer]
    │                 NIM Provider (primary)  ──→  NVIDIA NIM API
    │                 GLM Provider (fallback) ──→  Zhipu GLM API
    │           BraveSearch [Hammer rate limit] ──→ Brave Search API
    │
    └── Repo ──────────────────────────────  Ecto → PostgreSQL + pgvector
              chats, messages, search_sessions, config,
              model_providers, uploads, upload_chunks,
              shared_links, bookmarks

Build pipeline (Dockerfile):
  1. node:20-alpine  → yarn rw build → redwood/web/dist/
  2. elixir:1.17     → mix release   ← embeds web/dist/ into priv/static/
  3. debian:slim     → runtime image (one binary, one PORT, one Railway service)
```

### Why a single binary?

The alternative — Redwood on Vercel + Phoenix on Railway — has a critical flaw: `SameSite=Lax` session cookies don't travel cross-origin. Every `credentials: 'include'` GraphQL request from `vercel.app` to `railway.app` would be stripped of its cookie, making session-based auth impossible without CORS-level cookie workarounds (`SameSite=None; Secure`, which requires a fixed production domain and extra CORS preflight headers on every request).

Colocating the SPA inside Phoenix costs nothing at runtime (static files served by `Plug.Static` with gzip) and eliminates the entire cookie-origin problem class.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | RedwoodJS 8.9, React 18, Tailwind CSS 3, Framer Motion, GSAP |
| Design System | Phosphor Icons, SpineCard/TextAction/OutlineButton/CitationBadge |
| Backend | Elixir 1.19, Phoenix 1.8, Absinthe GraphQL |
| Real-Time | Phoenix Channels, Absinthe Subscriptions, @absinthe/socket |
| Database | PostgreSQL 17 + pgvector 0.8 (Ecto + Prisma) |
| AI Provider | NVIDIA NIM (OpenAI-compatible) + Zhipu GLM failover |
| Search | Brave Search API + Hammer rate limiting |
| Embeddings | NV EmbedQA E5 v5 (1024-dim, asymmetric) |
| Security | DOMPurify (XSS), CORS restricted, HSTS, focus-visible |
| Testing | Playwright (E2E), Chrome DevTools MCP (Lighthouse) |

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

### Deploying to Railway

The repo root `Dockerfile` builds everything into a single OTP release. Railway detects it automatically via `railway.json`.

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login and link project
railway login
railway link

# 3. Set required secrets
railway variable set \
  GITHUB_CLIENT_ID=<your_oauth_app_client_id> \
  GITHUB_CLIENT_SECRET=<your_oauth_app_client_secret> \
  GITHUB_ALLOWLIST=yourgithubusername \
  SECRET_KEY_BASE=$(openssl rand -base64 48) \
  PHX_HOST=your-app.up.railway.app \
  BRAVE_SEARCH_API_KEY=<key> \
  NVIDIA_NIM_API_KEY=<key> \
  DATABASE_URL=<postgresql://...>

# 4. Deploy
railway up
```

Railway will build the Dockerfile, run `mix release`, and start the server. Migrations run automatically at boot via `start.sh`.

> **GitHub OAuth App**: the callback URL must be `https://your-app.up.railway.app/auth/github/callback`.

## Project Structure

```
perplexica/
+-- phoenix/                        # Elixir/Phoenix backend
|   +-- lib/perplexica/
|   |   +-- models/                 # AI providers (NIM, GLM, registry, failover)
|   |   +-- search/                 # Pipeline (classifier, researcher, actions, session)
|   |   +-- search_sources/         # Brave Search client + rate limiter
|   |   +-- chat.ex, message.ex     # Ecto schemas
|   |   +-- shared_link.ex          # Shared answer links
|   |   +-- bookmark.ex             # Answer bookmarks
|   +-- lib/perplexica_web/
|   |   +-- schema.ex               # Absinthe GraphQL root (queries, mutations, subscriptions)
|   |   +-- resolvers/              # Search, Chat, Provider, Share resolvers
|   |   +-- channels/               # WebSocket for Absinthe subscriptions
|   +-- priv/repo/migrations/       # Database migrations (source of truth)
|   +-- Dockerfile                  # Fly.io deployment
+-- redwood/                        # RedwoodJS frontend
|   +-- web/src/
|   |   +-- components/
|   |   |   +-- ui/                 # Design system: SpineCard, TextAction, OutlineButton...
|   |   |   +-- Chat/               # MessageBox, MessageInput, SearchProgress, AnswerActionBar, TOC
|   |   |   +-- Sources/            # Source cards with SpineCard styling
|   |   +-- pages/                  # Home, Discover, Library, Shared, NotFound
|   |   +-- layouts/                # AppLayout (sidebar + bottom nav + skip-to-content)
|   |   +-- lib/
|   |   |   +-- useSearch.ts        # Search hook (WebSocket subscriptions + polling fallback)
|   |   |   +-- phoenix-ws.ts       # Absinthe WebSocket client
|   |   |   +-- phoenix.ts          # GraphQL HTTP client
|   |   |   +-- motion.ts           # Animation primitives (timing, easing, variants)
|   |   |   +-- renderMarkdown.ts   # Markdown->HTML with DOMPurify XSS protection
|   |   |   +-- theme.tsx           # Light/dark mode provider
|   |   +-- index.css               # Design tokens (CSS custom properties), typography, reduced-motion
|   +-- web/config/tailwind.config.js  # Color tokens, grid areas, typography scale
|   +-- web/tests/                  # Playwright E2E tests
|   +-- web/playwright.config.ts    # Playwright configuration
+-- docs/
|   +-- audits/                     # Gate 0-4 Lighthouse + audit reports
|   +-- screenshots/                # UI screenshots for README
+-- openspec/                       # Architecture specs and proposals
```

## Audit Results

This codebase was audited through a 5-gate quality pipeline:

| Gate | What | Result |
|------|------|--------|
| **Gate 0** | Playwright baselines + Lighthouse pre-redesign | A11y 89, BP 100, SEO 91 |
| **Gate 1** | Design system foundation (tokens, grid, icons, motion, components) | 13 deliverables |
| **Gate 2** | Page overhaul (all pages + components redesigned) | 10 components |
| **Gate 3** | 6 parallel audits (UX Laws, Checklists, Security, Interaction, A11y, Perf) | 300+ items scored |
| **Gate 4** | Fix all findings + retest | **A11y 100, BP 100, SEO 100** |

### Lighthouse Before vs After

| Page | Accessibility | Best Practices | SEO |
|------|:------------:|:--------------:|:---:|
| Home (before) | 89 | 100 | 91 |
| Home (after) | **100** | **100** | **100** |
| Discover (after) | **100** | 96 | **100** |
| Library (after) | **100** | 96 | **100** |

### Security Fixes Applied
- DOMPurify XSS protection on all `dangerouslySetInnerHTML` usage
- CORS restricted from `["*"]` to localhost + production domain
- Font preconnect for critical path optimization
- ARIA live regions for screen reader announcements

Full audit reports in [`docs/audits/`](docs/audits/).

## Database Schema

10 tables in PostgreSQL:

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
| `shared_links` | Shareable answer URLs with slug |
| `bookmarks` | Saved answers for quick access |

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for the full release history.

## License

Same license as upstream [Perplexica](https://github.com/ItzCrazyKns/Perplexica).
