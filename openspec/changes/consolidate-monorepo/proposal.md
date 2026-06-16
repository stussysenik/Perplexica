# Proposal: Consolidate the Monorepo (Drop Dead Generations, One Orchestrator)

## Change ID
`consolidate-monorepo`

## Status
Draft

## Motivation

The repository carries the fossils of an earlier product generation. The live stack is
**Phoenix** (`phoenix/`, Elixir, port 4000) + **RedwoodJS** (`redwood/`, a Yarn 4
workspace, port 8910), plus `zig/`, `searxng/`, and `docs/`, orchestrated by the
`./dev` script and `docker-compose.yml`. But the repo *root* is still a separate,
dead Node application:

- Root `package.json` declares `"name": "rest-express"` — a v0/scaffold-era
  **Next.js 16 + Drizzle** app. Its entry points are already gone: `dev:legacy` →
  `server/index.ts`, `build` → `script/build.ts`, `start` → `dist/index.cjs` all point
  at files/dirs that no longer exist. Only a vestigial `drizzle/` directory (9 files)
  and a 614 KB `package-lock.json` remain.
- That dead manifest still pulls a full dependency tree (Next 16, the entire Radix UI
  set, `drizzle-orm`, `@google/genai`, `tsx`, etc.) into the **root** `node_modules`,
  none of which the live Phoenix/Redwood stack uses.
- The result is two competing notions of "the app" at two levels: an npm-managed
  `rest-express` ghost at the root and the real Yarn 4 Redwood workspace one level down.
  New contributors (and agents) can't tell which is canonical, `npm install` at the root
  builds an unused tree, and `package-lock.json` churns on a project that is never run.

> Note: the earlier design note in `close-production-gaps` guessed this was a "root
> pnpm/Turbo experiment." The audit here corrects that — it is an **npm `rest-express`
> (Next + Drizzle) leftover**, not pnpm/Turbo. No `turbo.json` or `pnpm-workspace.yaml`
> exists.

This is the "organize the repo / finish the cleanup" thread the user has raised
repeatedly. It is pure liability removal: deleting code that is already dead, so the
tree honestly reflects the running system.

## Scope

**In scope:**

1. **Archive before delete.** Snapshot the to-be-removed root generation (and any other
   untracked dead files) to a `tar` outside the repo, so nothing is lost.
2. **Remove the dead `rest-express` generation** — root `package.json`, `package-lock.json`,
   root `node_modules`, and the orphaned `drizzle/` directory — *after* confirming
   nothing in the live stack imports them.
3. **Declare one canonical structure.** Document the real layout (Phoenix + Redwood
   workspace + Zig + SearXNG) and that `docker-compose.yml` + `./dev` are the single
   orchestration entrypoints (local `dev`, container `compose`).
4. **A root manifest that reflects reality, if one is kept** — either no root
   `package.json`, or a minimal one whose only job is repo-level scripts (`dev`,
   `format`) and which does **not** redeclare an app or its dependency tree.

**Out of scope:**

- Any change to Phoenix or Redwood application behavior, routes, or the search pipeline.
- Introducing Turbo, Nx, pnpm, or a new workspace tool — the consolidation is toward
  *fewer* tools (Yarn 4 for web, Mix for Phoenix, compose to tie them), not a new one.
- Effect.ts adoption — if the live code already uses it, this change does not expand it;
  any new Effect.ts wiring is a separate concern, not part of removing dead code.
- The production-readiness work in `close-production-gaps` (security/durability/infra).

## Approach (summary — full reasoning in `design.md`)

- **Prove-it-dead before removing.** For each artifact slated for deletion, grep the live
  stack for imports/references and confirm zero before it goes. Archive first, delete
  second, verify the app still builds and runs third.
- **One package manager per language boundary.** Web = Yarn 4 (`redwood/`), backend =
  Mix (`phoenix/`), systems = Zig (`zig/`). No npm lockfile at the root competing with
  the Yarn workspace.
- **Compose + `./dev` are the orchestrator.** Local development runs `./dev` (Phoenix +
  Redwood); container/prod runs `docker-compose.yml`. Both are documented as canonical;
  no third "run the app" path is left implied by a dead root manifest.

## Impact

### What changes
- Root `package.json`, `package-lock.json`, root `node_modules`, and orphaned `drizzle/`
  removed (archived first).
- `docs`/`INFRASTRUCTURE.md`/`AGENTS.md` updated to describe the single real structure
  and the two orchestration entrypoints.
- Optionally a minimal repo-root manifest containing only repo-level scripts.

### What's preserved
- Phoenix, Redwood (and its `redwood/yarn.lock`), Zig, SearXNG, `./dev`, and
  `docker-compose.yml` — the entire live, running stack — are untouched in behavior.
- Git history of the removed generation (recoverable via VCS + the pre-delete archive).

### Risk
- Something in the live stack secretly depends on a root dep or the `drizzle/` schema →
  mitigated by the grep-prove-it-dead gate and a post-removal `./dev` + `docker compose
  build` smoke run before the change is considered done.
- Lost code → mitigated by the pre-delete `tar` archive stored outside the repo.
