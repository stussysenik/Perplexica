# VISION.md

## Table of Contents

- [Mission](#mission)
- [Core Values](#core-values)
- [User Personas](#user-personas)
- [Product Vision](#product-vision)
- [Design Philosophy](#design-philosophy)
- [Technical North Stars](#technical-north-stars)
- [Data Persistence Vision](#data-persistence-vision)
- [Community & Web Incubator Vision](#community--web-incubator-vision)
- [Success Metrics](#success-metrics)
- [Anti-Vision](#anti-vision)

## Mission

Perplexica makes research-grade AI search accessible to everyone — self-hosted, private, and transparent. Every answer shows its sources. Every claim is traceable. Every search is reproducible.

## Core Values

1. **Transparency** — Every AI answer links back to its sources. No black boxes.
2. **Privacy** — Your data stays on your infrastructure. No tracking, no profiling.
3. **Resilience** — Fault-tolerant by design. One failure doesn't cascade.
4. **Accessibility** — California Design Guidelines: clear, inclusive, usable by everyone.
5. **Reproducibility** — Every search can be saved, shared, and replayed.

## User Personas

### The Researcher
- Needs cited, source-traceable answers
- Values accuracy over speed
- Wants to verify claims independently
- Key flow: Query → Cited Answer → Source Verification

### The Developer
- Self-hostes on personal infrastructure
- Values API access and extensibility
- Wants to integrate search into workflows
- Key flow: Setup → Configure Providers → API Integration

### The Curious Explorer
- Asks broad questions across topics
- Values discoverability and browsing
- Wants to learn without friction
- Key flow: Discover → Topic → Deep Dive → Library

## Product Vision

### Near-Term (3 months)
A stable, self-hosted AI search engine with:
- One-command Docker deployment
- Persistent data across restarts
- Time-quantified loading feedback
- Verified single-click navigation to all pages
- Playwright-tested cross-device compatibility

### Mid-Term (6 months)
A collaborative research platform:
- Multi-user with shared search history
- Community topic feeds and curated collections
- API access for programmatic search
- Plugin system for custom data sources

### Long-Term (12 months)
The open-source standard for transparent AI search:
- Self-hosting in under 5 minutes
- Real-time collaborative research sessions
- Answer comparison and verification tools
- Full WCAG 2.1 AAA accessibility

## Design Philosophy

### California Design Guidelines

We follow California's digital accessibility standards:

- **Readability**: Minimum 16px body text, 4.5:1 contrast ratio
- **Clarity**: One action per element, clear labels, no ambiguity
- **Responsiveness**: Tested at 320px, 768px, 1024px, 1440px
- **Inclusivity**: Screen reader compatible, keyboard navigable, reduced-motion support
- **Simplicity**: The simplest interface that solves the problem

### Neuroscience-Informed Design

- **Fitts's Law**: 48px touch targets for mobile, larger targets for frequent actions
- **Hick's Law**: 3 search modes, 3 nav items — minimize decision fatigue
- **Miller's Law**: 4±1 items visible before "show more"
- **Von Restorff Effect**: Active elements use accent color spine
- **Zeigarnik Effect**: Progress indicators show completion status

### Motion

- All animations under 300ms
- `ease-out` for entering, `ease-in-out` for morphing
- `prefers-reduced-motion` globally respected
- Staggered reveals at 50ms intervals

## Technical North Stars

1. **One-command deployment** — `docker compose up` gives you a working app
2. **Zero data loss** — Named volumes, SQLite backups, cloud DB option
3. **Sub-second navigation** — Every page loads in one click, no double-refresh
4. **Transparent loading** — Time-quantified feedback, no silent spinners
5. **Test-verified** — Every navigation flow has a Playwright test

## Data Persistence Vision

Data persistence is non-negotiable. Your search history, chat sessions, and configuration must survive restarts, deployments, and infrastructure changes.

### Strategy

| Tier | Technology | Use Case |
|------|-----------|----------|
| **Local** | SQLite + Docker volume | Single-server deployment |
| **Cloud** | Turso/libSQL | Multi-region, edge deployment |
| **Enterprise** | PostgreSQL + pgvector | Scale, embeddings, advanced queries |

### Principles

- Default to SQLite (zero-config, embedded, fast)
- Docker named volumes for persistence across container restarts
- `DATA_DIR` env var for flexible storage location
- Drizzle ORM abstracts the database layer — swap SQLite for Turso or PostgreSQL with config changes only
- Always backup before migration

## Community & Web Incubator Vision

Perplexica isn't just a search engine — it's a platform for collaborative research.

### Planned Features

- **Shared Search Links** — Permalink to any answer, readable without login
- **Community Topics** — Curated feeds of research on trending topics
- **Collaborative Sessions** — Real-time research with multiple participants
- **API Access** — Programmatic search for integrations and automations
- **Plugin System** — Custom search sources, AI providers, and UI extensions
- **Open Graph Previews** — Rich link previews when sharing on social platforms

### Governance

- Open-source contributions welcome
- Plugin ecosystem with review process
- Community topic curation with moderation
- API rate limiting for fair usage

## Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Deployment time | < 5 minutes | ~10 minutes |
| Page load (Library) | < 1 click, < 500ms | Fixed: 1 click |
| Loading feedback | Time-quantified | Implemented |
| Data persistence | Zero loss across restarts | Docker volumes |
| Lighthouse Accessibility | 100 | 100 |
| Playwright test coverage | All navigation paths | 7 test files |
| WCAG compliance | AA (AAA target) | AA |

## Anti-Vision

Perplexica is NOT:

- A chatbot with hidden sources
- A SaaS product with vendor lock-in
- A data collection platform
- A replacement for human judgment
- An ad-supported search engine
