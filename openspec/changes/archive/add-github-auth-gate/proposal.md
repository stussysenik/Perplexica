# Add GitHub Auth Gate

## Why

The Phoenix GraphQL endpoint at `/api/graphql` is fully public. Any caller who can reach the origin can run searches, read chat history, and exercise third-party API budgets (NIM, GLM, Brave, Exa). The owner needs exclusive access — the app is single-tenant by intent, not a shared service. Adding a GitHub-OAuth gate keyed to a configurable username allowlist is the minimum viable authorization for a one-person self-hosted deployment.

## What Changes

- Phoenix gains `ueberauth` + `ueberauth_github` dependencies and a GitHub OAuth strategy configured via env vars.
- `Plug.Session` is configured on the endpoint with a signed cookie store (30-day max age, `HttpOnly`, `SameSite=Lax`, `Secure` in prod).
- New `AuthController` with actions `request`, `callback`, `whoami`, `sign_out` mounted under a `/auth/*` scope.
- New `PerplexicaWeb.Plugs.RequireOwner` added to the `:api` pipeline — reads `github_username` from the session, rejects missing sessions with `401`, rejects non-allowlisted sessions with `403`.
- The Redwood frontend gains a `SessionProvider` context + `SignInGate` component; when `/auth/whoami` returns `signed_in: false`, the app renders a full-page splash with a "Sign in with GitHub" anchor instead of the router tree.
- The Apollo client is reconfigured with `credentials: 'include'` so session cookies ride along with every GraphQL request, and an error link handles `401`/`403` by refreshing the session provider.
- The health endpoint and the static SPA shell stay public. CORS preflight stays public.
- **BREAKING**: after deploy, any GraphQL client without a signed-in session receives `401`. There are no existing authenticated clients to migrate (no auth today).
- `.env.local` gains `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_ALLOWLIST`, `PHOENIX_SESSION_SECRET_KEY_BASE`, `PHOENIX_SESSION_SIGNING_SALT`. The dormant `NEXT_PUBLIC_CLERK_*` and `CLERK_*` entries are deleted.

## Capabilities

### New Capabilities
- `auth-github-gate`: GitHub OAuth sign-in via Ueberauth, cookie-based session, username-allowlist authorization on the GraphQL pipeline, and the frontend sign-in gate that renders a splash for signed-out users.

### Modified Capabilities
None — this repo has no existing auth capability spec.

## Impact

- **Affected specs**: new capability `auth-github-gate` (this change).
- **Affected code**:
  - `phoenix/mix.exs` — add `ueberauth` + `ueberauth_github` deps
  - `phoenix/config/config.exs` — Ueberauth providers config
  - `phoenix/config/runtime.exs` — runtime env reads for client id/secret/allowlist/session
  - `phoenix/lib/perplexica_web/endpoint.ex` — `Plug.Session` config
  - `phoenix/lib/perplexica_web/router.ex` — new `:browser_auth` pipeline, `/auth/*` scope, `RequireOwner` on `:api`
  - `phoenix/lib/perplexica_web/controllers/auth_controller.ex` — new
  - `phoenix/lib/perplexica_web/plugs/require_owner.ex` — new
  - `redwood/web/src/lib/phoenix.ts` — Apollo `credentials: 'include'` + error link
  - `redwood/web/src/lib/session.tsx` — new provider/hook
  - `redwood/web/src/components/Auth/SignInGate.tsx` — new splash + gate
  - `redwood/web/src/App.tsx` — wrap with `SessionProvider` + `SignInGate`
- **Dependencies**: one new Phoenix GitHub OAuth App (created in the owner's GitHub account) with callback URLs for localhost and Fly production.
- **Deployment**: first deploy after merge will force a sign-in for any active browser tab — no tab has a session today, so the practical impact is one sign-in per device.
- **Reversibility**: to disable the gate, unset `GITHUB_ALLOWLIST` (locks everyone out) or temporarily remove `plug RequireOwner` from the `:api` pipeline.
