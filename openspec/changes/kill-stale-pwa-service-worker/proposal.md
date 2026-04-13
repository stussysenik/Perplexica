# Kill Stale PWA Service Worker

## Why

After the GitHub OAuth callback, Phoenix redirects the browser to `http://localhost:8910/` (Redwood dev). The app then fails to boot with a cascade of console errors:

```
[SW] Registered, scope: http://localhost:8910/
Failed to load 'http://localhost:8910/auth.ts'. A ServiceWorker
  intercepted the request and encountered an unexpected error. (sw.js:70:11)
[vite] failed to connect to websocket.
  (browser) localhost:8910/ <--[WebSocket (failing)]--> localhost:8910/ (server)
```

Root cause — a **stale service worker** registered for scope `http://localhost:8910/` from a prior session:

1. The retired Phoenix smoke-test UI (`tasks/archive/phoenix-legacy-smoke-test-ui/index.html:688-690` — previously served at `phoenix/priv/static/index.html`) contained:
   ```js
   if ('serviceWorker' in navigator) {
     navigator.serviceWorker.register('/sw.js').catch(() => {});
   }
   ```
2. The SW file (`phoenix/priv/static/sw.js:21-23`) has a broken fetch handler:
   ```js
   e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
   ```
   When `fetch()` fails (network error, CORS, Vite dev-module request) **and** the cache has no match, `caches.match()` returns `undefined`. The SW then calls `respondWith(undefined)`, which the browser surfaces as *"ServiceWorker intercepted the request and encountered an unexpected error"* — killing the request, the module graph, and Vite's HMR WebSocket.
3. Service workers persist in the browser across deployments. Even though the legacy HTML was moved to `tasks/archive/` and `redwood/web/` never registers a SW (grep confirms zero `serviceWorker.register` calls in `redwood/web/`), the installed SW keeps running for its scope until explicitly unregistered.
4. The running SW is a ~70-line version (error cites `sw.js:70:11`) — larger than the 24-line file on disk — so it's an even older bundle than what the repo has today. This is a textbook stale-SW bug.
5. Phoenix still advertises `sw.js` in its static allowlist (`phoenix/lib/perplexica_web.ex:25`), keeping the dead path alive:
   ```elixir
   def static_paths, do: ~w(assets fonts images favicon.ico robots.txt
                            manifest.json sw.js icon-180.png icon-192.png icon-512.png)
   ```

The user cannot get past the auth splash into the main application because every asset fetched after redirect is hijacked by the dead SW.

## What Changes

- **Add a kill-switch service worker at `redwood/web/public/sw.js`** that:
  - Skips waiting and claims clients immediately on install/activate
  - Deletes every cache via `caches.keys()` + `caches.delete()`
  - Unregisters itself via `self.registration.unregister()`
  - Does **not** register a `fetch` handler — all requests pass straight through
  - When served from `localhost:8910/sw.js`, replaces the running SW, evicts itself, and leaves a clean browser.
- **Delete `phoenix/priv/static/sw.js`** — the file that introduced the buggy fetch handler.
- **Remove `sw.js` from the Phoenix static allowlist** in `phoenix/lib/perplexica_web.ex:25` so Plug.Static stops serving the dead path on :4000.
- **Delete `phoenix/priv/static/icon-180.png`, `icon-192.png`, `icon-512.png`, `manifest.json`** if they are only referenced by the retired smoke-test UI. (Redwood has its own `web/public/manifest.json` and `web/public/favicon.png`, so Phoenix does not need PWA assets.)
- **Add a regression note to `tasks/lessons.md`** — "never register a service worker without a deploy-ready kill-switch path" — so future PWA experiments don't strand users on a dead SW.
- **NON-GOAL**: this change does **not** restore PWA support. If we want PWA again later, that is a separate change with a versioned SW + update-on-reload + kill-switch strategy designed in from day one.

## Capabilities

### New Capabilities
- `pwa-hygiene`: rules governing how the app may (or may not) ship a service worker, how stale workers must be evicted, and how the dev server must remain SW-free unless an active PWA spec exists.

### Modified Capabilities
None — no existing PWA or SW spec to revise.

## Impact

- **Affected specs**: new capability `pwa-hygiene` (this change).
- **Affected code**:
  - `redwood/web/public/sw.js` — NEW kill-switch worker
  - `phoenix/priv/static/sw.js` — DELETED
  - `phoenix/priv/static/manifest.json` — DELETED (references the dead SW)
  - `phoenix/priv/static/icon-180.png` — DELETED
  - `phoenix/priv/static/icon-192.png` — DELETED
  - `phoenix/priv/static/icon-512.png` — DELETED
  - `phoenix/lib/perplexica_web.ex:25` — drop `sw.js`, `manifest.json`, `icon-*.png` from `static_paths/0`
  - `tasks/lessons.md` — append regression note
- **User impact**: on first visit after merge, every affected browser loads the kill-switch SW once, it wipes the stale one, and the next navigation is clean. No user-visible downtime.
- **Reversibility**: trivial — revert the commit. The kill-switch is harmless; leaving it in place forever is also fine.
- **Dependencies**: none. Pure frontend + config cleanup.
- **Risk**: if a browser has the old SW and never hits `/sw.js` again, it will keep running. Mitigation: the kill-switch SW is versioned and the Redwood dev server serves it on every `/sw.js` request during HMR, so the browser will pick it up on the next reload after merge.
