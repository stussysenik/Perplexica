# PROGRESSION.md

> How Perplexica actually moved — the sporadic efforts narrated into one line, so we
> can finally pick it up and finish it as the version it should be *today*.
>
> Reconstructed from git history (43 commits, 2026-03-01 → 2026-06), the deploy docs,
> and a live infrastructure audit (2026-06-16). This is the "you are here" map.

## North Star — the common thing

Strip away every framework and host and one organism remains across all versions:

> **A question becomes an answer you can _audit_ — every claim traced to a source, the
> research shown as it happens, and the whole thing saved so it can be re-opened,
> shared, and replayed.**

The product is not a stack — it's that **auditable research record**. The record is
sovereign; the techstack is a replaceable renderer. This is why the data loss hurt (we
lost the product, not the shell), why "local-first / where's my data" kept recurring,
and why finishing means making the record durable + portable + verifiable first. Get
that right and a **mobile client is free** — same record, new renderer.

## The one-line story

**Replit (Next.js prototype) → full rewrite to RedwoodJS + Elixir/Phoenix → Fly.io &
NixOS experiments → Railway v1.0.0 (first real production) → Hetzner migration (data
left behind) → now: stop sprawling, harden, and finish.**

## Timeline

| Date | Milestone | Stack / Environment |
|------|-----------|---------------------|
| 2026-03-01 | Initial commit — Perplexica AI search (NVIDIA NIM + Brave) | **Next.js 16 + SQLite/Drizzle**, on **Replit** |
| 2026-03-01 | Early security hardening (timing-safe compare, signed cookies) | Next.js |
| 2026-03-30 | **Full-stack rewrite begins** — RedwoodJS + Elixir/Phoenix + PostgreSQL | Redwood + Phoenix |
| 2026-03-30 | First deploy attempt — **Fly.io** config + Docker | Fly.io |
| 2026-03-31 → 04-01 | PWA, neuroscience design system, 5-gate audit, demo GIFs | Redwood |
| 2026-04-11 | Data persistence, single-click nav, `TECHSTACK.md` + `VISION.md` | Redwood + Phoenix |
| 2026-04-12 | Linear 2D flat UI redesign; **NixOS** deploy; "impeccable" design overhaul | Fly.io / NixOS |
| 2026-04-13 | Legacy Next.js tree removed; deployment consolidated at root for **Railway** | Railway |
| 2026-04-13 | GitHub OAuth gate, search-mode config, Exa provider; light-default theme | Phoenix + Redwood |
| 2026-04-13 | **🏁 v1.0.0 — first production ship** (single-binary Phoenix serving Redwood) | **Railway** (`perplexica-production-41f5.up.railway.app`) |
| 2026-05-16 | **Migrated to Hetzner** (Coolify/Traefik). **Railway user data NOT migrated** — fresh DB | **Hetzner** (`perplexica.stussysenik.com`) |
| 2026-05-29 | Archive backup before desktop cleanup | — |
| 2026-06-04 | First (incomplete) pnpm-workspace / monorepo attempt | — |
| 2026-06 (current) | Restore answer generation, centralize AI layer, a11y to 100, e2e alignment | Phoenix + Redwood, `feat/hetzner-migration` |
| 2026-06-16 | **Live audit** → security + durability gaps found → `close-production-gaps` proposal | — |

## Eras (the narrative)

### Era 0 — The Replit prototype (Mar 1)
A working Next.js 16 app: NVIDIA NIM + Brave search, SQLite/Drizzle, HMAC session
cookies. Proved the agentic search idea. Constraint that ended it: Replit's dev-server
mode (`next build` timed out) and process sleeping lost in-memory search sessions.

### Era 1 — The resilient rewrite (Mar 30 – Apr 12)
Decision: rebuild for reliability *and* to learn Elixir/Zig. RedwoodJS frontend +
Elixir/Phoenix backend (GenServer-per-search supervision, Absinthe streaming) +
PostgreSQL. Lots of parallel design work (PWA, neuroscience design system, multiple UI
overhauls) and **deploy-target churn**: Fly.io, then NixOS, then settling toward Railway.

### Era 2 — First production: Railway v1.0.0 (Apr 13)
The real milestone. GitHub OAuth allowlist gate, four-tab library, per-step search
progress, single-binary deploy (Phoenix serves the compiled Redwood app). This is the
version that actually worked for users.

