# Unblock Prod Preview

## Why

Production (`https://perplexica-production-41f5.up.railway.app/`) is stuck. Two independent bugs surfaced in one session and block the operator (`stussysenik`) from seeing the app:

### Bug 1 — The live container is pinned to a stale build from `03:09:48`

Every Railway deploy since then has FAILED at the Vite build step with:

```
Could not resolve "../../components/Chess/Chess" from "src/pages/HomePage/HomePage.tsx"
```

Root cause (verified against git + filesystem):

- `redwood/web/src/pages/HomePage/HomePage.tsx:11` contains:
  ```ts
  const ChessBoard = lazy(() => import('src/components/Chess/Chess'))
  ```
- The file `redwood/web/src/components/Chess/Chess.tsx` exists on disk (84 lines, a static chess-board demo) but is **untracked in git**. `git log --all -- redwood/web/src/components/Chess/` returns empty — it has never been committed in any branch.
- Vite/Rollup resolves dynamic imports **statically at build time**, regardless of whether the resulting chunk is ever fetched at runtime. The render site at `HomePage.tsx:134-146` is wrapped in `{false && (...<ChessBoard />...)}` (labeled *"Feature Tag: Chess Animation is hidden"*), so nothing user-facing is lost by removing it.
- The last successful deploy `977e6130` at `03:09:48` succeeded only because it was built by `railway up --detach` from a local working directory that happened to contain the untracked `Chess.tsx`. Every subsequent GitHub-triggered build has had no such luck.

### Bug 2 — The operator's real GitHub login isn't in the allowlist

`phoenix` logs show repeated rejections:

```
03:33:11.300 [Auth] Sign-in denied for stussysenik — not in allowlist
03:33:35.102 [Auth] Sign-in denied for stussysenik — not in allowlist
```

The operator's actual GitHub login is `stussysenik`, not `senik`. `GITHUB_ALLOWLIST` on Railway was set to `senik`, so every sign-in was legitimately rejected by `auth_controller.ex:50`. The operator has already corrected the env var to `stussysenik` in parallel with this proposal, but that fix only lands when the next deploy succeeds — and right now the next deploy is blocked on Bug 1.

### Why both bugs need to be solved together

Fixing only Bug 1 gives the operator a signed-in production app — eventually — but they still can't verify anything until OAuth round-trips successfully with a real session. Fixing only Bug 2 changes nothing observable because Railway can't ship the fix. The operator needs to **see** the production app right now to validate that the four-tab library, per-step search progress, and chat lifecycle features in `69f83ad` actually work in prod before spending more time on deploy hygiene.

A temporary authentication bypass flag — gated on an explicit env var, logged loudly at boot, and surfaced as a visible banner in the UI — lets the operator walk through production without touching the GitHub OAuth flow. Once verified, the operator flips the flag off and signs in normally with the now-correct allowlist.

## What Changes

### 1. Archive the dead Chess demo

- Move `redwood/web/src/components/Chess/Chess.tsx` to `tasks/archive/chess-piece-demo/Chess.tsx`.
- Add `tasks/archive/chess-piece-demo/README.md` explaining what the file was, why it existed (an exploratory visual delight gated at `{false}`), and why it was archived (never finished, blocked every deploy).
- Delete the empty `redwood/web/src/components/Chess/` directory.
- Remove the `lazy(() => import('src/components/Chess/Chess'))` import on `HomePage.tsx:11`.
- Remove the `{false && (...<ChessBoard />...)}` block on `HomePage.tsx:132-146`.
- Drop `lazy` and `Suspense` from `HomePage.tsx:1` if unused elsewhere after the removal.

### 2. Add `AUTH_BYPASS` env var — full-stack, backend-authoritative

- `phoenix/config/runtime.exs`: read `System.get_env("AUTH_BYPASS")`, normalize to boolean, store at `:perplexica, :auth_bypass`. When true, log a loud warning at boot:
  ```
  [Auth] AUTH_BYPASS=true — authentication is disabled, all requests treated
  as signed-in as 'preview'. DO NOT USE IN PRODUCTION FOR LONG.
  ```
- `phoenix/lib/perplexica_web/plugs/require_owner.ex`: when `:auth_bypass` is true, `assign(conn, :github_username, "preview")` and pass through without any allowlist check. Unauthenticated and non-allowlisted paths become indistinguishable under bypass.
- `phoenix/lib/perplexica_web/controllers/auth_controller.ex:whoami/2`: when `:auth_bypass` is true, return `%{signed_in: true, username: "preview", avatar_url: nil, auth_bypass: true}` regardless of session state. Real sessions are ignored under bypass.
- `phoenix/lib/perplexica_web/controllers/auth_controller.ex:callback/2`: unchanged. The OAuth flow still works identically when bypass is on — the bypass just overrides the gate downstream.

