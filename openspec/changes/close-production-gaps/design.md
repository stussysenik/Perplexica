# Design: Close Production Gaps

## Context

`VISION.md` promises a self-hosted, private, **resilient**, reproducible product.
The deployed reality (audited 2026-06-16) contradicts every one of those words at the
infrastructure layer. This document records the evidence, the decisions, the
explicitly-open questions, and the phased plan so the implementable scope stays tight
while the full roadmap ("cover all that") is captured in one place.

## Evidence (audited 2026-06-16, read-only)

### Security
| Check | Result | Source |
|---|---|---|
| Hetzner firewalls | **0** (both projects) | Cloud API `/v1/firewalls` |
| Coolify admin panel | `http://…:8000` — plain HTTP, public IP | `INFRASTRUCTURE.md:22` |
| `scrape_url` SSRF guard | **none** — fetches raw URLs from LLM tool calls | `phoenix/.../actions/scrape_url.ex` |
| SSH keys | 5, several stale/temp (`opencode-temp`, `*-v2/v3`, `byoa_key`) | Cloud API `/v1/ssh_keys` |
| `AUTH_BYPASS` | env flag disables all auth (warns when on) | `phoenix/config/runtime.exs:77` |
| Secrets in git | **clean** — `.env.local` gitignored, never committed, no hardcoded values | `git log/grep` |
| Secrets exposed otherwise | ~15 live creds in `.env.local` + pasted into a chat transcript | manual |

### Durability
| Check | Result |
|---|---|
| Hetzner volumes | **0** — DB lives on the 80 GB boot disk only |
| Automated backups | **disabled** (no backup window) |
| Snapshots/images | **0** — no recoverable copy of the box exists |
| Delete-protection | **off** |
| Private network | **0** — the `10.0.1.x` DB address in docs is stale |

### Persistence & source-of-truth
- Persistence code **is wired**: `search_resolver.ex` `ensure_chat_exists`/
  `ensure_message_exists` → `Repo.insert`; `session.ex` `save_answer_to_message` →
  `Repo.update_all`. So the app *should* be writing chats/messages.
- BUT the live DB target is **ambiguous**: `INFRASTRUCTURE.md` claims Perplexica uses
  both Supabase (`db.prhpdrfktooncxeoytfg`) *and* local pgvector `perplexica_prod`.
  Unconfirmed which `DATABASE_URL` Coolify injects, and whether rows actually exist.
- Railway (v1.0.0) user data was **never migrated** and is almost certainly purged.
  Treated as unrecoverable; not in scope.

### Infrastructure
- Single `cpx22` server **named `byoa`** (2 vCPU / 4 GB / 80 GB, nbg1-dc3) hosts both
  `perplexica.stussysenik.com` and `byoa.stussysenik.com` + Coolify + Traefik + pgvector.
- A second Hetzner project exists (`HETZNER_NEW_API_TOKEN`) but is **empty**.

## Decisions

1. **No SOC 2 / formal compliance.** It is process, not security, and wrong for this
   project. Security is prioritized by real blast radius instead.
2. **Network-edge firewall, not host-only.** Hetzner Cloud Firewall filters before the
   host, so Docker port re-publishing cannot re-expose Coolify/Postgres.
3. **Default-deny inbound.** Allow only: 22 (SSH, operator IP or key-only), 80/443
   (public app + ACME), 8000 (Coolify, operator IP only). Everything else blocked.
4. **SSRF guard via resolve-then-check.** Validate scheme (http/https), resolve the
   host, and reject RFC-1918 / loopback / link-local / `169.254.169.254` / `::1` /
   ULA — checked *after* DNS resolution to defeat rebinding-by-name.
5. **One canonical database.** Eliminate the dual-DB ambiguity. Recommendation:
   **self-hosted pgvector on the Hetzner box with automated `pg_dump` backups** —
   keeps data on owned infra (privacy value) and avoids Supabase free-tier's 7-day
   sleep (a portfolio-killer). *Open* (see below) — final pick gated on Phase 0.
6. **Backups are non-negotiable and restore-tested.** A backup that has never been
   restored is not a backup. Phase 2 includes a restore drill into a throwaway DB.
7. **Isolate, don't upsize.** Move Perplexica to its own project/server. The 2nd-server
   cost (~€8/mo) is an explicit user decision, not assumed.
8. **AI orchestration stays in Phoenix for now.** Reject Convex (replaces Phoenix,
   won't fit 4 GB) and LangChain (redundant). DSPy + LLM tracing are deferred to a
   separate change so this one stays tight.

## Open questions (resolve during Phase 0 / before apply)

- **OQ-1 (DB):** Which DB does prod actually write to today, and how many rows exist?
  → answered by SSH'ing in and inspecting Coolify's injected `DATABASE_URL` + counts.
- **OQ-2 (DB target):** After OQ-1, standardize on self-hosted pgvector (recommended)
  or Supabase? Trade-off: owned/private/no-sleep vs managed/zero-ops/limited backups.
- **OQ-3 (split):** Which service moves to the new project — Perplexica or BYOA? And is
  the ~€8/mo second server approved?
- **OQ-4 (SSH source):** Operator's stable public IP for firewall rules, or keep 22
  open with key-only + fail2ban?

## Phased plan (maps to `tasks.md`)

- **Phase 0 — Containment & ground truth.** Snapshot + delete-protection; firewall;
  confirm DB target and row counts; verify `AUTH_BYPASS` unset in prod. *Stops data
  loss and closes the open admin panel first.*
- **Phase 1 — Security hardening.** SSRF guard in `scrape_url`; prune stale SSH keys;
  rotate exposed secrets; ensure no plain-HTTP admin.
- **Phase 2 — Durability & single source of truth.** Resolve DB (OQ-2); automated
  backups; restore drill; correct `INFRASTRUCTURE.md`.
- **Phase 3 — Infrastructure isolation.** Provision dedicated project/server (OQ-3);
  migrate Perplexica with a verified backup; cut DNS; decommission old co-tenancy.
- **Phase 4 — LLM observability.** Confirm Sentry/PostHog/Telemetry actually fire;
  add free-tier/self-hostable LLM cost + trace visibility (no Convex/LangChain).

## Future changes (out of scope here, captured so nothing is lost)

- `add-dspy-answer-service` — extract LLM answer generation to a lightweight Python
  FastAPI + DSPy service calling NIM/GLM; optional LangSmith/Langfuse free traces.
- `add-local-first-sync` — Automerge or ElectricSQL offline + sync ("the CRDT sell").
- `consolidate-monorepo` — archive dead app generations (untracked → `tar` before
  removing); drop the root pnpm/Turbo experiment (Redwood is a Yarn 4 workspace);
  docker-compose / `dev` script as the polyglot orchestrator.
