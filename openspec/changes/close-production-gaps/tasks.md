# Tasks: Close Production Gaps

Ordered by phase. Each task is independently verifiable. `[blocked: OQ-n]` marks tasks
waiting on an open question in `design.md`. Phases 0–2 are emergency/foundational and
should land before 3–4.

## Phase 0 — Containment & ground truth (do first)

- [x] 0.1 Take a Hetzner snapshot of the current server **before any change**
  - Verify: snapshot listed via `/v1/images?type=snapshot`
  - DONE (2026-06-16): snapshot `image_id 398043640` created on server `131216547` (`byoa`),
    desc "pre-hardening containment 2026-06-16". Status `creating` at record time — confirm
    it reaches `available` (takes a few min for the 80 GB disk).
- [x] 0.2 Enable delete-protection on the production server
  - Verify: server `protection.delete == true`
  - DONE: `change_protection {delete:true, rebuild:true}` → verified `delete_protect: True`,
    `rebuild_protect: True`. The box can no longer be accidentally deleted or reimaged.
- [ ] 0.3 Create + attach a Hetzner Cloud Firewall (default-deny inbound; allow 80/443
  public, 22 + 8000 operator-only) `[blocked: OQ-4]`
  - Verify: from a non-operator network, 8000/5432 refuse; 80/443 succeed; SSH still
    reachable for the operator (test before relying on it)
  - HELD: lockout risk — needs the operator's stable source IP (OQ-4) before applying.
    Confirmed via API there are currently **0 firewalls** on the project.
- [x] 0.4 SSH in; read Coolify's injected `DATABASE_URL`; record which DB is canonical `[resolves OQ-1]`
  - Verify: documented single `DATABASE_URL`
  - DONE: Perplexica = container `c6b5o3cz…` (`perplexica.stussysenik.com`, `MIX_ENV=prod`).
    `DATABASE_URL=postgresql://perplexica:****@s1w2j8oxy05xdomwpyf8m2oc:5432/perplexica_prod`.
    Host `s1w2j8oxy…` **is the `pgvector/pgvector:pg16` container** → **canonical DB is the
    self-hosted local pgvector `perplexica_prod`, NOT Supabase.** Dual-DB ambiguity resolved.
    Co-tenancy confirmed: second app container `jy82miu5…` = BYOA (`byoa.stussysenik.com`).
- [~] 0.5 Count rows in `chats`/`messages` on the live DB; run one real search and
  confirm a new row appears `[satisfies REQ-DUR-002]`
  - Verify: row count increases after a search
  - PARTIAL: schema intact (13 tables incl. chats/messages/users/search_sessions/audit_logs).
    Counts: **8 chats / 10 messages**. ⚠️ most recent row `2026-06-11` (5 days stale) — either
    no traffic since, or writes regressed. The active half (run a live search, watch the
    count tick) was **held** (it spends LLM quota) — needs operator go.
- [x] 0.6 Confirm `AUTH_BYPASS` is unset in the prod environment `[satisfies REQ-SEC-004]`
  - Verify: env inspection shows unset/false
  - DONE: `printenv AUTH_BYPASS` in the prod Perplexica container returns empty → UNSET.

## Phase 1 — Security hardening

- [x] 1.1 Add SSRF guard to `phoenix/.../actions/scrape_url.ex`: scheme allowlist
  (http/https) + resolve host + reject RFC-1918/loopback/link-local/ULA/`169.254.169.254`
  `[satisfies REQ-SEC-003]`
  - Verify: unit tests for blocked (private/metadata/`file://`) and allowed (public) URLs
  - DONE: new `Perplexica.Security.UrlGuard` (resolve-then-classify, IPv4+IPv6, IPv4-mapped);
    `Brave.scrape_url` now validates **every redirect hop** (`follow_redirect: false`) to
    close the 302→internal bypass; 12 unit tests green (`test/perplexica/security/url_guard_test.exs`)
- [ ] 1.2 Restrict Coolify admin to operator (firewall rule from 0.3 + confirm no
  plain-HTTP public path) `[satisfies REQ-SEC-002]`
  - Verify: public HTTP request to :8000 not served
- [ ] 1.3 Prune stale SSH keys on host + Hetzner project (keep one active deploy key)
  `[satisfies REQ-SEC-005]`
  - Verify: `authorized_keys` and project key list contain only active keys
- [ ] 1.4 Rotate exposed secrets in order: Spaceship DNS → Supabase password → Hetzner
  token; update Coolify env + local `.env.local` `[satisfies REQ-SEC-005]`
  - Verify: app still boots with new creds; old creds revoked
- [x] 1.5 Confirm `ensure_chat_exists`/`ensure_message_exists` insert failures are not
  silently swallowed (log on error tuple)
  - Verify: forced insert error produces a log line
  - DONE: both inserts now pipe through `log_persist_error/3` in `search_resolver.ex`,
    which logs `Logger.error` on `{:error, changeset}` and passes the result through unchanged

## Phase 2 — Durability & single source of truth

- [ ] 2.1 Decide canonical DB (self-hosted pgvector recommended) `[blocked: OQ-2]` `[satisfies REQ-DUR-001]`
- [ ] 2.2 Remove the non-canonical datastore from config + docs `[satisfies REQ-DUR-001]`
- [ ] 2.3 Configure automated backups (scheduled `pg_dump` or provider backups) with a
  retention policy `[satisfies REQ-DUR-003]`
  - Verify: a dump appears on schedule
- [ ] 2.4 Run a restore drill into a throwaway database `[satisfies REQ-DUR-003]`
  - Verify: restored tables + row counts match source
- [ ] 2.5 Correct `INFRASTRUCTURE.md` (single DB, accurate network — remove stale
  `10.0.1.x`) `[satisfies REQ-DUR-001]`
- [ ] 2.6 Fix Supabase free-tier 7-day sleep if Supabase is kept (cron ping) — else N/A

## Phase 3 — Infrastructure isolation

- [ ] 3.1 Decide which service moves + approve 2nd-server cost `[blocked: OQ-3]`
- [ ] 3.2 Provision dedicated server in the empty new project (firewall + protection
  from Phase 0/1 applied) `[satisfies REQ-DEP-001, REQ-DEP-002]`
- [ ] 3.3 Migrate the chosen service against a verified backup; cut DNS via Spaceship
  - Verify: app serves on its domain from the new host; old co-tenancy decommissioned
- [ ] 3.4 Confirm host secret files are not world-readable `[satisfies REQ-DEP-003]`

## Phase 4 — LLM observability

- [ ] 4.1 Raise a deliberate test error; confirm it lands in the error tracker `[satisfies REQ-OBS-001]`
- [ ] 4.2 Ensure NIM→GLM failover is logged/metered (no Convex/LangChain) `[satisfies REQ-OBS-002]`
- [ ] 4.3 Add free-tier/self-host LLM request counting (provider call counts) `[satisfies REQ-OBS-002]`
  - Verify: per-provider counts visible for a traffic window

## Validation

- [ ] V.1 Re-run the audit checks (firewall present, backups on, snapshot exists,
  delete-protection on, single `DATABASE_URL`, SSRF tests green)
- [ ] V.2 `openspec validate close-production-gaps --strict --no-interactive` passes
  (install CLI: `npm i -g @openspec/cli` or project equivalent)
