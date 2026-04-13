# Changelog

All notable changes to this project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) — versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-04-13

### Summary

First production release. Ships a complete GitHub OAuth access gate, a redesigned four-tab library,
per-step search progress over WebSocket, and a unified single-binary Railway deployment where Phoenix
serves both the API and the compiled Redwood frontend from the same process and domain.

Production URL: **https://perplexica-production-41f5.up.railway.app**

---

### Added

#### Authentication — GitHub OAuth Gate (`auth-github-gate`)

- **GitHub OAuth sign-in via Ueberauth** — `/auth/github` initiates the OAuth redirect;
  `/auth/github/callback` receives the token, extracts the GitHub username, validates it
  against `GITHUB_ALLOWLIST`, and writes a signed `HttpOnly` session cookie on success.
- **`RequireOwner` plug** — all `/api/graphql` requests are gated. No session → 401.
  Username not in allowlist → 403. Both responses are JSON `{"error":"unauthenticated"}` /
  `{"error":"forbidden"}` so the frontend can distinguish them.
- **`/auth/whoami` endpoint** — stateless session introspection used on every page load.
  Returns `{signed_in, username, avatar_url}`. The frontend renders the sign-in splash or
  the full app based solely on this response.
- **`/auth/session` DELETE** — idempotent sign-out; drops the session cookie and redirects.
- **`GITHUB_ALLOWLIST` env var** — comma-separated GitHub usernames (case-insensitive).
  Empty list → boot warning + every sign-in is denied.
- **Sign-in splash** (`SignInGate.tsx`) — full-page centered card shown when
  `whoami.signed_in === false`. Shows "forbidden" vs generic "failed" error copy based on
  `?auth_error=` query param set by the Phoenix callback.
- **Session context** (`SessionProvider` / `useSession`) — React context that calls `/auth/whoami`
  on mount, caches the result, exposes `refresh()` and `signOut()`, and re-fetches when the
  `fyoa:session-revoked` custom event fires (dispatched by the GraphQL helper on 401/403).
- **`AUTH_BYPASS` escape hatch** — operator-only env var (`AUTH_BYPASS=true`) that short-circuits
  the auth + allowlist gate. When active, all requests are treated as signed in as `"preview"`.
  Logs a loud warning at boot. Shown as a persistent banner in the UI (`PreviewModeBanner`).
  **Disabled in production as of this release** — removed from Railway env vars.

#### Library — Four-Tab Design

- **All / Searches / Bookmarks / Shared** tabs in the Library page — each tab fetches only its
  own data; switching tabs does not re-fetch sibling tabs.
- Searches tab shows conversation threads with message count and last-updated timestamp.
- Bookmarks tab shows saved answers with their source count.
- Shared tab lists answers you have published to a `/s/{slug}` link.

#### Search — Per-Step Progress

- Real-time staged progress via the existing WebSocket subscription:
  `Classifying query` → `Searching (N sources found)` → `Analyzing sources` → `Writing answer`.
- Source count updates live as the agentic research loop adds results.
- Progress stage is persisted in `SearchSession` GenServer state so late WebSocket joiners
  receive the current stage without replaying the full event log.

#### Infrastructure

- **Single-binary Railway deployment** — the Dockerfile builds the Redwood frontend to static
  files in `redwood/web/dist/`, copies them into `phoenix/priv/static/`, and releases a single
  Elixir OTP release. Phoenix serves both the SPA and the API from one process on one domain.
  Eliminates the cross-origin cookie problem entirely.
- **`PHX_HOST` and `CORS_ORIGINS`** set on Railway to the production domain so WebSocket
  `check_origin` passes and Ueberauth constructs the correct OAuth callback URL.
- **Database migrations run at boot** via `start.sh` → `Perplexica.Release.migrate` before
  the server starts.

#### Developer Experience

- **Fail-fast OAuth startup** — `runtime.exs` raises at boot (non-test envs) if
  `GITHUB_CLIENT_ID` or `GITHUB_CLIENT_SECRET` are missing or blank, with an actionable
  message rather than a `CaseClauseError` deep inside Ueberauth.
