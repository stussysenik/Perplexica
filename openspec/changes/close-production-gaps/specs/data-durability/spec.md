# Data Durability

## Description

Guarantees that user data (chats, messages, search history, bookmarks) is written to a
single, known database and survives server rebuilds, deletions, and deployments. This
addresses the audited gaps: ambiguous DB target, zero volumes, no backups, no snapshots.

See: security, deployment

## ADDED Requirements

### REQ-DUR-001: Single canonical database

Perplexica MUST read and write through exactly one canonical database, with no
ambiguity between candidate datastores.

#### Scenario: The live database target is unambiguous
**Given** the production deployment
**When** the injected `DATABASE_URL` is inspected
**Then** it points to exactly one database
**And** documentation (`INFRASTRUCTURE.md`) names that same database and no other

#### Scenario: The unused datastore is removed from configuration
**Given** a candidate datastore not chosen as canonical
**When** configuration and docs are reviewed
**Then** it is not referenced as Perplexica's database anywhere

### REQ-DUR-002: Persistence is verified end-to-end in production

User searches MUST be confirmed to persist in the canonical database, not merely
assumed from code.

#### Scenario: A real search produces a persisted row
**Given** the production app and the canonical database
**When** an authenticated user completes a search
**Then** a corresponding row exists in `chats` and `messages`
**And** the message's `response_blocks` are populated with status `completed`

### REQ-DUR-003: Automated, restore-tested backups

The canonical database MUST be backed up automatically, and the backup MUST be proven
restorable.

#### Scenario: Backups run on a schedule
**Given** the canonical database
**When** the backup schedule elapses
**Then** a fresh dump/snapshot is produced and retained per a defined retention policy

#### Scenario: A backup can actually be restored
**Given** a recent backup
**When** it is restored into a throwaway database
**Then** the restored database contains the expected tables and row counts

### REQ-DUR-004: Data survives server rebuild or deletion

Loss of the compute instance MUST NOT mean loss of data.

#### Scenario: Data outlives the server
**Given** the server is rebuilt or replaced
**When** the application is brought back up against the canonical database (or a
restored backup)
**Then** prior chats and messages are still present
**And** the production server has delete-protection enabled to prevent accidental loss

### REQ-DUR-005: The research record is portable, not techstack-bound

The research record (chats, messages, queries, cited response blocks) MUST be
exportable to and importable from a stack-neutral format, so it is never captive to one
backend, host, or framework. This operationalizes the "sovereign record" North Star and
is the enabler for additional renderers (e.g. a mobile client).

#### Scenario: A user can export their full record
**Given** an authenticated user with saved searches
**When** they request an export
**Then** they receive their chats + messages + sources in a documented, stack-neutral
format (e.g. JSON) that is complete enough to reconstruct the record elsewhere

#### Scenario: An exported record can be re-imported
**Given** a previously exported record file
**When** it is imported into a fresh instance (or a different renderer)
**Then** the chats, messages, and cited sources are reconstructed faithfully
**And** no field required to display or replay a search is lost in the round-trip
