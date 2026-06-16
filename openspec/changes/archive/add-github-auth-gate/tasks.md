# Tasks — Add GitHub Auth Gate

## 1. Dependencies and configuration
- [x] 1.1 Add `{:ueberauth, "~> 0.10"}` and `{:ueberauth_github, "~> 0.8"}` to `phoenix/mix.exs` deps; run `mix deps.get` in the Phoenix worktree.
- [x] 1.2 Configure Ueberauth providers in `phoenix/config/config.exs`: register the GitHub strategy with `default_scope: "read:user"` and OAuth credentials pulled from env.
- [x] 1.3 Read `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_ALLOWLIST`, `PHOENIX_SESSION_SECRET_KEY_BASE`, `PHOENIX_SESSION_SIGNING_SALT` in `phoenix/config/runtime.exs`; lowercase and split the allowlist; log a warning when it is empty.
- [x] 1.4 Add `.env.example` entries for the new vars; deprecate `NEXT_PUBLIC_CLERK_*` / `CLERK_*` in `.env.local` with an inline comment explaining they are unused.

**Verification**: `mix deps.get && mix compile --warnings-as-errors` passes. `iex -S mix` boots and `Application.get_env(:perplexica, :github_allowlist)` returns the parsed list.

## 2. Session plug and router wiring
- [x] 2.1 Configure `Plug.Session` on `PerplexicaWeb.Endpoint` with the cookie store, secret key base, signing salt, `http_only: true`, `same_site: "Lax"`, `secure: Mix.env() == :prod`, `max_age: 60*60*24*30`.
- [x] 2.2 Add a `:browser_auth` pipeline in `router.ex` with `plug :fetch_session`, `plug :fetch_flash`, `plug :protect_from_forgery`, `plug :put_secure_browser_headers` — used by the `/auth/*` scope only.
- [x] 2.3 Add the `PerplexicaWeb.Plugs.RequireOwner` plug to the `:api` pipeline, ordered after `:fetch_session` (which must also be added to `:api`) and before rate limiting.

**Verification**: `mix phx.routes` shows the auth routes; `curl -i http://localhost:4000/api/graphql -XPOST -d '{}'` returns 401 with `{"error":"unauthenticated"}`.

## 3. RequireOwner plug
- [x] 3.1 Create `phoenix/lib/perplexica_web/plugs/require_owner.ex`. Read `get_session(conn, :github_username)`. If nil → send `send_resp(conn, 401, Jason.encode!(%{error: "unauthenticated"}))` and `halt`. If present but not in allowlist → 403 + `halt`. Otherwise assign and continue.
- [x] 3.2 Write ExUnit test `test/perplexica_web/plugs/require_owner_test.exs` covering: no-session → 401, non-allowlisted → 403, allowlisted → passes through, empty-allowlist → 403.

**Verification**: `mix test test/perplexica_web/plugs/require_owner_test.exs` green.

## 4. AuthController
- [x] 4.1 Create `phoenix/lib/perplexica_web/controllers/auth_controller.ex` with actions `request/2`, `callback/2`, `whoami/2`, `sign_out/2`. Hook `request` and `callback` up via `Ueberauth.Plug` middleware in the auth scope.
- [x] 4.2 In `callback/2`, on `{:ok, %Ueberauth.Auth{}}` → lowercase the GitHub login, call `configure_session(conn, renew: true)`, `put_session(conn, :github_username, login)`, `put_session(conn, :github_user_id, uid)`, `put_session(conn, :avatar_url, url)`, redirect to `/`. On `{:error, _}` → `configure_session(conn, drop: true)`, redirect to `/?auth_error=1`.
- [x] 4.3 `whoami/2` reads session, checks allowlist, returns 200 JSON matching REQ-AUTHGATE-003. Clears session if the username was valid at sign-in but has since been removed from the allowlist.
- [x] 4.4 `sign_out/2` calls `configure_session(conn, drop: true)` and returns 204.
- [x] 4.5 Add `phoenix/lib/perplexica_web/controllers/auth_html/` (empty — controller is API-style, no templates). Register routes in the `:browser_auth` scope: `get "/auth/github"`, `get "/auth/github/callback"`, `get "/auth/whoami"`, `delete "/auth/session"`.
- [x] 4.6 Write `test/perplexica_web/controllers/auth_controller_test.exs` covering `whoami` signed-out / signed-in / revoked, `sign_out` happy path. Use `Plug.Test.init_test_session/2` to simulate sessions. Do not hit GitHub in tests.

