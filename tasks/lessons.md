# Lessons

## 2026-04-13 — Never ship a service worker without a kill-switch plan

**Symptom**: after completing GitHub OAuth, the Redwood SPA at `localhost:8910` failed to boot. Console showed `Failed to load 'http://localhost:8910/auth.ts'. A ServiceWorker intercepted the request and encountered an unexpected error (sw.js:70:11)` plus Vite's `[vite] failed to connect to websocket`. The main app never rendered — the user was stranded after sign-in.

**Root cause**: commit `02423dd` ("feat: PWA support") shipped `phoenix/priv/static/sw.js` for the legacy smoke-test UI at `phoenix/priv/static/index.html`. The SW's fetch handler was `e.respondWith(fetch(e.request).catch(() => caches.match(e.request)))` — when both the network fetch failed **and** the cache had no match, `caches.match()` returned `undefined`, the SW called `respondWith(undefined)`, and the browser surfaced a generic "unexpected error" for every intercepted request. Service workers persist in the browser across deployments — even after the legacy HTML was moved to `tasks/archive/phoenix-legacy-smoke-test-ui/`, every browser that had ever loaded it kept running the dead SW against scope `http://localhost:8910/`. HMR WebSocket upgrade + arbitrary ESM module loads both collapsed under it.

**Fix**: landed as `openspec/changes/kill-stale-pwa-service-worker/`. Three parts:
1. Kill-switch SW at `redwood/web/public/sw.js` — skipWaiting, claim clients, clear every cache, `self.registration.unregister()`, force reload. **No fetch handler** so requests go straight to the network. Replaces the running SW on first navigation and evicts itself.
2. Deleted `phoenix/priv/static/{sw.js,manifest.json,icon-*.png}` and dropped those entries from `PerplexicaWeb.static_paths/0` in `phoenix/lib/perplexica_web.ex`. Phoenix now exposes zero PWA surface.
3. This entry, so nobody reintroduces a PWA experiment without a deploy-ready eviction path.

**Rule**: any future service worker must (a) version itself, (b) ship alongside a kill-switch at the same URL, (c) have a dedicated OpenSpec change defining cache invalidation and eviction before the first registration call. No ad-hoc PWA experiments. **Service workers are load-bearing code that survives the repo — treat them with the same care as a database migration.**

**Reference**: the offending commit is `02423dd`; the file paths to grep for context are `phoenix/priv/static/sw.js` (deleted) and `redwood/web/public/sw.js` (the kill-switch).

---

## 2026-04-13 — Redwood `process.env` replacement needs direct dot access

**Symptom**: production SPA threw `Uncaught ReferenceError: process is not defined` and React never mounted. Bundle analysis showed `process == null ? void 0 : ...` — the compiled form of optional chaining — had survived the build transform.

**Root cause**: `redwood/redwood.toml` whitelists env vars via `[web].includeEnvironmentVariables = ["PHOENIX_URL", ...]`. Redwood's Vite plugin substitutes references to those vars at build time, but only matches the direct AST shape `process.env.VAR` — it does NOT match `process?.env?.VAR` (optional chaining). When optional chaining is used, the `process` identifier is left intact, and the browser has no global `process`.

**Fix**: use direct dot access only — `process.env.PHOENIX_URL`, never `process?.env?.PHOENIX_URL`. Keep `declare const process: { env: { PHOENIX_URL?: string } }` at the top of the file so TypeScript doesn't complain.

**Verification**: after the fix, `grep -cE 'process == null \? void 0' redwood/web/dist/assets/index-*.js` returns `0` and the browser console is clean.

**Reference**: `redwood/web/src/lib/phoenix.ts` (commit `85c417f`).

---

## 2026-04-13 — Railway does not auto-deploy from GitHub by default

**Symptom**: `git push origin main` landed on GitHub but Railway never triggered a new build. The most recent Railway deployment was still serving the pre-push code.

