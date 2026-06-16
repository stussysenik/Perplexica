# Design: Local-First Sync (The Sovereign Record)

## Context

The sovereign-record North Star says the user's data is theirs: durable, private,
exportable, offline-capable, not stack-bound. Server-only Postgres satisfies "durable and
private" (after `close-production-gaps`) but not "offline" or "user-held." Local-first
sync closes that gap by giving each client a replica of *its own* record that works
offline and converges with the server. This change is deliberately exploratory: the goal
is to fix the architecture and de-risk it, not to ship a large task list blind.

## Evidence (current state)

| Fact | Value | Source |
|---|---|---|
| Canonical store | Postgres (pgvector), made durable + backed up | `close-production-gaps` REQ-DUR-* |
| Persisted entities | `chats`, `messages` (wired via Ecto) | `search_resolver.ex`, `session.ex` |
| Trust boundary | GitHub OAuth allowlist; per-user data | `add-github-auth-gate` |
| Offline capability today | none — record only exists server-side | observed |
| Export today | none — no user-facing data export | observed |
| Stated value | sovereign record, North Star #6 | `VISION.md` |

## Architecture options

| | ElectricSQL | Automerge |
|---|---|---|
| Model | Sync layer over Postgres; "shapes" replicate to a local store | General CRDT documents; doc is source of truth |
| Lift | Lower — canonical DB is already Postgres | Higher — needs CRDT↔relational mapping + own sync server |
| Offline/merge fidelity | Good for row-level | Best — fine-grained, field-level convergence |
| "Sovereignty" | Strong (open local store) | Strongest (user holds the authoritative doc) |
| Self-host / $0 | Yes | Yes |
| Main risk | Shape/partial-replication edge cases | Mapping complexity; two sources of truth to reconcile |

## Decisions

1. **Postgres stays the durable anchor.** Local-first is additive: an offline, user-owned
   replica plus a convergence protocol in front of the canonical, backed-up Postgres.
   A merge never deletes authoritative server history.
2. **Default lean: ElectricSQL; Automerge as the fallback.** Because the canonical store
   is already Postgres, ElectricSQL is the lowest-lift path to "this user's chats, offline,
   converging." Reconsider Automerge only if row-level sync proves too coarse for the
   record (e.g. needing per-field merge). The decision is confirmed in Phase 0.
3. **Strict per-user scoping.** A client replicates only the authenticated user's rows.
   The sync layer enforces the same allowlist trust boundary as the live app; no client
   ever holds another user's data.
4. **Offline → reconnect → converge is the first deliverable.** The single most important
   property is that an offline write survives reconnection and merges without loss. It is
   demonstrated before any UI or mobile work.
5. **Open-format export is part of done.** "Sovereign" is only real if the user can leave
   with their data. The record exports to a documented, non-proprietary format.
6. **No new paid dependency, no GPU.** Any sync server runs as one more small
   `docker-compose` service on the existing box.

## Open questions (resolve in Phase 0, before code)

- **OQ-1 (architecture):** ElectricSQL vs Automerge vs hybrid — confirm the default
  (ElectricSQL) against a spike that replicates one user's chats and survives an
  offline write + reconnect.
- **OQ-2 (local store):** SQLite, PGlite, or IndexedDB on the client? Tied to OQ-1 and to
  the eventual mobile target.
- **OQ-3 (conflict policy):** For row-level conflicts on a chat/message, what is the
  documented convergence rule (last-writer-wins per field, CRDT merge, append-only)?
- **OQ-4 (export format):** What open format is the export — JSON Lines of chats/messages,
  SQLite file, or Automerge document? Must be documented and re-importable.
- **OQ-5 (encryption):** Is at-rest encryption of the local replica in scope now or a
  follow-up? Default: follow-up (noted, not specified here).

## Phased plan (maps to `tasks.md`)

- **Phase 0 — Decide & spike.** Resolve OQ-1/2 with a throwaway spike: replicate one
  user's chats to a local store, make an offline write, reconnect, confirm convergence.
- **Phase 1 — Replica + offline read/write.** Stand up the chosen local replica scoped to
  the authenticated user; offline read and write of chats/messages work.
- **Phase 2 — Bidirectional sync + convergence.** Local writes reach Postgres; server
  state reaches the client; conflicts converge per the documented policy with no lost
  writes; per-user scoping enforced.
- **Phase 3 — Sovereign export.** Open-format, re-importable export of a user's record.
- **Phase 4 — Harden.** Sync server (if any) as a `docker-compose` service; failure modes
  (server down, client offline for long, clock skew) behave predictably.

## Relationship to other changes

- Depends on `close-production-gaps` (a durable, single, backed-up canonical Postgres is a
  prerequisite — you cannot sync safely against an unbacked, ambiguous DB).
- Depends on `consolidate-monorepo` for a clean tree to add the sync service into.
- Independent of `add-dspy-answer-service`.
- Enables, but does not include, a future native mobile client.
