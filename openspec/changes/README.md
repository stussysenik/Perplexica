# OpenSpec Change Board

This is the **source of truth for task status**. Folder location encodes lifecycle:

- Top-level `changes/<id>/` → **open** (active or deliberately deferred).
- `changes/archive/<id>/` → **closed** (shipped & live, or retired/obsolete).

Each change's own `proposal.md` carries a `STATUS:` banner at the top with the detail.
Checkbox counts in `tasks.md` are **not** a reliable progress signal for older changes —
some shipped without their boxes being ticked. Trust the banner + this board.

Last reconciled: 2026-06-16 (against the live Hetzner deployment).

---

## 🟢 Active — open work

| Change | Status | What's left |
|---|---|---|
| [close-production-gaps](close-production-gaps/) | **Active** — the only change with real open work | Security + durability hardening. ~13 infra-ops tasks (Hetzner firewall, backups + restore drill, secret rotation, dedicated server, DNS cutover) need console/credentials; ~6 code/doc tasks (drop non-canonical datastore, fix `INFRASTRUCTURE.md`, observability/failover logging) are doable in a code session. |
| [consolidate-monorepo](consolidate-monorepo/) | **Active** — mostly done | Dead `rest-express` root (`package.json`/`package-lock.json`/`drizzle/`) already deleted. Residual: doc reconciliation (`AGENTS.md`, `INFRASTRUCTURE.md`) + a boot/`docker compose build` verification pass. |

## ⏸️ Deferred — specified, intentionally not started

| Change | Status | Gate |
|---|---|---|
| [add-dspy-answer-service](add-dspy-answer-service/) | **Deferred** (0/16) | Deferred from `close-production-gaps` Decision #8. In-process `Perplexica.AI` stays canonical until prioritized. |
| [add-local-first-sync](add-local-first-sync/) | **Deferred** (0/17) | Exploratory. Blocked on an architecture decision (ElectricSQL vs Automerge). |

## ✅ Archived — shipped & live

| Change | Note |
|---|---|
| [archive/rewrite-fullstack-resilient](archive/rewrite-fullstack-resilient/) | The running stack: Redwood + Phoenix + Postgres on Hetzner. (Boxes never maintained; work is deployed.) |
| [archive/restore-search-context-and-progress](archive/restore-search-context-and-progress/) | Per-step progress, failing-step attribution, inline follow-ups, chat lifecycle + Library tabs. |
| [archive/add-github-auth-gate](archive/add-github-auth-gate/) | GitHub OAuth allowlist auth gate (27/27). |
| [archive/add-search-mode-config](archive/add-search-mode-config/) | Speed/balanced/quality search-mode config (33/33). |
| [archive/add-user-settings-page](archive/add-user-settings-page/) | User settings page (25/25). |
| [archive/kill-stale-pwa-service-worker](archive/kill-stale-pwa-service-worker/) | Kill-switch SW shipped at `redwood/web/public/sw.js`. |

## ⚰️ Retired — obsolete, do not resume

| Change | Why |
|---|---|
| [archive/unblock-prod-preview](archive/unblock-prod-preview/) | Railway-era. Prod migrated to Hetzner; its real fixes (Chess import, `AUTH_BYPASS`) already landed. |
| [archive/railway-deploy-fix](archive/railway-deploy-fix/) | Railway-era. No proposal; objective no longer applies. |