- **Redwood env var transform fix** — `process.env.PHOENIX_URL` now uses direct dot-access
  throughout `phoenix.ts`. Optional chaining (`process?.env?.PHOENIX_URL`) bypasses Redwood's
  string-replace transform and leaves a live `process` reference that crashes the browser.

---

### Fixed

- **Vite build crash** — `HomePage.tsx` had a `lazy(() => import('src/components/Chess/Chess'))`
  on an untracked file. Vite resolves dynamic imports statically; the import crashed every
  GitHub-triggered Railway build. Archived the Chess component to `tasks/archive/`.
- **PWA stale service worker** — added a kill-switch (`/sw-kill.js`) that unregisters any
  cached SW on load, preventing stale Phoenix-era assets from serving after redeployment.
- **`check_origin` WebSocket error** — `PHX_HOST` was unset, so Phoenix defaulted to
  `example.com` for URL generation. Every WebSocket connection from the real domain was
  rejected. Fixed by setting `PHX_HOST` in Railway.

---

### Changed

- **Light-first theme** — default theme is now `light`; dark mode is an opt-in toggle.
  System preference is read on first visit; explicit toggle is persisted to `localStorage`.
- **Settings page** — accessible from the action bar, shows current model provider + API key
  status, search mode selector (Speed / Balanced / Quality).

---

### Security

- **Session cookie hardening** — `HttpOnly: true`, `SameSite: Lax`, `Secure: true` in
  production (compile-time flag via `Mix.env() == :prod`), 30-day `max_age`.
- **`SECRET_KEY_BASE` required at boot** — missing in prod raises immediately.
- **CORS restricted** — production `cors_origins` set to the exact Railway domain.
- **HSTS** — `Strict-Transport-Security: max-age=31536000; includeSubDomains` on all responses.

---

### How Auth Works (end-to-end)

```
1. Browser loads / → Phoenix serves priv/static/index.html (Redwood SPA)
2. React boots → SessionProvider calls GET /auth/whoami
3. whoami returns {signed_in: false} → SignInGate renders the splash screen
4. User clicks "Sign in with GitHub" → navigates to /auth/github (same origin)
5. Ueberauth redirects → https://github.com/login/oauth/authorize?...
   redirect_uri=https://perplexica-production-41f5.up.railway.app/auth/github/callback
6. User authorises → GitHub redirects back to /auth/github/callback
7. Phoenix extracts github_username from the Ueberauth struct
8. RequireOwner checks: username in GITHUB_ALLOWLIST? → yes → set session cookie
9. Redirect to / → SessionProvider re-calls /auth/whoami
10. whoami returns {signed_in: true, username: "stussysenik"} → app renders
```

---

### Why These Decisions

| Decision | Why |
|---|---|
| Phoenix serves Redwood static files | Eliminates cross-origin cookies. `SameSite=Lax` cookies don't cross origins, so keeping frontend + API on the same domain is mandatory for session-based auth. |
| `GITHUB_ALLOWLIST` not stored in DB | The app has one operator. An env var is the simplest gate — no admin UI, no migration, instant change via `railway variable set`. |
| Ueberauth for OAuth | Battle-tested Elixir library. Handles state parameter (CSRF), token exchange, and user info fetch. No DIY OAuth plumbing. |
| `HttpOnly` session cookie | Prevents JS from reading the session token. XSS cannot steal the cookie. |
| `whoami` called on every page load | Single source of truth for auth state. No stale client-side cache. Cost: one lightweight GET per page load (sub-1ms on Phoenix). |
| AUTH_BYPASS as env var, not code path | Keeps the production code path unchanged. Bypass is purely operational — flip a Railway variable, redeploy. Zero code diff needed to remove it. |

---

## [0.1.0-alpha] — 2026-03-xx

Initial architecture: RedwoodJS + Phoenix + PostgreSQL monorepo deployed to Railway.
Agentic search loop, WebSocket subscriptions, pgvector embeddings, NIM + GLM failover,
Brave Search integration. Full redesign to neuroscience-based design system.

See git history for full detail.
