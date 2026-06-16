# Design: Consolidate the Monorepo

## Context

The repo should be a faithful map of the running system. Today it is not: a dead
`rest-express` (Next 16 + Drizzle) generation sits at the root, while the live product
(Phoenix + Redwood + Zig + SearXNG) lives in subdirectories. This document records the
audited evidence, the removal decisions, the prove-it-dead gate, and the open questions.

## Evidence (audited 2026-06-16, read-only)

### Root is a dead Node generation
| Check | Result | Source |
|---|---|---|
| Root `package.json` name | `"rest-express"` v1.0.0, `"type": "module"` | `package.json:2` |
| Declared app | Next.js 16 + Drizzle + full Radix UI set + `@google/genai` | `package.json` deps |
| `dev:legacy` target | `server/index.ts` — **directory `server/` absent** | `package.json:8` |
| `build` target | `script/build.ts` — **directory `script/` absent** | `package.json:9` |
| `start` target | `dist/index.cjs` — no build output present | `package.json:10` |
| Root lockfile | `package-lock.json`, **614 KB** (npm) | filesystem |
| Orphaned schema dir | `drizzle/` — 9 files, no live importer found | filesystem |
| `turbo.json` / `pnpm-workspace.yaml` | **absent** (prior "pnpm/Turbo" note was wrong) | filesystem |

### Live stack (canonical)
| Component | Dir | Toolchain | Port |
|---|---|---|---|
| Web (RedwoodJS) | `redwood/` | Yarn 4 workspace (`redwood/yarn.lock`) | 8910 |
| Backend (Phoenix) | `phoenix/` | Mix (`phoenix/mix.lock`) | 4000 |
| Systems | `zig/` | Zig | — |
| Search | `searxng/` | container | — |
| Local orchestrator | `./dev` | bash — boots Phoenix + Redwood, frees stale ports | — |
| Container orchestrator | `docker-compose.yml` | compose (`app` service builds from `Dockerfile`) | — |

The `./dev` script only ever starts Phoenix (4000) and Redwood (8910); it never
references the root `rest-express` app. The root manifest is therefore unreferenced by
the actual run paths.

## Decisions

1. **Remove the `rest-express` generation entirely.** Its source dirs are already gone;
   what remains (manifest, lockfile, root `node_modules`, `drizzle/`) is pure dead
   weight and a source of "which app is this?" confusion. Delete it.
2. **Archive before deleting.** `tar` the removed paths (plus any untracked dead files)
   to a location **outside** the repo first. A backup that runs before an irreversible
   delete is cheap insurance, consistent with the project's durability values.
3. **Prove-it-dead gate.** Nothing is deleted until a grep across `phoenix/`, `redwood/`,
   `zig/`, `scripts/`, `docker-compose.yml`, and `Dockerfile` confirms zero references
   to the artifact (root deps, `drizzle/` schema, `rest-express` scripts).
4. **One package manager per language.** Web → Yarn 4 (in `redwood/`); backend → Mix;
   systems → Zig. No competing npm lockfile at the root. Do **not** introduce Turbo / Nx
   / pnpm — consolidation means fewer tools, not a new umbrella.
5. **Two orchestration entrypoints, both documented.** `./dev` for local, `docker-compose`
   for container/prod. No third implied "run" path.
6. **Root manifest: minimal or none.** If a root `package.json` is kept, it carries only
   repo-level convenience scripts (e.g. `dev`, `format`) and declares **no** application
   and **no** dependency tree. Default recommendation: remove it and invoke `./dev`
   directly, unless a root-level script proves necessary.

## Open questions (resolve during apply)

- **OQ-1 (drizzle):** Is `drizzle/` truly orphaned, or does any migration/seed/tooling in
  the live stack still read it? → resolved by grep + a `docker compose build` smoke run.
- **OQ-2 (root manifest):** Remove the root `package.json` entirely, or keep a minimal
  scripts-only manifest? → decide once we confirm no tooling expects a root manifest.
- **OQ-3 (untracked dead files):** Are there other untracked dead generations (e.g. a
  `backup/` from the desktop cleanup) that should be archived in the same pass?

## Phased plan (maps to `tasks.md`)

- **Phase 0 — Inventory & archive.** Enumerate dead artifacts; grep-prove each is unused;
  `tar` everything to be removed to an external archive.
- **Phase 1 — Remove.** Delete the `rest-express` manifest, lockfile, root `node_modules`,
  and orphaned `drizzle/` (and any other proven-dead files).
- **Phase 2 — Declare canonical structure.** Update docs/AGENTS.md to the real layout +
  the two orchestrators; resolve the root-manifest question.
- **Phase 3 — Verify.** `./dev` boots Phoenix + Redwood; `docker compose build` succeeds;
  Redwood `yarn install` unaffected. Repo tree now matches the running system.

## Relationship to other changes

- Independent of `close-production-gaps` (that one hardens prod; this one cleans the
  source tree). Can land in either order; no shared files.
- Should land **before** `add-dspy-answer-service` and `add-local-first-sync`, so those
  new services are added to a clean, unambiguous repo structure.