**Verification**: `mix test test/perplexica_web/controllers/auth_controller_test.exs` green. Manual: `curl -i http://localhost:4000/auth/whoami` returns `{"signed_in":false}`. `open http://localhost:4000/auth/github` in a browser redirects to github.com.

## 5. Frontend session provider
- [x] 5.1 Update `redwood/web/src/lib/phoenix.ts` — the Apollo `createHttpLink` call gains `credentials: 'include'` so the session cookie rides along with every GraphQL request.
- [x] 5.2 Create `redwood/web/src/lib/session.tsx` exporting `SessionProvider`, `useSession`, and a `refresh()` action. On mount it fetches `${PHOENIX_URL}/auth/whoami` with `credentials: 'include'`. State: `{ status: 'loading' | 'signed_in' | 'signed_out', username?, avatarUrl? }`.
- [x] 5.3 Add an Apollo error link that detects `statusCode === 403` or `statusCode === 401` on network errors and calls `refresh()`; integrate it into the Apollo client.

**Verification**: `pnpm -C redwood/web run type-check` or `npx tsc --noEmit` (whichever matches Redwood's setup) passes. Dev server: `pnpm -C redwood/web run dev`; browser console `fetch('/auth/whoami', {credentials:'include'}).then(r=>r.json())` returns `{signed_in:false}` initially.

## 6. SignInGate component
- [x] 6.1 Create `redwood/web/src/components/Auth/SignInGate.tsx`. Reads `useSession()`. Renders a loading spinner while `status === 'loading'`; a full-page splash with the "Sign in with GitHub" anchor (`<a href={${PHOENIX_URL}/auth/github}>`) while `signed_out`; `children` while `signed_in`.
- [x] 6.2 Style the splash using existing design tokens (centered card, FYOA wordmark, Phosphor GithubLogo icon, thin-line border, accent-blue button). No new CSS variables.
- [x] 6.3 Wrap the router tree in `App.tsx` as `<SessionProvider><SignInGate><Routes /></SignInGate></SessionProvider>`.

**Verification**: With backend down or allowlist empty, loading `/` shows the splash. With backend up and session set (via manual `curl` + cookie jar), `/` shows the app.

## 7. End-to-end verification
- [x] 7.1 Playwright e2e: update `e2e/home.spec.ts` (or add `e2e/auth.spec.ts`) — signed-out state shows the splash; can navigate to `/auth/github` and mock the callback to set a session; after callback, the app loads and GraphQL works.
- [x] 7.2 Manual smoke: real GitHub OAuth app with localhost callback; sign in; verify a real GraphQL query succeeds; sign out; verify next query returns 401.

**Verification**: Playwright suite green; manual smoke documented in `openspec/changes/add-github-auth-gate/smoke-notes.md` (created during task 7.2).

## 8. Ship checklist
- [x] 8.1 Create a GitHub OAuth App with `http://localhost:4000/auth/github/callback` and the Fly production callback URL; record client id/secret.
- [x] 8.2 Set `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_ALLOWLIST`, `PHOENIX_SESSION_SECRET_KEY_BASE`, `PHOENIX_SESSION_SIGNING_SALT` on Fly with `fly secrets set`.
- [x] 8.3 Deploy; verify `/health` still returns 200 unauthenticated; verify `/api/graphql` returns 401 without cookie; verify the browser flow works end-to-end against the deployed instance.
- [x] 8.4 Mark this change ready for archive after one successful signed-in session from the production instance.
