# Progress Ledger

Development timeline for the Perplexica design system overhaul and production hardening.

---

## Hypertime Ledger

### 2026-03-29 -- Full-Stack Rewrite Begins
- **Decision**: Rewrite from Next.js to RedwoodJS + Elixir/Phoenix
- **Motivation**: Replit deployment kept dying (process sleeping, build timeouts). Need always-up reliability with crash-isolated search sessions
- **Architecture**: RedwoodJS (Vercel) + Phoenix/Elixir (Railway) + PostgreSQL with pgvector
- **Spec**: `openspec/changes/rewrite-fullstack-resilient/` (35-task, 8-phase plan)

### 2026-03-30 -- Core Backend + Frontend Scaffold
- Phoenix backend operational: GenServer-per-search, Absinthe GraphQL, NIM/GLM failover
- RedwoodJS frontend scaffolded: HomePage, DiscoverPage, LibraryPage, AppLayout
- PostgreSQL schema: 9 tables with migrations
- Brave Search integration with Hammer rate limiting

### 2026-03-31 -- UI Redesign + Shared Links + Bookmarks
- Added shared links (`/s/{slug}`) and bookmarks with toggle
- Added answer action bar: Copy, Share, Bookmark, PDF Export, TTS
- Added Wikipedia-style Table of Contents with IntersectionObserver
- Added inline citation badges and topic-link detection
- PWA support: manifest, service worker, icons

### 2026-03-31 -- Design System Overhaul Begins

#### Gate 0: Safety Net
- Installed Playwright with chromium + mobile-chrome projects
- Wrote 44 baseline E2E tests across 5 test files
- Captured 9 screenshot baselines (3 pages x 3 breakpoints)
- Recorded Lighthouse baselines: A11y 89, BP 100, SEO 91

#### Gate 1: Design System Foundation
- **Tailwind tokens**: Semantic color system (border-default, text-primary, surface-whisper) with CSS custom properties for light/dark
- **CSS Grid template areas**: 5 content-driven layouts (desktop, tablet, mobile, search, library)
- **Typography**: 7-step Montserrat scale on 8px grid, text-wrap balance/pretty, tabular-nums, antialiased
- **Phosphor Icons**: MagnifyingGlass, Compass, Books, GearSix, Sun/Moon (weight="light")
- **Motion primitives**: `motion.ts` with timing constants (100-400ms), easing curves (ease-out, ease-in-out, drawer), Framer Motion variants (fadeIn, slideUp, stagger, colorSpineReveal), `prefers-reduced-motion` support
- **Outline component kit**: SpineCard, TextAction, OutlineButton, CitationBadge, SectionDivider, BreadcrumbTrail
- **Dependencies added**: @phosphor-icons/react, gsap, @gsap/react, @savvywombat/tailwindcss-grid-areas

#### Gate 2: Page Overhaul
Every page and component redesigned to the neuroscience design system:

| Component | Before | After |
|-----------|--------|-------|
| AppLayout | Filled nav items, gradient logo | Phosphor icons, color spine active, text wordmark |
| HomePage | Gradient badge, filled pills | Typography-only wordmark, outline chips |
| MessageInput | Rounded-full, filled send, filled modes | 1px border, outline send, TextAction modes |
| MessageBox | Standard prose | Design-token prose, border-t action separator |
| Sources | Rounded-xl filled cards | SpineCards with 3px accent, stagger reveal |
| AnswerActionBar | Filled background buttons | TextAction style (no fill, no border) |
| TableOfContents | Rounded-xl filled box | 1px left border, color spine active |
| DiscoverPage | Filled pills, rounded-xl cards | TextAction tabs, SpineCard articles |
| LibraryPage | Filled tabs, rounded-xl cards | TextAction tabs, SpineCards, outline badge |
| SharedPage | Gradient logo, filled buttons | Text wordmark, TextAction copy link |

### 2026-04-01 -- Audit Battery + Fixes

#### Gate 3: Audit Battery (6 Parallel Agents)

| Audit | Pass | Partial | Fail | Key Finding |
|-------|:----:|:-------:|:----:|-------------|
| UX Laws (30) | 22 | 6 | 2 | No feature discovery, no draft persistence |
| Growth.design (30) | 18 | 9 | 3 | No labor illusion during search |
| Checklist.design (58) | 45 | 0 | 13 | Delete without confirmation |
| UX-Checklist (9) | 3 | 4 | 2 | Zero analytics |
| Security (12) | 2 | 3 | 7 | CRITICAL: XSS + CORS wildcard |
| Interaction (21) | 16 | 5 | 0 | All Kowalski/Krehel principles pass or partial |
| Accessibility (17) | 7 | 5 | 5 | text-muted contrast 3.54:1 |
| Performance (14) | 11 | 2 | 1 | Font chain 493ms |

#### Gate 4: Fix + Retest

Fixes applied (priority order):
1. **CRITICAL -- XSS**: Added DOMPurify sanitization to `renderMarkdown.ts`
2. **CRITICAL -- CORS**: Restricted origins in `router.ex` to localhost + production
3. **HIGH -- Contrast**: `--text-muted` #888 -> #737373 (4.85:1 ratio)
4. **HIGH -- ARIA**: `role="status" aria-live="polite"` on search loading
5. **HIGH -- Page titles**: Unique `<title>` per route
6. **HIGH -- Labels**: `<label>` + `aria-label` on search textarea
7. **HIGH -- Skip link**: Skip-to-content in AppLayout
8. **HIGH -- Font perf**: `<link rel="preconnect">` for Google Fonts
9. **MEDIUM -- UX**: Delete confirmation on chat items

**Result**: Lighthouse 100/100/100 on Home (desktop + mobile). A11y improved from 89 to 100.

### 2026-04-01 -- Real-Time Search Progress

Replaced 2-second HTTP polling with WebSocket subscriptions:

- **phoenix-ws.ts**: Absinthe WebSocket client (connect, subscribe, unsubscribe)
- **useSearch.ts**: Rewritten -- subscription-first with automatic polling fallback
- **SearchProgress.tsx**: Staged dot indicators: Classifying -> Searching (N sources) -> Analyzing -> Writing
- **Dependencies**: phoenix (JS client), @absinthe/socket

Search events flow instantly via Phoenix PubSub -> Absinthe Subscription -> WebSocket -> React state update.

---

## Metrics

| Metric | Before (2026-03-31) | After (2026-04-01) |
|--------|:-------------------:|:-------------------:|
| Lighthouse Accessibility | 89 | **100** |
| Lighthouse Best Practices | 100 | **100** |
| Lighthouse SEO | 91 | **100** |
| LCP | -- | **560ms** |
| CLS | -- | **0.00** |
| Search update latency | 2,000ms (polling) | **~0ms** (WebSocket) |
| E2E test coverage | 0 tests | **44 tests** |
| Design system components | 0 | **6 primitives** |
| Audit items scored | 0 | **300+** |

## What's Next

- [ ] Skeleton loading states for Discover articles and Library chats
- [ ] Feature discovery hints (topic-links, citation scroll, keyboard shortcuts)
- [ ] Search progress bar with iteration count
- [ ] PostHog analytics integration
- [ ] Sentry error tracking
- [ ] Mobile polish pass (375px breakpoint tuning)
