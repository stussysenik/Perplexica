# Smoke Notes — add-github-auth-gate

## Pre-deploy (manual, one-time)

1. Create a GitHub OAuth App at https://github.com/settings/developers.
   - **Application name**: FYOA (dev) / FYOA (prod)
   - **Homepage URL**: `http://localhost:4000` / `https://<your-fly-host>`
   - **Authorization callback URL**: `http://localhost:4000/auth/github/callback`
     and add a second OAuth app (or multiple callback URLs if your GitHub
     plan supports it) for `https://<your-fly-host>/auth/github/callback`.
   - Note the **Client ID** and generate a **Client Secret**.

2. Populate `phoenix/.env.local` for local dev:

   ```
   GITHUB_CLIENT_ID=<from step 1>
   GITHUB_CLIENT_SECRET=<from step 1>
   GITHUB_ALLOWLIST=<your-github-username>
   ```

3. Set the same values on Fly for production:

   ```
   fly secrets set \
     GITHUB_CLIENT_ID=... \
     GITHUB_CLIENT_SECRET=... \
     GITHUB_ALLOWLIST=your-github-username \
     -a perplexica-search
   ```

## Local smoke (run once after first build)

1. `cd phoenix && mix deps.get && mix compile --warnings-as-errors`
2. Start Phoenix: `iex -S mix phx.server`
3. Start Redwood: `pnpm -C redwood/web run dev`
4. Verify `/health` is public:
   ```
   curl -i http://localhost:4000/health
   # → 200 {"status":"ok", ...}
   ```
5. Verify `/api/graphql` is gated:
   ```
   curl -i -X POST http://localhost:4000/api/graphql \
     -H 'Content-Type: application/json' \
     -d '{"query":"{__typename}"}'
   # → 401 {"error":"unauthenticated"}
   ```
6. Verify `/auth/whoami` is public and returns signed_in:false when not signed in:
   ```
   curl -i http://localhost:4000/auth/whoami
   # → 200 {"signed_in":false}
   ```
7. Open `http://localhost:8910` (Redwood dev) in a browser.
   - Expect the FYOA sign-in splash with "Sign in with GitHub" button.
8. Click "Sign in with GitHub" → GitHub OAuth screen → approve → redirect to `/`.
9. App loads normally. Verify a GraphQL query succeeds (e.g., start a new
   search on the homepage).
10. Call `curl -i -X DELETE http://localhost:4000/auth/session --cookie-jar jar.txt`
    and verify a subsequent `/api/graphql` request returns 401.

## Post-deploy (on Fly)

1. `fly deploy -a perplexica-search`
2. Verify health probe still 200 (otherwise Fly will mark the instance unhealthy).
3. Hit the public URL — splash should render.
4. Sign in via GitHub → success → app loads.
5. Sign out from the settings page (added by `add-user-settings-page`) and
   verify you're back at the splash.
