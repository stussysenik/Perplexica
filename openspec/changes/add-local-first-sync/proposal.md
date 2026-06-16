# Proposal: Add Local-First Sync (The Sovereign Record)

## Change ID
`add-local-first-sync`

## Status
Draft (exploratory — design-heavy, gated on a deliberate architecture choice)

## Motivation

`VISION.md` North Star #6 is the **sovereign record**: the user's search history is
*theirs* — durable, private, exportable, and not bound to one tech stack or one server.
Today the record lives only in the server's Postgres. That makes it server-owned: it
disappears if the user is offline, it cannot be read on a plane, and it is only as
portable as a manual DB dump. The "CRDT sell" — and the eventual mobile client — is the
concrete expression of the sovereign-record promise: the user holds a **local replica**
of their own data that works offline and converges with the server when reconnected.

This is the third deferred thread from `close-production-gaps` (out-of-scope item
`add-local-first-sync`). It is the most exploratory of the three, so this change is
weighted toward a clear architecture decision and open questions rather than a long task
list — we want the *direction* specified and de-risked before committing code.

Two credible architectures, both $0 / self-hostable:

- **ElectricSQL** — sync layer over the existing Postgres; defines "shapes" that
  replicate to a local store (e.g. SQLite/PGlite) with built-in conflict handling. Lowest
  lift because the canonical DB is already Postgres.
- **Automerge** — a general CRDT document library; maximum offline/merge fidelity and the
  most "sovereign" (the document is the source of truth), but requires its own sync
  endpoint and a mapping between CRDT documents and the relational schema.

The motivation is not "add CRDTs because they're cool" — it is to make the record
genuinely user-owned and offline-capable, which is a stated product value, while keeping
the server Postgres as the durable, backed-up anchor established in `close-production-gaps`.

## Scope

**In scope:**

1. **A decision** between ElectricSQL and Automerge (or a documented hybrid), with the
   trade-offs resolved in `design.md` and confirmed during apply.
2. **A local replica** of the user's own chats/messages that supports **offline read and
   write**, scoped to the authenticated user (no cross-user data on the client).
3. **Bidirectional sync** with the canonical Postgres: local writes reach the server when
   online; server state reaches the client; **conflicts converge deterministically**
   without losing user writes.
4. **Open-format export** of a user's record (the sovereign-record guarantee made
   tangible — a user can take their data out in a documented, non-proprietary format).
5. **Same trust boundary as today** — sync respects the GitHub OAuth allowlist; a client
   only ever holds its own user's data.

**Out of scope:**

- Building the native mobile client itself — this change makes the *record* local-first
  and syncable; the mobile app that consumes it is a later change.
- Real-time multi-user collaboration on a single chat (no shared-cursor / co-editing).
- Changing the canonical Postgres as source-of-durability — it remains the backed-up
  anchor from `close-production-gaps`; local-first sits *in front of* it, not instead of.
- E2E encryption of the synced record (a possible future change; noted, not specified).

## Approach (summary — full reasoning in `design.md`)

- **Server Postgres stays the durable anchor.** Local-first adds an offline, user-owned
  replica and a convergence protocol; it does not replace the backed-up canonical DB.
- **Pick the lowest-lift architecture that honors the value.** Default lean: **ElectricSQL**,
  because the canonical store is already Postgres and shapes map cleanly to "this user's
  chats." Automerge stays the fallback if per-field CRDT merge fidelity proves necessary.
- **Prove offline → reconnect → converge before anything else.** The whole value is that a
  write made offline survives reconnection and merges without loss. That round-trip is
  the first thing demonstrated.
- **Export is a first-class feature, not an afterthought.** "Sovereign" means the user can
  leave with their data; an open-format export is part of the definition of done.

## Impact

### What changes
- A client-side replica + sync engine (ElectricSQL or Automerge) for the user's chats.
- A sync endpoint/config on the server bridging the replica and canonical Postgres.
- An export path producing the user's record in an open format.
- New env/config for the sync layer; a `docker-compose` service if the chosen stack needs
  a sync server.

### What's preserved
- Canonical Postgres as the durable, backed-up source-of-truth.
- The GitHub OAuth allowlist trust boundary; strict per-user data scoping.
- The $0 / self-hostable constraint.

### Risk
- Sync/merge bugs could corrupt or lose user history → mitigated by Postgres remaining
  authoritative, the offline→converge test gate, and never deleting server rows on a merge.
- Architecture lock-in to the wrong CRDT stack → mitigated by making the decision explicit
  and keeping the relational schema (not the CRDT format) the durable anchor.
- Scope creep toward the mobile app → explicitly deferred; this change stops at a
  syncable, exportable local record.
