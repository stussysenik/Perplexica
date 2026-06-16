# Tasks — Kill Stale PWA Service Worker

Work items are ordered by dependency. Each task has acceptance criteria that must be verified (not assumed) before marking complete.

## 1. Ship the kill-switch service worker

- [ ] Create `redwood/web/public/sw.js` with the kill-switch implementation from `design.md`.
- [ ] File must contain no `fetch` event listener.
- [ ] File must call `self.skipWaiting()` in `install` and `self.clients.claim()` + `caches.delete()` + `self.registration.unregister()` + `client.navigate(client.url)` in `activate`.
- [ ] **Acceptance**: `curl http://localhost:8910/sw.js` (after `./dev`) returns the kill-switch source verbatim.

## 2. Remove the buggy Phoenix service worker file

- [ ] `git rm phoenix/priv/static/sw.js`.
- [ ] **Acceptance**: `find phoenix/priv/static -name 'sw.js'` returns nothing.

## 3. Remove PWA artifact files from Phoenix priv/static

- [ ] Confirm no Phoenix template or controller references `manifest.json`, `icon-180.png`, `icon-192.png`, `icon-512.png` in `priv/static/`.
- [ ] `git rm phoenix/priv/static/manifest.json`
- [ ] `git rm phoenix/priv/static/icon-180.png`
- [ ] `git rm phoenix/priv/static/icon-192.png`
- [ ] `git rm phoenix/priv/static/icon-512.png`
- [ ] **Acceptance**: `ls phoenix/priv/static/` contains only files that are still referenced elsewhere (assets/, fonts/, images/, favicon.ico, robots.txt if present, and the SPA shell for prod).

## 4. Update Phoenix `static_paths/0`

- [ ] Edit `phoenix/lib/perplexica_web.ex:25` — remove `sw.js`, `manifest.json`, `icon-180.png`, `icon-192.png`, `icon-512.png` from the `~w(...)` list.
- [ ] Keep `assets fonts images favicon.ico robots.txt` and any unrelated entries.
- [ ] **Acceptance**: `mix compile` succeeds. `curl http://localhost:4000/sw.js` returns 404 (or whatever Phoenix's not-found fallback is), not a cached worker body.

## 5. Verify end-to-end in a clean browser profile

- [ ] Start dev with `./dev`.
- [ ] Open a **fresh browser profile** (no existing SW registration) pointed at `http://localhost:8910/`.
- [ ] Confirm: no `/auth.ts` module error, no `[SW] Registered` console line, Vite HMR WebSocket connects (console shows `[vite] connected`).
- [ ] Click "Sign in with GitHub", complete OAuth, confirm the post-callback redirect lands on the real app (not the splash, not a broken page).
- [ ] Take screenshots of: (a) signed-out splash, (b) post-auth main app, (c) DevTools → Application → Service Workers panel showing "no service workers" (or only the kill-switch in `redundant` state). Save to `tasks/sw-kill-switch-verified-*.png`.
- [ ] **Acceptance**: all three screenshots prove the fix end-to-end.

## 6. Verify recovery path in a dirty browser profile

- [ ] In a browser profile that has the stale SW installed (or simulate by manually registering the old 24-line `sw.js` against `http://localhost:8910/`):
  - [ ] Load `http://localhost:8910/` once — this fetches the kill-switch, activates it, and triggers `client.navigate(client.url)`.
  - [ ] Confirm the page reloads automatically.
  - [ ] Confirm DevTools → Application → Service Workers shows the kill-switch as `activated and is running`, followed by `redundant` after unregistration.
  - [ ] Reload a second time — confirm no SW is registered.
- [ ] **Acceptance**: the browser recovers from a dirty state automatically without manual DevTools intervention.

## 7. Append regression note to `tasks/lessons.md`

- [ ] Add the "Never ship a service worker without a kill-switch plan" entry from `design.md`.
- [ ] Include the commit SHA (`02423dd`) and the `phoenix/priv/static/sw.js` path so future greps land on the context.
- [ ] **Acceptance**: `grep -n "kill-switch" tasks/lessons.md` finds the new entry.

## 8. OpenSpec validation

- [ ] `openspec validate kill-stale-pwa-service-worker --strict` (or whatever this repo's OpenSpec linter is).
- [ ] **Acceptance**: validation passes with zero warnings.

## 9. Commit and ship

- [ ] Stage only the files listed in "Affected code" in `proposal.md`.
- [ ] Commit message:
  ```
  fix(pwa): evict stale service worker that broke post-OAuth navigation

  The retired Phoenix smoke-test UI registered a SW whose fetch handler
  responded with `undefined` on cache miss, collapsing Vite HMR and
  module loading on localhost:8910 after the OAuth redirect. Ship a
  kill-switch SW at /sw.js, delete the Phoenix PWA artifacts, and
  drop sw.js from static_paths/0.

  See openspec/changes/kill-stale-pwa-service-worker/.
  ```
- [ ] **Acceptance**: `git log -1` shows the commit; `git status` is clean.

## 10. Archive the OpenSpec change after deploy

- [ ] After the fix is verified in production (Railway), run `/openspec:archive kill-stale-pwa-service-worker`.
- [ ] **Acceptance**: the change folder is moved under `openspec/changes/archived/` with a dated suffix.
