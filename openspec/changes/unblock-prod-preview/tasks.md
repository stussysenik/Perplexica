# Tasks — Unblock Prod Preview

## 1. Archive Chess demo (unblocks the build pipeline)

- [x] 1.1 `mkdir -p tasks/archive/chess-piece-demo`
- [x] 1.2 `mv redwood/web/src/components/Chess/Chess.tsx tasks/archive/chess-piece-demo/Chess.tsx`
- [x] 1.3 `rmdir redwood/web/src/components/Chess`
- [x] 1.4 Write `tasks/archive/chess-piece-demo/README.md` documenting: what the file was (static chess board demo), why it was written (visual exploration), why it's archived (never finished, gated behind `{false &&`, blocked every Railway deploy from `03:15:58` onward), and the commit that removed its import from `HomePage.tsx`.
  - **Acceptance**: `ls tasks/archive/chess-piece-demo/` returns `Chess.tsx` and `README.md`.
- [x] 1.5 Delete `const ChessBoard = lazy(() => import('src/components/Chess/Chess'))` from `redwood/web/src/pages/HomePage/HomePage.tsx:11`.
- [x] 1.6 Delete the `{false && (...<ChessBoard />...)}` block at `HomePage.tsx:132-146` (including the `{/* The Chess Task */}` and `{/* Feature Tag: Chess Animation is hidden */}` comments above it).
- [x] 1.7 If `lazy` and `Suspense` are no longer referenced in `HomePage.tsx` after the removal, drop them from the `import { ... } from 'react'` statement on line 1.
  - **Acceptance**: `grep -n "Chess\|\blazy\b\|\bSuspense\b" redwood/web/src/pages/HomePage/HomePage.tsx` returns zero matches (unless `lazy`/`Suspense` are used for something else in that file — verify manually).
- [x] 1.8 Run `cd redwood && yarn rw build` locally. It MUST complete with exit 0 and no `UNRESOLVED_IMPORT` error.
  - **Acceptance**: `echo $?` prints `0` after the build. **Verified: exit 0, `redwood/web/dist/` populated with `200.html`, `assets/`, `index.html`, `manifest.json`, `sw.js`.**

## 2. Backend: `AUTH_BYPASS` env var and plug bypass

- [x] 2.1 In `phoenix/config/runtime.exs`, after the `github_allowlist` block and before the production DB config block, add:
  ```elixir
  auth_bypass = System.get_env("AUTH_BYPASS") in ["true", "1", "yes"]

  if auth_bypass and config_env() != :test do
    require Logger
    Logger.warning(
      "[Auth] AUTH_BYPASS=true — authentication is disabled, all requests " <>
      "treated as signed-in as 'preview'. DO NOT USE IN PRODUCTION FOR LONG."
    )
  end

  config :perplexica, :auth_bypass, auth_bypass
  ```
  - **Acceptance**: booting Phoenix with `AUTH_BYPASS=true` logs the warning exactly once; booting without the var (or with `AUTH_BYPASS=false`) logs nothing auth-bypass-related.

- [x] 2.2 In `phoenix/lib/perplexica_web/plugs/require_owner.ex`, replace `call/2` so the first check is the bypass:
  ```elixir
  def call(conn, _opts) do
    if Application.get_env(:perplexica, :auth_bypass, false) do
      assign(conn, :github_username, "preview")
    else
      # existing session + allowlist logic unchanged
    end
  end
  ```
  - **Acceptance**: a request to any `RequireOwner`-gated endpoint with **no session cookie** receives a successful downstream response when `:auth_bypass` is true in application env.

- [x] 2.3 In `phoenix/lib/perplexica_web/controllers/auth_controller.ex`, modify `whoami/2` to check the bypass flag first:
  ```elixir
  def whoami(conn, _params) do
    cond do
      Application.get_env(:perplexica, :auth_bypass, false) ->
        json(conn, %{
          signed_in: true,
          username: "preview",
          avatar_url: nil,
          auth_bypass: true
        })

      # existing cond branches (username nil, username in allowlist,
      # username not in allowlist) unchanged
    end
  end
  ```
  - **Acceptance**: `GET /auth/whoami` with no cookie returns `{"signed_in":true,"username":"preview","avatar_url":null,"auth_bypass":true}` when `:auth_bypass` is true; returns `{"signed_in":false}` when unset.

## 3. Backend tests

- [x] 3.1 In `phoenix/test/perplexica_web/plugs/require_owner_test.exs`, add a scenario:
  - **Given** `Application.put_env(:perplexica, :auth_bypass, true)` and a conn with no session
  - **When** the plug runs
  - **Then** the conn is NOT halted, `conn.assigns.github_username == "preview"`, and `conn.status` is not `401`/`403`
  - **Cleanup** via `on_exit` to restore the original value of `:auth_bypass`.
  - **Acceptance**: `mix test test/perplexica_web/plugs/require_owner_test.exs` passes. **Verified: added two scenarios (no-session pass-through, and real-session override).**

- [x] 3.2 In `phoenix/test/perplexica_web/controllers/auth_controller_test.exs`, add a scenario:
  - **Given** `:auth_bypass` is true in application env
  - **When** `GET /auth/whoami` is called with no cookie
  - **Then** the JSON body is `%{"signed_in" => true, "username" => "preview", "avatar_url" => nil, "auth_bypass" => true}`
  - **Cleanup** via `on_exit`.
  - **Acceptance**: `mix test test/perplexica_web/controllers/auth_controller_test.exs` passes. **Verified: 14 tests, 0 failures across both files.**

## 4. Frontend: parse bypass state, render banner

