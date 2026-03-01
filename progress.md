# Perplexica on Replit — Development Progress

## Project Goal

Set up the full Perplexica AI-powered search engine on Replit without Docker, integrated with NVIDIA NIM (primary) and Brave Search API, with password-protected deployment and source traceability.

---

## Completed Work

### Phase 1: Initial Setup & NVIDIA NIM Integration

- Forked Perplexica codebase and adapted for Replit (no Docker)
- Configured NVIDIA NIM as primary AI provider via OpenAI-compatible API
- Added multiple NIM models: Kimi K2 Instruct (default), Llama 3.3 70B, DeepSeek V3.2, Qwen 3.5 397B, Llama 3.1 405B, Mistral Large 3 675B
- Modified `openaiLLM.ts` for non-OpenAI provider compatibility:
  - Standard `chat.completions.create` instead of `parse()` with structured outputs
  - Streaming chat completions instead of `responses.stream()`
  - `max_tokens` instead of `max_completion_tokens`
  - Manual Zod-to-description conversion for Zod v3 compatibility
  - 120s timeout for slower models
- Configured NV EmbedQA E5 v5 embeddings with asymmetric `input_type` support
- Added GLM (Zhipu AI) as secondary provider

### Phase 2: Brave Search API Integration

- Replaced SearxNG HTML scraping with official Brave Search API
- Built custom `searxng-proxy.mjs` — SearxNG-compatible proxy returning structured JSON
- Added 1 req/sec rate-limiting queue for Brave free tier (2000 queries/month)
- Verified end-to-end: 19 sources, correct answers, ~21 seconds per query
- All search modes (Web, Academic, Social, YouTube) route through the Brave proxy

### Phase 3: Source Traceability

- Added collapsible "View extracted text" panel on every source card in `MessageSources.tsx`
- Each source shows the exact snippet/content extracted from the website and fed to the AI
- Provides full information flow visibility: source URL → extracted text → AI answer with citations
- Users can now verify and trace how the AI formed its response

### Phase 4: Authentication

- Added basic password auth via Next.js middleware (`src/middleware.ts`)
- Login page at `/login` with clean UI matching Perplexica's design
- HMAC-SHA256 session tokens using Web Crypto API (Edge Runtime compatible)
- 30-day cookie expiry, `httpOnly` + `secure` + `sameSite` flags
- `AUTH_PASSWORD` stored as Replit Secret, `SESSION_SECRET` for signing
- Static assets (icons, weather icons, fonts) excluded from auth

### Phase 5: Weather Widget Fix

- Fixed geolocation provider: switched from ipwhois.app to ip-api.com as fallback
- Fixed weather API route switch statement fallthrough bugs
- Weather widget now shows current conditions on the home screen
- Uses Open-Meteo (free, no API key required)

### Phase 6: PWA Support

- Updated `manifest.ts` with full PWA configuration (standalone, portrait, categories)
- Generated icon sizes: 180x180 (Apple), 192x192 (PWA standard), 512x512 (splash)
- Added `apple-mobile-web-app-capable` and `apple-mobile-web-app-status-bar-style` meta tags
- Added apple-touch-icon link for iOS home screen icon
- Configured viewport meta with `viewport-fit: cover` for edge-to-edge display
- Dynamic theme color (light/dark) based on system preference
- Updated middleware to allow manifest and icon files through auth

### Phase 7: Deployment Configuration

- Created `start.sh` to run both SearxNG proxy and Next.js together
- Configured VM deployment target (persistent proxy process + SQLite)
- Dev server deployment (`npx next dev --webpack -p 5000`) — `next build` times out on Replit

---

## Known Limitations

1. **`next build` times out on Replit** — Using dev server for deployment instead of production build
2. **GLM provider has insufficient balance** — Kept as secondary, NVIDIA NIM is primary
3. **WolframAlpha widget** — Requires separate API key (not configured)
4. **Brave Search free tier** — Limited to 2000 queries/month, rate-limited to 1 req/sec
5. **Initial compilation** — First page load takes ~8-23s (webpack compilation), subsequent loads are fast
6. **Next.js 16 deprecation warning** — "middleware" convention deprecated in favor of "proxy" (non-breaking)

---

## Environment Variables Required

| Variable | Required | Description |
|----------|----------|-------------|
| `NVIDIA_NIM_API_KEY` | Yes | NVIDIA NIM API key for LLM and embeddings |
| `BRAVE_SEARCH_API_KEY` | Yes | Brave Search API key for web search |
| `AUTH_PASSWORD` | Optional | Password for basic auth (if not set, no auth) |
| `SESSION_SECRET` | Optional | HMAC signing key for session cookies |
| `GLM_API_KEY` | Optional | Zhipu AI (GLM) API key for secondary provider |
| `SEARXNG_API_URL` | Set | Always `http://localhost:4000` (local proxy) |
