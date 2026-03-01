# Perplexica — AI-Powered Search Engine

A self-hosted, privacy-focused alternative to Perplexity AI. Perplexica connects to the internet via the Brave Search API and uses NVIDIA NIM large language models to deliver cited, source-traceable answers.

**Live Demo**: [Perplexica on Replit](https://297bec06-8881-4546-810f-ddbda301226f-00-mrl12c9cfatp.riker.replit.dev)

> Based on [ItzCrazyKns/Perplexica](https://github.com/ItzCrazyKns/Perplexica), adapted for Replit deployment without Docker.

---

## Features

- **AI-Powered Web Search** — Ask questions in natural language, get answers with inline citations `[1][2]` linking back to sources
- **Source Traceability** — Click any source card to see the exact text extracted from that website and fed to the AI. Full transparency on how answers are formed
- **Multiple Search Modes** — Web, Academic, YouTube, Social/Reddit, Writing, Wolfram Alpha (requires API key)
- **NVIDIA NIM Models** — Kimi K2 Instruct (default, fast), Llama 3.3 70B, DeepSeek V3.2, Qwen 3.5 397B, and more
- **Brave Search API** — Structured search results with rich descriptions, rate-limited for free tier (1 req/sec)
- **Home Widgets** — Weather (Open-Meteo, no API key), Stock prices (Yahoo Finance), Calculator (mathjs)
- **Password Protection** — Basic auth via environment variable, HMAC-SHA256 signed session cookies
- **PWA Support** — Install as a native app on iPhone/Android from the browser. Standalone display, proper icons, viewport configuration
- **Dark Mode** — Full dark theme support with system preference detection
- **Chat History** — SQLite-backed conversation persistence with sidebar navigation

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Next.js App (port 5000)            │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Auth          │  │ Chat UI      │  │ API Routes │ │
│  │ Middleware     │  │ (React)      │  │ /api/*     │ │
│  └──────────────┘  └──────────────┘  └────────────┘ │
│         │                  │                │        │
│         │           ┌──────────────┐        │        │
│         │           │ Search Agents│        │        │
│         │           │ (LLM + RAG) │        │        │
│         │           └──────┬───────┘        │        │
│         │                  │                │        │
│         │     ┌────────────┼──────────┐     │        │
│         │     │            │          │     │        │
│  ┌──────┴──┐ ┌┴────────┐ ┌┴───────┐ ┌┴────┴──────┐ │
│  │ SQLite  │ │ NVIDIA  │ │Brave   │ │ Widgets    │ │
│  │ (Drizzle│ │ NIM API │ │Search  │ │ Weather/   │ │
│  │  ORM)   │ │         │ │Proxy   │ │ Stock/Calc │ │
│  └─────────┘ └─────────┘ │:4000   │ └────────────┘ │
│                           └────────┘                 │
└──────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, webpack) |
| Database | SQLite via better-sqlite3 + Drizzle ORM |
| AI Provider | NVIDIA NIM (OpenAI-compatible API) |
| Search | Brave Search API via custom proxy |
| Embeddings | NV EmbedQA E5 v5 |
| Styling | Tailwind CSS + shadcn components |
| Auth | HMAC-SHA256 session cookies (Edge Runtime compatible) |

## Setup

### Prerequisites

- NVIDIA NIM API key ([nvidia.com/nim](https://build.nvidia.com/explore/discover))
- Brave Search API key ([brave.com/search/api](https://brave.com/search/api/))
- Node.js 18+

### Environment Variables

Create a `.env.local` file:

```env
SEARXNG_API_URL=http://localhost:4000
NVIDIA_NIM_API_KEY=your_nvidia_nim_api_key
BRAVE_SEARCH_API_KEY=your_brave_search_api_key
```

Optional:
```env
AUTH_PASSWORD=your_password          # Enable password protection
SESSION_SECRET=your_session_secret   # HMAC signing key for sessions
GLM_API_KEY=your_glm_api_key        # Zhipu AI (GLM) as secondary provider
```

### Running Locally

```bash
# Install dependencies
npm install

# Start the search proxy (must run alongside the app)
node searxng-proxy.mjs &

# Start the Next.js app
npx next dev --webpack -p 5000
```

Or use the combined start script:
```bash
bash start.sh
```

### Deploying on Replit

1. Fork this project on Replit
2. Set the environment variables in Replit Secrets
3. Both workflows (SearxNG Proxy + Start application) will auto-start
4. Deploy as VM target (needs persistent proxy process + SQLite)

## PWA Installation (iPhone / Android)

1. Open the deployed URL in Safari (iOS) or Chrome (Android)
2. Tap **Share** → **Add to Home Screen**
3. The app will launch in standalone mode — no browser chrome, feels native

## Key Modifications from Upstream

This fork adapts Perplexica for Replit deployment without Docker and adds several enhancements:

- **No Docker dependency** — All services run natively via Node.js
- **NVIDIA NIM compatibility** — Modified OpenAI provider for non-OpenAI API quirks (streaming, tool calls, max_tokens)
- **Brave Search API** — Custom SearxNG-compatible proxy with rate limiting queue
- **Source traceability** — Collapsible extracted text panels on every source card
- **Password auth** — Edge Runtime compatible HMAC-SHA256 middleware
- **PWA support** — Full manifest, apple-touch-icon, viewport meta, standalone display
- **Weather widget fix** — ip-api.com fallback for geolocation

## Project Structure

```
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API routes (weather, auth, config, etc.)
│   │   ├── login/              # Login page
│   │   └── layout.tsx          # Root layout with PWA meta tags
│   ├── components/             # React components
│   │   ├── MessageSources.tsx  # Source cards with traceability
│   │   ├── WeatherWidget.tsx   # Weather home widget
│   │   └── Sidebar.tsx         # Navigation sidebar
│   ├── lib/
│   │   ├── agents/             # Search agents (web, academic, youtube, etc.)
│   │   ├── models/             # AI model providers
│   │   ├── config.ts           # Configuration manager
│   │   └── db/                 # SQLite + Drizzle ORM
│   └── middleware.ts           # Auth middleware (Edge Runtime)
├── searxng-proxy.mjs           # Brave Search API proxy
├── start.sh                    # Combined startup script
├── data/                       # Runtime data (SQLite DB, config)
└── public/                     # Static assets (icons, weather icons)
```

## License

Same license as upstream [Perplexica](https://github.com/ItzCrazyKns/Perplexica).
