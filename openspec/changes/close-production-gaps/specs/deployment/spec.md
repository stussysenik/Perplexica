# Deployment

## Description

How Perplexica is hosted on Hetzner: project/service isolation, server protection, and
secret handling on the box. Addresses the audited co-tenancy (one box runs Perplexica
and BYOA) and unprotected-server gaps.

See: security, data-durability

## ADDED Requirements

### REQ-DEP-001: Service isolation

Perplexica MUST run in its own Hetzner project/server, not co-tenanted with unrelated
services (e.g. BYOA), so that one service's resource use or compromise does not affect
the other.

#### Scenario: Perplexica has a dedicated host
**Given** the hardened deployment
**When** the Hetzner project hosting Perplexica is inspected
**Then** the Perplexica server does not also serve the BYOA application
**And** the migration of whichever service moved was performed against a verified backup

### REQ-DEP-002: Server protection and recoverability

The production server MUST be protected against accidental destruction and have a
recovery point.

#### Scenario: Delete-protection is on
**Given** the production server
**When** its protection settings are inspected
**Then** delete-protection is enabled

#### Scenario: A recovery snapshot exists
**Given** the production server
**When** the image/snapshot inventory is inspected
**Then** at least one recent snapshot exists, taken before any migration or destructive change

### REQ-DEP-003: Secrets are injected, never baked in

Production secrets MUST be provided via the platform's environment/secret mechanism and
MUST NOT be committed to git or written to world-readable files on the host.

#### Scenario: No secrets in the repository
**Given** the repository at any commit
**When** it is scanned for known credential patterns
**Then** no live secret value is present (env files for secrets remain gitignored)

#### Scenario: Host secret files are not world-readable
**Given** the production host
**When** files containing secrets are inspected
**Then** their permissions restrict access to the owning service/operator
