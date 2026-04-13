# Lessons

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