**Root cause**: Railway projects aren't automatically wired to the source GitHub repo. The project had been created without connecting a repo under Settings → Source. Pushes to GitHub do nothing until that integration is configured.

**Fix**:
1. Immediate: `railway up --detach` uploads the current working directory and triggers a build, bypassing GitHub entirely.
2. Durable: in Railway dashboard → Project → Service → Settings → Source → Connect GitHub Repo → pick the repo and branch. Future pushes auto-deploy.

**How to tell which one is running**: `railway deployment list` shows timestamps. If the most recent deployment predates your last push, the GitHub trigger is not wired.

---

## 2026-04-13 — Phoenix `Plug.Static` falls through on missing files to the router catch-all

**Symptom**: requesting `/assets/index-<OLD_HASH>.js` returned `content-type: text/html` — the SPA HTML — instead of JavaScript. The browser tried to parse HTML as JS and broke.

**Root cause**: `Plug.Static` is configured with `raise_on_missing_only: code_reloading?`. In prod `code_reloading?` is `false`, so when the requested asset does not exist on disk, `Plug.Static` passes through to the next plug instead of returning 404. The router's catch-all `get "/*path", PageController, :index` then serves `index.html` for what should have been a 404.

**When this bites**: old browser tabs / CDN cached HTML that references asset hashes from a previous build. The user loads the cached HTML, which points at an asset hash that no longer exists in the current container, and instead of a clean 404 they get HTML served as JS and a cryptic parse error.

**Mitigation**: (a) hard-refresh after any new deploy, (b) consider setting `raise_on_missing_only: true` in prod so missing assets return 404 explicitly, which is a clearer signal than "SPA shell masquerading as JS." Not done yet; file a follow-up if this pattern recurs.

---

## 2026-04-13 — Phoenix smoke-test SPA shadowed the real Redwood frontend

**Symptom**: GitHub OAuth came back with `?auth_error=forbidden` and the browser landed on `http://localhost:4000/?auth_error=forbidden` showing a hand-rolled "What do you want to know?" UI with Speed/Balanced/Quality pills. It looked like the new Redwood redesign had regressed to an older version and the theme toggle, splash, and settings page were all gone. They weren't — the browser was looking at a completely different file.