### Era 3 — The Hetzner migration & the data gap (May 16)
Moved off Railway (stopped paying) onto a self-hosted Hetzner box (Coolify + Traefik).
**The Railway PostgreSQL data was never migrated** — Hetzner started fresh. Same story
as the abandoned Fly.io effort: managed-service data left stranded. This is the origin
of "where is my data?"

### Era 4 — Now: consolidate, harden, finish (Jun)
The repo currently carries **multiple coexisting generations** (dead Next.js v0,
`legacy-nextjs/`, a committed `.next/` build, three package managers) and the deployed
box has **no firewall, no backups, and an ambiguous database**. The goal is no longer to
add — it's to *finish*.

## Where it should be today (the target)

The canonical, finished version — finish what's started, drop what isn't load-bearing:

- **Frontend**: RedwoodJS (Yarn 4 workspace — stays Yarn). Wire **Effect.ts** into the
  one seam that benefits (the Phoenix API / search-stream client: typed errors, retries,
  cancellation). **Do not** add RxJS — it's redundant with Effect and isn't actually a
  dependency.
- **Backend**: Phoenix stays the spine (agentic loop, supervision, streaming, persistence).
- **Search**: SearXNG / Brave / Exa. **Parser**: Zig (stretch).
- **Data**: ONE canonical database with automated, restore-tested backups — see
  `openspec/changes/close-production-gaps/` (data-durability).
- **Security**: firewall, SSRF guard, no plain-HTTP admin, rotated secrets — same change.
- **Infra**: Perplexica isolated in its own Hetzner project (off the shared `byoa` box).
- **Repo**: one package-manager story (kill the dead v0 npm root + the half-baked pnpm
  attempt); polyglot services orchestrated by docker-compose / Turbo task-runner; dead
  generations archived then removed.
- **Explicitly NOT**: Convex (would be a third rewrite + repeats the managed-service
  data trap), LangChain, SOC 2.

### Deferred, on purpose (so they don't reappear as scope creep)
- `add-dspy-answer-service` — Python DSPy answer engine (prompt optimization).
- `add-local-first-sync` — Automerge / ElectricSQL (the CRDT "sell").
- `consolidate-monorepo` — repo cleanup + Turbo/pnpm organization.

## Decision log (why the version is what it is)
- **Reliability drove the rewrite** off Next.js/Replit (process sleeping ate sessions).
- **Self-hosting drove the move** off Railway/Fly (cost) → but cost us the data twice.
- **Finish > restart**: hardening the working Phoenix/Redwood product beats rebuilding
  on Convex; the real problems (security, durability, data access) travel with a rewrite.
- **Tools already chosen** (Effect.ts) get *wired or removed* — no new paradigms (RxJS,
  Convex) bolted on while core gaps remain open.

## Next session — start here

**Decided & ready:** finish (not restart); record is sovereign; no Convex/LangChain/SOC2;
Effect.ts wired in one seam or removed (currently 0 imports); RxJS dropped (not a real dep).

**OpenSpec to apply:** `openspec/changes/close-production-gaps/` (Draft) — run
`openspec validate close-production-gaps --strict` (install CLI first), then
`openspec:apply` starting at **Phase 0**.

**First action (urgent):** Phase 0 — SSH in (`ssh hetzner`), find which DB Coolify
injects (Supabase vs local pgvector), count rows in `chats`/`messages` (answers "where
is my data + is it saving"), then snapshot + delete-protection + firewall.

**4 open questions gating apply** (see `design.md`): OQ-1 which DB is live (resolved by
the SSH check); OQ-2 self-hosted pgvector (recommended) vs Supabase; OQ-3 which service
moves to the new empty Hetzner project + €8/mo 2nd server; OQ-4 operator SSH IP for the
firewall rule.

**Cleanup state:** dead untracked trees + junk removed (archived to
`~/Desktop/Perplexica-archive-2026-06-16.tgz`). **Still to do** in a future
`consolidate-monorepo` change: the entangled root v0 leftovers (`package.json`/
`package-lock.json`/`drizzle/`/`data/`/`fly.toml`/`railway.json`) — left in place because
e2e/Playwright may still reference root devDeps; verify before removing. Then write the
correct `turbo.json` + `pnpm-workspace.yaml` (Redwood stays a Yarn island).

**Deferred changes (named, not lost):** `add-dspy-answer-service`,
`add-local-first-sync` (the CRDT/mobile "sovereign record" expression),
`consolidate-monorepo`.
