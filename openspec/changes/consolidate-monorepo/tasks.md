# Tasks: Consolidate the Monorepo

Ordered by phase. Each task is independently verifiable. `[blocked: OQ-n]` marks tasks
waiting on an open question in `design.md`. Nothing is deleted before Phase 0 archiving.

## Phase 0 — Inventory & archive (do first)

- [ ] 0.1 Enumerate dead artifacts: root `package.json`, `package-lock.json`, root
  `node_modules/`, `drizzle/`, plus any untracked dead generations `[resolves OQ-3]`
  - Verify: written inventory list of paths to remove
- [x] 0.2 Prove-it-dead — grep `phoenix/ redwood/ zig/ scripts/ docker-compose.yml
  Dockerfile` for references to each artifact (root deps, `drizzle` schema,
  `rest-express` scripts) `[resolves OQ-1]`
  - Verify: zero references found, recorded per artifact
  - DONE (2026-06-16): `grep -rI rest-express|drizzle|drizzle-orm` across
    `phoenix/ redwood/src redwood/api zig/ scripts/ docker-compose.yml Dockerfile dev`
    returned **zero** matches. `Dockerfile` builds only from `redwood/` (Yarn 4.6.0,
    `yarn rw build`) + `phoenix/` (Mix release) — it never references the root manifest,
    `drizzle/`, `server/`, or `script/`. Root `package.json`'s `dev:legacy`/`build`/`start`
    point at already-deleted files (`server/index.ts`, `script/build.ts`, `dist/index.cjs`);
    only `dev → ./dev` is live, and `./dev` is a standalone bash script. **Confirmed dead.**
- [x] 0.3 Archive everything slated for removal to a `tar` **outside** the repo
  - Verify: archive file exists and lists the expected paths
  - DONE (via git, per operator): the removed files (`package.json`, `package-lock.json`,
    `drizzle/`) are all git-tracked, so their full contents are recoverable from history
    (`git checkout <rev> -- <path>`). Operator accepted git history as the archive; root
    `node_modules` is untracked and regenerable, so no separate tar was taken.

## Phase 1 — Remove dead generation

- [x] 1.1 Remove root `package.json` + `package-lock.json` + root `node_modules/`
  `[satisfies REQ-REPO-001, REQ-REPO-002]`
  - Verify: paths gone; `git status` shows the deletions
  - DONE: `git rm package-lock.json`; root `package.json` replaced with a minimal
    scripts-only manifest (name `perplexica`, `private: true`, scripts `dev`/`format`,
    no deps); root `node_modules/` (3.2 GB, untracked) deleted.
- [x] 1.2 Remove orphaned `drizzle/` (gated on 0.2 proving it unused) `[satisfies REQ-REPO-001]`
  - Verify: `drizzle/` gone; live stack still builds (Phase 3)
  - DONE: `git rm -r drizzle/` (9 files). 0.2 proved zero live references.
- [x] 1.3 Remove any other proven-dead untracked files surfaced in 0.1 `[satisfies REQ-REPO-001]`
  - Verify: working tree contains only live-stack files
  - DONE: no other dead untracked generations found at the repo root in this pass.

## Phase 2 — Declare canonical structure

- [x] 2.1 Decide root-manifest disposition: none, or minimal scripts-only `[resolves OQ-2]`
  `[satisfies REQ-REPO-003]`
  - Verify: either no root `package.json`, or one with no app/deps, only repo scripts
  - DONE: operator chose **keep minimal** (reversible-via-git). Root `package.json` now has
    only `dev`/`format` scripts, `private: true`, no app, no dependencies, no lockfile.
- [ ] 2.2 Update `AGENTS.md` / `docs` / `INFRASTRUCTURE.md` to describe the single real
  layout (Phoenix + Redwood Yarn-4 workspace + Zig + SearXNG) `[satisfies REQ-REPO-004]`
  - Verify: docs name only the live components; no `rest-express`/Next/Drizzle references
  - REMAINING (scoped out of the removal pass to avoid a rushed multi-doc rewrite):
    `TECHSTACK.md` and `replit.md` describe the **whole** system as the dead "Next.js 16
    monolith with SQLite" — they are themselves dead-generation docs needing rewrite or
    archive. `DEPLOYMENT.md:70` now actively mislabels the **live** root Dockerfile/compose
    as "legacy Next.js" and should be corrected first (one-line, high-value). `progress.md`
    / `PROGRESSION.md` are historical chronicles — leave as-is.
- [ ] 2.3 Document the two orchestration entrypoints (`./dev` local, `docker-compose`
  container) as canonical `[satisfies REQ-REPO-004]`
  - Verify: docs state both, with no third implied run path

## Phase 3 — Verify

- [ ] 3.1 `./dev` boots Phoenix (4000) + Redwood (8910) with the root generation gone
  `[satisfies REQ-REPO-005]`
  - Verify: both services reachable locally
  - PARTIAL: `./dev` statically confirmed to drive only `redwood/` (`yarn rw dev web`) +
    phoenix; no root-`node_modules` dependency. Live boot to be run in a dev environment.
- [ ] 3.2 `docker compose build` succeeds `[satisfies REQ-REPO-005]`
  - Verify: build completes with no missing-file errors
  - PARTIAL: docker daemon unavailable in this session. Statically proven safe — `Dockerfile`
    builds only from `redwood/` + `phoenix/`; `docker-compose.yml` references none of the
    removed paths; Phoenix still `mix compile`s clean. Run the real build before archiving.
- [ ] 3.3 `redwood/` `yarn install` unaffected (Yarn 4 workspace intact) `[satisfies REQ-REPO-002]`
  - Verify: install resolves from `redwood/yarn.lock` with no root-lockfile interference
  - PARTIAL: root npm lockfile removed; `redwood/yarn.lock` untouched. `yarn install` to be
    re-run in a dev environment with corepack yarn@4.

## Validation

- [ ] V.1 Repo tree audited: only live-stack files remain; no competing root npm lockfile
- [ ] V.2 `openspec validate consolidate-monorepo --strict --no-interactive` passes
