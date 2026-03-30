# Perplexica

## Overview

Perplexica is an AI-powered search engine that uses agentic research loops to answer questions with source traceability. It classifies queries, runs parallel web/academic/social searches, scrapes and processes results, and streams structured responses with citations.

## Current State

- **Stack**: Next.js 16 (App Router), React 18, Tailwind CSS, Drizzle ORM, SQLite
- **AI Providers**: NVIDIA NIM (primary), Zhipu GLM (secondary), OpenAI-compatible API
- **Search**: Brave Search API via custom SearxNG-compatible proxy (`searxng-proxy.mjs`)
- **Deployment**: Replit (dev server mode — `next build` times out)
- **Auth**: HMAC-SHA256 session cookies via Next.js middleware

## Architecture

### Search Pipeline
1. Query classification via LLM (structured output with Zod)
2. Parallel widget execution (weather, stock, calculation)
3. Agentic researcher loop (2-25 iterations based on speed/balanced/quality mode)
4. Action registry: web_search, scrape_url, academic_search, discussion_search, uploads_search, done
5. Context assembly + streaming LLM answer generation

### Streaming Protocol
- In-memory `SessionManager` using Node.js `EventEmitter` on a global `Map`
- Block types: TextBlock, SourceBlock, SuggestionBlock, WidgetBlock, ResearchBlock
- Incremental updates via RFC-6902 JSON patches
- NDJSON over HTTP response stream

### Data
- SQLite with Drizzle ORM
- Tables: `messages` (query, responseBlocks, status), `chats` (title, sources, files)
- File uploads: PDF/DOCX/TXT with chunk embeddings stored as JSON files

## Known Issues

1. Replit deployment auto-dies (process sleeping, build timeouts)
2. In-memory sessions lost on crash (no supervision, no persistence)
3. No observability (no error tracking, no analytics)
4. Single-process architecture — no crash isolation
5. File-based config (`data/config.json`) — not suitable for multi-instance
