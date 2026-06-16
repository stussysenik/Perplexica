# Local-First Sync

## Description

Each client holds a local replica of its own user's record (chats/messages) that works
offline and converges with the canonical Postgres when reconnected — the concrete
expression of the sovereign-record value. Postgres remains the durable, backed-up
source-of-truth; local-first sits in front of it, never replacing it.

See: data-durability, security

## ADDED Requirements

### REQ-LFS-001: User-owned local replica

The client MUST maintain a local replica of the authenticated user's record using a
self-hostable, $0 architecture (ElectricSQL or Automerge, per the design decision).

#### Scenario: A local replica exists for the signed-in user
**Given** an authenticated user
**When** they use the app
**Then** their chats/messages are present in a local replica on the client

### REQ-LFS-002: Offline read and write

The user MUST be able to read their existing record and create new chats/messages while
offline.

#### Scenario: Reading offline
**Given** the client has previously synced and the network is unavailable
**When** the user opens their history
**Then** their prior chats/messages are readable from the local replica

#### Scenario: Writing offline
**Given** the network is unavailable
**When** the user creates a new message
**Then** it is persisted to the local replica and is durable across an app restart

### REQ-LFS-003: Bidirectional sync with canonical Postgres

Local writes MUST reach the canonical Postgres when connectivity returns, and server
state MUST reach the client.

#### Scenario: Offline write reaches the server
**Given** a write made while offline
**When** the client reconnects
**Then** the write appears in the canonical Postgres, unmodified

#### Scenario: Server write reaches the client
**Given** a row inserted server-side
**When** the client is online
**Then** the row appears in the client's local replica

### REQ-LFS-004: Strict per-user data scoping

A client MUST only ever hold and sync the authenticated user's own data, enforcing the
same allowlist trust boundary as the live app.

#### Scenario: No cross-user data on the client
**Given** an authenticated user
**When** the replica syncs
**Then** the client receives only that user's rows and never another user's data

### REQ-LFS-005: Deterministic convergence without lost writes

Concurrent edits MUST converge deterministically per a documented conflict policy, and no
user write may be silently dropped.

#### Scenario: Concurrent offline edits converge
**Given** two clients of the same user that each made offline edits
**When** both reconnect and sync
**Then** the record converges to the same deterministic state on both
**And** neither client's write is silently discarded

#### Scenario: A merge never destroys authoritative server history
**Given** a sync/merge operation
**When** it resolves a conflict
**Then** it does not delete authoritative server-side history

### REQ-LFS-006: Sovereign, open-format export

A user MUST be able to export their record in a documented, non-proprietary, re-importable
format.

#### Scenario: Export and re-import round-trips
**Given** a user's record
**When** they export it
**Then** the export is in a documented open format containing their chats/messages
**And** importing the export reconstructs the record

### REQ-LFS-007: Fits existing hardware at zero added cost

Any sync server component MUST run within the existing self-hosted infrastructure with no
GPU and no paid dependency.

#### Scenario: Sync server runs as one more small container
**Given** the chosen architecture needs a sync server
**When** the stack is started with `docker compose`
**Then** it runs alongside the existing services without a GPU or instance upgrade