**Root cause**: `phoenix/priv/static/index.html` was a 693-line single-file HTML/JS smoke-test app written early in the rewrite, before the Redwood frontend existed. `PerplexicaWeb.PageController.index/2` served it as the catch-all at `/`. In prod that entry point is fine because the Redwood build pipeline overwrites `priv/static/index.html` with the compiled SPA shell on deploy. In local dev the Redwood app lives on its own dev server (`:8910`) and nothing ever overwrites the stale file — so visiting `:4000/` in dev (including the landing point for `AuthController.callback/2`'s `redirect(to: "/")`) served legacy scaffolding from months ago.

**Why it was hard to spot**:

1. The legacy file looked plausibly "real" — it rendered, it even talked to `/api/graphql` — so "this is stale" wasn't the first hypothesis.
2. The OAuth failure (`auth_error=forbidden`, from the `GITHUB_ALLOWLIST` gate in `auth_controller.ex:50`) and the legacy-file regression were *two independent bugs* that happened to surface in the same page view. Staring at the screen you saw "OAuth broken AND UI regressed." Reality: OAuth worked and the gate rejected you correctly; the UI was the wrong file.
3. Prod and dev happened to share the same file path for index.html with completely different lifecycles — a classic "dev and prod are subtly different environments" trap.

**Fix**:

- Archived the legacy file to `tasks/archive/phoenix-legacy-smoke-test-ui/` (with a README explaining its purpose, why it existed, and why it's gone) so the artifact is still reachable if anyone needs to understand the rewrite's history.
- `phoenix/lib/perplexica_web.ex` — removed `"index.html"` from `static_paths/0` so `Plug.Static` no longer tries to serve the file. `assets`, `favicon`, `manifest`, icons, `sw.js` stay.
- `phoenix/lib/perplexica_web/controllers/page_controller.ex` — now reads a `:frontend_url` app config. When set, redirects to `<frontend_url><path><query>`. When unset, falls back to `send_file` of `priv/static/index.html` (the prod path).
- `phoenix/config/dev.exs` — sets `config :perplexica, :frontend_url, "http://localhost:8910"` so dev bounces every catch-all request to the Redwood dev server. Prod leaves it unset.
- `AuthController` is unchanged on purpose. It still does `redirect(to: "/")` and lets `PageController.index` make the env-aware call. OAuth callbacks now land on `:8910/?auth_error=...` in dev and `/?auth_error=...` same-origin in prod, both rendering the real Redwood splash.

**Guard against recurrence**: no code in `phoenix/priv/static/` should ever be hand-authored. That directory is a build artifact target — anything there should come from either the Redwood build pipeline (in prod) or nothing (in dev). If a hand-written HTML file ever reappears under `priv/static/`, treat it as regression.

**Follow-up still open**: `GITHUB_ALLOWLIST` was empty at the time of this debug session, which is how we hit the `forbidden` branch in the first place. That's a separate env-var bug to fix next — the dev script should surface a clearer warning when the allowlist is empty, and the sign-in page should distinguish "you're not allowlisted" from a generic auth error.

---

## 2026-04-13 — `./dev` sourced the wrong `.env.local`

**Symptom**: `bun run dev` crashed Phoenix at boot with `GITHUB_CLIENT_ID=""` even though the credentials were sitting in `.env.local` at the repo root. Manually running `set -a; source .env.local; set +a; bun run dev` worked. No shell state was carried across reboots or fresh terminals, so the problem kept coming back.

**Root cause**: the `./dev` launcher script sourced `$ROOT/phoenix/.env.local`, not `$ROOT/.env.local`. Two env files had grown in parallel during the rewrite:

- `.env.local` at the repo root — the authoritative file. Holds everything: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_ALLOWLIST`, database, Supabase, Clerk, NIM, GLM, Brave, Exa. Also the file the Phoenix `runtime.exs:40-46` onboarding message tells you to source.
- `phoenix/.env.local` — a 5-line historical subset (NIM, GLM, Brave). Created early in the rewrite when Phoenix was the only service and Phoenix-specific keys lived alongside Phoenix code. Outlived its purpose and never got cleaned up.

`./dev` still pointed at the legacy subset. It loaded three inference keys and none of the OAuth creds, so Phoenix started with empty `GITHUB_CLIENT_ID`, `runtime.exs:36` raised, and the whole `bun run dev` invocation crashed before the user could hit the new UI.

**Fix**: `./dev` now sources `$ROOT/.env.local` FIRST (authoritative), then optionally layers `$ROOT/phoenix/.env.local` on top if it exists (so any developer who still has the legacy file isn't surprised). After both files are sourced, the script fails fast with an actionable error if `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET` are still empty, and warns loudly if `GITHUB_ALLOWLIST` is empty — neither condition should require reading Phoenix's stack trace to diagnose.

**Unexpected detail worth remembering**: the repo-root `.env.local` file has two leading spaces on every line (`  FOO=bar`). Bash's parser is tolerant of this — `source` strips the leading whitespace before treating the line as an assignment — so `set -a; source .env.local; set +a` exports everything correctly. Verified with `bash -c 'set -a; source .env.local; set +a; echo "$GITHUB_CLIENT_ID"'` before wiring the fix. If you ever switch env loaders (e.g. to a strict parser like `env-cmd` or `dotenv`), those leading spaces may stop working and the file should be reflowed.

**Guard against recurrence**: having two `.env.local` files for the same monorepo is the real smell. Follow-up: consolidate into a single file at the repo root and delete `phoenix/.env.local`. The current `./dev` script still loads it as a safety net, but once it's gone that whole code path can be removed.
