# Repository Structure

## Description

The source tree MUST faithfully reflect the running system: a polyglot monorepo whose
only applications are Phoenix (`phoenix/`), the RedwoodJS Yarn 4 workspace (`redwood/`),
Zig (`zig/`), and SearXNG (`searxng/`), orchestrated by `./dev` (local) and
`docker-compose.yml` (container). Dead generations from earlier product iterations MUST
NOT linger in the tree.

See: deployment

## ADDED Requirements

### REQ-REPO-001: No dead application generations in the tree

The repository MUST NOT contain application code, manifests, or schemas belonging to a
product generation that is no longer run (notably the root `rest-express` Next.js +
Drizzle generation).

#### Scenario: The dead root generation is removed
**Given** the repository after consolidation
**When** the working tree is inspected
**Then** the root `rest-express` `package.json`, its `package-lock.json`, and the
orphaned `drizzle/` directory are absent
**And** no file in the tree imports or references them

#### Scenario: Removal is preceded by an archive
**Given** an artifact slated for deletion
**When** the artifact is removed
**Then** a `tar` archive of that artifact exists outside the repository, created before
the deletion

### REQ-REPO-002: One package manager per language boundary

Each language boundary MUST have exactly one package manager, with no competing lockfile
at a higher level.

#### Scenario: No root npm lockfile competes with the Yarn workspace
**Given** the consolidated repository
**When** dependency tooling runs
**Then** the web app resolves dependencies from `redwood/yarn.lock` (Yarn 4) only
**And** there is no `package-lock.json` (npm) at the repository root
**And** Phoenix uses `phoenix/mix.lock` and Zig uses its own toolchain

### REQ-REPO-003: Root manifest declares no application

If a root `package.json` exists, it MUST contain only repository-level convenience
scripts and MUST NOT declare an application or an application dependency tree.

#### Scenario: Root manifest is minimal or absent
**Given** the consolidated repository
**When** the repository root is inspected
**Then** either no root `package.json` exists, or the one present declares only
repo-level scripts (e.g. `dev`, `format`) with no application dependencies

### REQ-REPO-004: Documented canonical structure and orchestration

Project documentation MUST describe the single real layout and the canonical
orchestration entrypoints.

#### Scenario: Docs name only live components
**Given** the project documentation (`AGENTS.md`, `docs/`, `INFRASTRUCTURE.md`)
**When** a contributor reads how the system is structured and run
**Then** only the live components (Phoenix, Redwood workspace, Zig, SearXNG) are named
**And** `./dev` (local) and `docker-compose.yml` (container) are stated as the two
orchestration entrypoints, with no third implied "run the app" path

### REQ-REPO-005: Live stack unaffected by the cleanup

Removing the dead generation MUST NOT change the behavior or buildability of the live
stack.

#### Scenario: The app still boots and builds after cleanup
**Given** the dead root generation has been removed
**When** `./dev` is run and `docker compose build` is executed
**Then** Phoenix (4000) and Redwood (8910) start as before
**And** the container image builds with no missing-file errors