- [x] 4.1 Open `redwood/web/src/lib/session.ts` (or equivalent). Extend the whoami response type and `SessionContextValue` to include `authBypass: boolean` (default `false`).
  - **Acceptance**: TypeScript compiles; `useSession()` returns an object whose `authBypass` field is typed `boolean`. **File is `session.tsx` in this repo.**

- [x] 4.2 In the same file, map `response.auth_bypass` (snake_case from Phoenix) onto the session context's `authBypass` (camelCase TS). Default to `false` when absent.
  - **Acceptance**: `grep -n auth_bypass redwood/web/src/lib/session.tsx` returns at least one match; unit test or manual console log confirms the value round-trips.

- [x] 4.3 Create `redwood/web/src/components/PreviewModeBanner/PreviewModeBanner.tsx`:
  - Fixed top strip, full width, uses `var(--text-danger)`/`var(--border-accent)` for color tokens consistent with the existing design system (see `AuthThemeToggle` in `SignInGate.tsx` for token usage).
  - Copy: `Preview mode — authentication is disabled. Sign in with GitHub to leave preview.`
  - Small GitHub link that points at `${phoenixUrl}/auth/github` so the operator can sign in directly from the banner.
  - Renders `null` when `authBypass === false`.
  - **Acceptance**: manual browser check — banner appears when `auth_bypass: true` in whoami response, absent otherwise.

- [x] 4.4 Mount `PreviewModeBanner` at the top of the app layout (likely `redwood/web/src/layouts/AppLayout/AppLayout.tsx` or wherever the top-level shell lives). It should render ABOVE the action bar and OUTSIDE the routed content so it's visible on every page.
  - **Acceptance**: navigating across pages (home, library, settings) keeps the banner in place when bypass is on. **Root `flex-col h-dvh` wrapper places the banner above the grid; when `authBypass` is false the component returns null and the grid fills the viewport as before.**

## 5. Local verification

- [ ] 5.1 Run `./dev` with `AUTH_BYPASS=true` exported in the shell. Confirm Phoenix boot logs emit the warning.
- [ ] 5.2 Open `http://localhost:8910/` in a clean browser profile. The sign-in splash should NOT render — instead, the main app with the preview banner at the top.
- [ ] 5.3 Fire a search query. The GraphQL endpoint should return results (not 401/403).
- [ ] 5.4 Unset `AUTH_BYPASS` and restart. Sign-in splash should render as normal. The banner should be absent.
- [ ] 5.5 Complete GitHub OAuth with an allowlisted account. The app should load without the banner (bypass is off, real session is active).
  - **Acceptance**: all four states observed in a single local session without code edits in between.

## 6. Ship

- [ ] 6.1 `git add -p` and commit the changes with a clear message referencing this OpenSpec change. Suggested commit body:
  ```
  feat(auth,redwood): archive Chess demo + add AUTH_BYPASS preview flag

  OpenSpec: openspec/changes/unblock-prod-preview/
  ```
- [ ] 6.2 `git push origin main`.
- [ ] 6.3 Watch `railway deployment list` until the new deploy reaches `SUCCESS` (or diagnose if it fails).
  - **Acceptance**: Railway shows `SUCCESS` status for the deploy triggered by this push, with a timestamp later than `03:09:48` today.

## 7. Post-deploy verification

- [ ] 7.1 With no cookies: `curl -i https://perplexica-production-41f5.up.railway.app/auth/whoami` → expect `{"signed_in":false}` (bypass still off because we haven't set the env var on Railway yet).
- [ ] 7.2 `railway variables --set AUTH_BYPASS=true` (this restarts the container automatically).
- [ ] 7.3 Wait ~30 seconds for the restart. Re-run the whoami curl → expect `{"signed_in":true,"username":"preview","avatar_url":null,"auth_bypass":true}`.
- [ ] 7.4 Open the production URL in a clean browser. The preview banner should be visible at the top. The app should be usable end-to-end: search, library, settings.
  - **Acceptance**: operator confirms visually that the production app renders and the new features from `69f83ad` (four-tab library, per-step search progress, chat lifecycle) behave correctly.

## 8. Flip bypass off once real auth is verified (separate commit if needed)

- [ ] 8.1 `railway variables --remove AUTH_BYPASS` (or set to `false`). Railway restarts the container.
- [ ] 8.2 Sign in with the `stussysenik` GitHub account. OAuth flow should complete and return the operator to `/` with an active session (no banner).
- [ ] 8.3 `curl -i https://perplexica-production-41f5.up.railway.app/auth/whoami` with no cookies → expect `{"signed_in":false}`. The bypass is gone.
  - **Acceptance**: operator signs in successfully via real OAuth, and anonymous callers are rejected by `RequireOwner` as before.

## 9. Update lessons (only if something non-obvious was learned)

- [ ] 9.1 If the deploy cycle uncovered anything non-obvious (timing, banner copy, env propagation quirks), append to `tasks/lessons.md` with the date, symptom, root cause, fix, and a one-line rule. Do NOT append a lesson for issues already covered by the existing `GITHUB_ALLOWLIST` or `priv/static/index.html` entries.

## Dependencies and ordering

- Section 1 (Chess archival) is independent of the rest and can land standalone if needed. It alone unblocks the deploy.
- Sections 2–4 (backend plug + whoami + frontend banner) must ship together or the banner could render with no backend state to back it, or the backend could return `auth_bypass: true` with no frontend to surface it.
- Section 5 (local verification) gates section 6 (ship). Do not push without section 5 passing.
- Sections 7–8 (post-deploy verification and bypass-off) require section 6 to have landed.

## Parallelizable work

- Section 1 can run in parallel with sections 2–4: one engineer removes the Chess import and runs the Vite build, another implements the backend/frontend changes. Merge both before section 5.