### 3. Frontend preview banner

- Extend `useSession()` / `SessionProvider` in `redwood/web/src/lib/session.ts` (or equivalent) to carry a new `authBypass: boolean` field parsed from the whoami response, default `false`.
- Add a new `PreviewModeBanner.tsx` component — a thin fixed-top strip rendering `Preview mode — authentication is disabled. Sign in with GitHub to leave preview.` using the existing warning/danger color tokens (`--text-danger`, `--border-accent`, etc.). Visible only when `authBypass === true`.
- Mount the banner at the top of the app layout so it sits above the action bar and cannot be scrolled away.

### 4. Regression guards

- Tests for `require_owner_test.exs` and `auth_controller_test.exs` covering the bypass path (pass-through on plug, preview identity on whoami).
- A visual regression check: the banner renders when `AUTH_BYPASS=true`, is absent when `AUTH_BYPASS` is unset or `false`.

### 5. Non-goals

- **Not** removing the GitHub allowlist. The allowlist is the production gate; bypass is an explicit opt-out for the operator, not a replacement for auth.
- **Not** creating a real preview account system, preview URLs, or multi-tenant isolation. Bypass is one flag, one identity, one escape hatch.
- **Not** exposing the bypass to end users or surfacing a UI toggle. The flag is operator-only, set via Railway env vars.
- **Not** fixing `openspec/project.md` (it still describes the old Next.js stack). That's a separate cleanup.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `auth-github-gate`: adds the `AUTH_BYPASS` escape hatch as an additive requirement set. The existing allowlist, OAuth, and sign-out behaviors are preserved unchanged when `AUTH_BYPASS` is false or unset.

## Impact

- **Affected specs**: `auth-github-gate` — new ADDED requirements under `openspec/changes/unblock-prod-preview/specs/auth-github-gate/spec.md`. The Chess archival has no spec delta — it's maintenance, not behavior change.
- **Affected code**:
  - `redwood/web/src/pages/HomePage/HomePage.tsx` — remove Chess import + dead render block
  - `redwood/web/src/components/Chess/Chess.tsx` — MOVED to `tasks/archive/chess-piece-demo/Chess.tsx`
  - `tasks/archive/chess-piece-demo/README.md` — NEW
  - `phoenix/config/runtime.exs` — NEW `AUTH_BYPASS` read + warning log
  - `phoenix/lib/perplexica_web/plugs/require_owner.ex` — NEW bypass branch at top of `call/2`
  - `phoenix/lib/perplexica_web/controllers/auth_controller.ex` — MODIFIED `whoami/2` for bypass path
  - `redwood/web/src/lib/session.ts` (or equivalent) — MODIFIED to parse `auth_bypass` from whoami
  - `redwood/web/src/components/PreviewModeBanner.tsx` — NEW
  - `redwood/web/src/layouts/AppLayout/AppLayout.tsx` (or equivalent root) — MODIFIED to mount the banner
  - `phoenix/test/perplexica_web/plugs/require_owner_test.exs` — NEW bypass scenario
  - `phoenix/test/perplexica_web/controllers/auth_controller_test.exs` — NEW whoami bypass scenario
- **User impact**:
  - Unblocks the production deploy pipeline (Chess removal alone).
  - Operator can preview production with `AUTH_BYPASS=true` and a visible banner.
  - Real users are unaffected when `AUTH_BYPASS` is unset or `false` — behavior is identical to today.
- **Reversibility**:
  - Chess archival: trivial revert. The file is moved, not deleted; the import removal is a small diff.
  - Auth bypass: revert by `railway variables --remove AUTH_BYPASS && railway redeploy`. No code change needed to turn it off. The code path is always present, just inert when the flag is unset.
- **Dependencies**: none. Pure cleanup + env-var-gated feature. No migrations, no external API changes.
- **Risk**:
  - **Operator forgets to turn bypass off** → loud boot warning + persistent UI banner → detectable within seconds of looking at the app.
  - **Bypass ships on by default** → the default is `false`; the only way to enable it is an explicit env var set.
  - **Bypass grants more access than intended** → it assigns `github_username = "preview"`, which is NOT in the real allowlist. When bypass is turned off, any session data associated with "preview" effectively becomes inaccessible (the real allowlist rejects it), so the cleanup happens naturally.
