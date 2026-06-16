# Proposal: Close Production Gaps (Security, Durability, Infra Isolation)

## Change ID
`close-production-gaps`

## Status
Draft

## Motivation

The `rewrite-fullstack-resilient` change delivered the *core* product (Phoenix +
RedwoodJS, agentic search, persistence schema) and it is deployed live on Hetzner.
But that proposal was written against a Railway + Vercel target and never covered
what it actually takes to run the product safely in production. A live audit
(2026-06-16) found the deployed system has **no security posture and no data
durability** — the kind of gaps that don't show up in a demo but make the product
unfit to hand to real users.

Verified findings (evidence in `design.md`):

- **Security — server is wide open.** Hetzner project has **0 firewalls** → every
  open port faces the internet. The Coolify admin panel is served over **plain HTTP
  on a public IP** (`http://178.105.136.131:8000`). `scrape_url` performs
  **server-side fetches of arbitrary URLs with no SSRF guard**. Five SSH keys exist,
  several stale/temporary. `AUTH_BYPASS` can disable all auth via one env var.
- **Data durability — none.** **0 Hetzner volumes**, automated **backups disabled**,
  **0 snapshots**, server **delete-protection off**. A rebuild or `rm` permanently
  destroys all data.
- **Data source-of-truth is ambiguous.** `INFRASTRUCTURE.md` contradicts itself:
  Perplexica's DB is documented as *both* Supabase *and* a local pgvector container.
  We have not confirmed which one prod writes to, or that user searches are persisting.
- **Infra is co-tenanted.** A single 4 GB box (named `byoa`) hosts both Perplexica
  and BYOA. A dedicated, empty Hetzner project now exists but nothing is provisioned.

Secondary intent (the original learning + portfolio goal stands): make the project a
*credible* self-hosted, private, resilient product — the values stated in `VISION.md`
— rather than a demo that silently loses data and exposes its own control plane.

## Scope

**In scope** — the production-readiness gaps, sequenced into phases:

1. **Containment & ground truth** — confirm what prod actually does (which DB, are
   rows being written), and stop the bleeding (firewall, snapshot) before any change.
2. **Security hardening** — firewall, SSRF guard, SSH-key hygiene, admin-panel
   exposure, `AUTH_BYPASS` production guard, secret rotation for exposed credentials.
3. **Data durability & single source of truth** — resolve the DB ambiguity, enforce
   one canonical database, automated backups, and a tested restore path.
4. **Infrastructure isolation** — move Perplexica into its own Hetzner project/server
   so it no longer shares a box with BYOA.
5. **Observability of the LLM path** — verify error tracking works and add
   free-tier/self-hostable LLM cost + trace visibility.

**Out of scope (tracked as separate future changes, summarized in `design.md`):**

- AI brain extraction to a Python DSPy service → future change `add-dspy-answer-service`.
- Local-first / CRDT sync (Automerge or ElectricSQL) → future change `add-local-first-sync`.
- Monorepo/tooling consolidation (drop root pnpm/Turbo experiment; docker-compose as
  orchestrator; Redwood stays a Yarn workspace) → future change `consolidate-monorepo`.
- SOC 2 / formal compliance — explicitly **not pursued**; it is audit process, not
  security, and is inappropriate for a solo, allowlist-gated project.

## Approach (summary — full reasoning in `design.md`)

- **Security that actually works, not theater.** Prioritize by real blast radius:
  network exposure (firewall) and control-plane exposure (Coolify over HTTP) first;
  then app-layer SSRF; then access hygiene (SSH keys, secret rotation).
- **Network-edge enforcement.** Use a Hetzner Cloud Firewall (blocks before Docker
  publishes ports), not just host `ufw`, so Coolify/Postgres can't be reached even if
  a container re-exposes them.
- **One canonical database with real backups.** Pick a single DB (recommendation in
  `design.md`), prove writes land in it, and never run without an automated, *restore-
  tested* backup.
- **Isolation over a bigger box.** Separate Perplexica from BYOA into its own project;
  treat the second-server cost as an explicit, user-owned decision.
- **Free-tier / self-host constraint is binding.** Every tool choice must be $0 or
  self-hostable on the available hardware.

## Impact

### What changes
- New Hetzner Cloud Firewall attached to the Perplexica server (default-deny inbound).
- `scrape_url` gains URL validation (scheme allowlist + private/loopback/link-local/
  metadata blocklist with DNS-resolution check).
- Coolify admin access restricted to an operator allowlist; no plain-HTTP admin.
- Automated DB backups + server snapshot + delete-protection enabled.
- `INFRASTRUCTURE.md` corrected to a single, accurate DB + network description.
- Exposed credentials (Spaceship DNS, Supabase password, Hetzner token) rotated.

### What's preserved
- The deployed app's behavior, search pipeline, auth model (GitHub OAuth allowlist),
  and persistence schema from `rewrite-fullstack-resilient`.
- The free-tier / self-hosted hosting model and `VISION.md` values.

### Risk
- A misconfigured firewall can lock the operator out → mitigated by Hetzner web
  console fallback and an explicit "verify SSH reachable" task before relying on it.
- DB cut-over (if Supabase→pgvector or vice-versa) risks data loss → gated behind a
  successful backup + restore drill (Phase 0/2 ordering).
