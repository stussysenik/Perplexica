# Tasks: Add Local-First Sync (The Sovereign Record)

Ordered by phase. Each task is independently verifiable. `[blocked: OQ-n]` marks tasks
waiting on an open question in `design.md`. The canonical Postgres remains authoritative
throughout; no task deletes server-side history on a merge.

## Phase 0 — Decide & spike (do first)

- [ ] 0.1 Spike: replicate one user's chats from Postgres to a local store, make an
  offline write, reconnect, confirm convergence `[blocked: OQ-1, OQ-2]`
  - Verify: a write made while offline appears in Postgres after reconnect, unmodified
- [ ] 0.2 Decide architecture (ElectricSQL default; Automerge fallback) + local store
  `[resolves OQ-1, OQ-2]` `[satisfies REQ-LFS-001]`
  - Verify: decision recorded in `design.md` with the spike result as evidence
- [ ] 0.3 Decide conflict-convergence policy + export format `[resolves OQ-3, OQ-4]`
  - Verify: both documented before Phase 2/3 begin

## Phase 1 — Replica + offline read/write

- [ ] 1.1 Stand up the chosen local replica scoped to the authenticated user `[satisfies REQ-LFS-001, REQ-LFS-004]`
  - Verify: the client holds only the signed-in user's chats/messages
- [ ] 1.2 Offline read of the user's record works `[satisfies REQ-LFS-002]`
  - Verify: with the network disabled, prior chats/messages are readable
- [ ] 1.3 Offline write of a chat/message works locally `[satisfies REQ-LFS-002]`
  - Verify: a new message created offline is persisted in the local replica

## Phase 2 — Bidirectional sync + convergence

- [ ] 2.1 Local writes propagate to canonical Postgres on reconnect `[satisfies REQ-LFS-003]`
  - Verify: an offline write lands in Postgres after reconnect
- [ ] 2.2 Server state propagates to the client `[satisfies REQ-LFS-003]`
  - Verify: a row inserted server-side appears in the client replica
- [ ] 2.3 Conflicts converge per the documented policy with no lost user writes `[satisfies REQ-LFS-005]`
  - Verify: concurrent offline edits on two clients converge deterministically; neither
    client's write is silently dropped
- [ ] 2.4 Per-user scoping holds across sync `[satisfies REQ-LFS-004]`
  - Verify: a client never receives another user's rows during sync

## Phase 3 — Sovereign export

- [ ] 3.1 Export a user's record in an open, documented format `[satisfies REQ-LFS-006]`
  - Verify: the export contains the user's chats/messages in the documented format
- [ ] 3.2 The export is re-importable `[satisfies REQ-LFS-006]`
  - Verify: importing the export reconstructs the record

## Phase 4 — Harden

- [ ] 4.1 Sync server (if the chosen stack needs one) runs as a `docker-compose` service,
  no GPU/paid dependency `[satisfies REQ-LFS-007]`
  - Verify: `docker compose up` starts it within the existing box
- [ ] 4.2 Failure modes behave predictably (server down, long offline, clock skew)
  - Verify: each scenario degrades without data loss; Postgres stays authoritative

## Validation

- [ ] V.1 Offline → reconnect → converge proven end to end with no lost writes
- [ ] V.2 Canonical Postgres remains the durable, backed-up anchor (unchanged by sync)
- [ ] V.3 `openspec validate add-local-first-sync --strict --no-interactive` passes
