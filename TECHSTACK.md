# TECHSTACK.md

## Table of Contents

- [Overview](#overview)
- [Frontend Stack](#frontend-stack)
- [Backend Stack](#backend-stack)
- [Database & Persistence](#database--persistence)
- [AI & Search Providers](#ai--search-providers)
- [DevOps & Deployment](#devops--deployment)
- [Testing](#testing)
- [Design System](#design-system)
- [Roadmap](#roadmap)

## Overview

Perplexica is a self-hosted, privacy-focused AI search engine built as a Next.js 16 monolith with SQLite persistence, agentic research loops, and real-time streaming responses.

## Frontend Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 16.1 | App Router, SSR, API routes, standalone output |
| React | 18.3 | Component framework with hooks |
| TypeScript | 5.6 | Type safety across the codebase |
| Tailwind CSS | 3.4 | Utility-first styling with custom design tokens |
| Framer Motion | 11.x | Animation primitives |
| Radix UI | latest | Accessible headless components (Dialog, Tabs, Tooltip, etc.) |
| Lucide React | 0.453 | Icon library |
| Phosphor Icons | 2.1 | Neuroscience design system icons (outlined weight) |
| Sonner | 2.x | Toast notifications |
| react-textarea-autosize | 8.5 | Auto-expanding message input |
| cmdk | 1.1 | Command palette |

## Backend Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js API Routes | 16.1 | REST API + streaming endpoints |
| Drizzle ORM | 0.39 | Type-safe database queries and migrations |
| better-sqlite3 | 12.6 | Embedded SQLite database driver |
| ws | 8.18 | WebSocket server for real-time streaming |
| OpenAI SDK | 6.x | AI provider interface (NIM-compatible) |
| Ollama | 0.6 | Local model support |
| pdf-parse | 2.4 | PDF file processing |
| mammoth | 1.11 | DOCX file processing |
| turndown | 7.2 | HTML-to-Markdown conversion |

## Database & Persistence

| Component | Technology | Details |
|-----------|-----------|---------|
| Primary DB | SQLite (better-sqlite3) | Embedded, zero-config, file-based at `data/db.sqlite` |
| ORM | Drizzle ORM | Type-safe queries, schema-first, migration support |
| Migrations | Custom runner (`src/lib/db/migrate.ts`) | Sequential SQL migrations with tracking |
| Volume | Docker named volume `perplexica-data` | Persistent storage across container restarts |
| Cloud Option | Turso/libSQL | Drop-in SQLite replacement for distributed deployments |

### Schema

Two core tables:

- **chats** — `id` (PK), `title`, `createdAt`, `sources` (JSON), `files` (JSON)
- **messages** — `id` (PK), `messageId`, `chatId` (FK), `backendId`, `query`, `responseBlocks` (JSON), `status`, `createdAt`, plus branching/versioning fields

### Data Persistence Strategy

1. **Local development**: SQLite file at `data/db.sqlite`, auto-created on first run
2. **Docker deployment**: Named volume `perplexica-data` mounted at `/app/data`
3. **Cloud deployment**: Set `DATA_DIR` env var; Turso/libSQL for multi-region replication
4. **Backup**: SQLite file can be copied directly or use `sqlite3 db.sqlite ".backup backup.sqlite"`

## AI & Search Providers

| Provider | Purpose | Configuration |
|----------|---------|--------------|
| NVIDIA NIM | Primary AI model | `NVIDIA_NIM_API_KEY` env var |
| Zhipu GLM | Fallback AI model | `GLM_API_KEY`, `GLM_BASE_URL` env vars |
| Ollama | Local model support | Configured via settings UI |
| OpenAI | Compatible provider | Configured via settings UI |
| Google Gemini | Compatible provider | `@google/genai` SDK |
| Brave Search | Web search API | `BRAVE_SEARCH_API_KEY` env var |

## DevOps & Deployment

| Tool | Purpose |
|------|---------|
| Docker + Docker Compose | Containerized deployment with persistent volumes |
| Next.js Standalone Output | Optimized production build (`output: 'standalone'`) |
| esbuild | Fast server bundling |
| Playwright | E2E testing across Chromium, Mobile Chrome, Mobile Safari |
| GitHub Actions | CI/CD pipeline (planned) |

### Deployment Targets

- **Docker** (recommended): `docker compose up -d`
- **Fly.io**: `fly launch` with persistent volume
- **Vercel**: Connect repo, set `DATA_DIR` to persistent storage path
- **Railway**: Connect repo, add persistent volume plugin

## Testing

| Type | Tool | Coverage |
|------|------|---------|
| E2E | Playwright | Navigation, library, discover, accessibility, export API |
| Browsers | Chromium, Pixel 5, iPhone 12 | Cross-device verification |
| Base URL | `http://localhost:8910` | Local dev server |

### Test Files

- `e2e/navigation.spec.ts` — Core navigation flows
- `e2e/navigation-improved.spec.ts` — Accessibility-focused navigation
- `e2e/library.spec.ts` — Library page CRUD
- `e2e/discover.spec.ts` — Discover page article loading
- `e2e/home.spec.ts` — Home page rendering
- `e2e/accessibility-spacing.spec.ts` — A11y and spacing audit
- `e2e/export-api.spec.ts` — Export functionality

## Design System

### Principles

- **1px outlines** — Containers defined by borders, never fills
- **Color spine** — 3px left-border accent on active cards/nav
- **Text-link actions** — No button backgrounds, icon + text hover responses
- **Whisper fill** — 3% opacity tint on hover/active states
- **8px grid** — All spacing multiples of 8

### Cognitive Science

- **Fitts's Law** — 44-48px minimum touch targets
- **Hick's Law** — 3 search modes, 3 nav items
- **Miller's Law** — Max 4 visible items before "show more"
- **Gestalt Proximity** — Related elements grouped
- **Von Restorff Effect** — Active states use accent color spine

### California Design Guidelines Compliance

- High contrast text (4.5:1+ ratio)
- Clear visual hierarchy with consistent type scale
- Accessible color tokens (not color-only indicators)
- Keyboard navigation with focus-visible rings
- Screen reader compatible with ARIA labels
- Responsive breakpoints: 320px, 768px, 1024px, 1440px

## Roadmap

### Phase 1 — Foundation (Current)
- [x] Next.js 16 monolith with App Router
- [x] SQLite + Drizzle ORM persistence
- [x] Docker Compose with named volumes
- [x] Agentic research loop (Speed/Balanced/Quality)
- [x] Real-time streaming with time-quantified loading
- [x] Library, Discover, Home pages
- [x] Playwright E2E test suite
- [x] California Design Guidelines compliance

### Phase 2 — Cloud & Scale
- [ ] Turso/libSQL cloud database integration
- [ ] PostgreSQL adapter option via Drizzle
- [ ] Multi-user authentication (session-based)
- [ ] Shared answer links (`/s/{slug}`)
- [ ] Bookmarking system
- [ ] GitHub Actions CI/CD pipeline

### Phase 3 — Intelligence
- [ ] pgvector embeddings for file search
- [ ] RAG over uploaded documents
- [ ] Multi-model provider registry (NIM, GLM, OpenAI, Gemini, local)
- [ ] Circuit breaker failover between providers
- [ ] Query classification to skip unnecessary searches

### Phase 4 — Community (Web Incubator Features)
- [ ] Public search sharing with permalinks
- [ ] Community-curated topic feeds
- [ ] Collaborative research sessions
- [ ] API access for third-party integrations
- [ ] Plugin system for custom search sources
- [ ] Open Graph previews for shared answers

### Phase 5 — Polish
- [ ] PWA with offline search history
- [ ] Voice input via Web Speech API
- [ ] Answer comparison (side-by-side mode)
- [ ] Keyboard-first power user mode
- [ ] Accessibility audit (WCAG 2.1 AAA target)
