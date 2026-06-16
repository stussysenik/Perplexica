# PWA Hygiene

## Description

Rules governing how Perplexica may (or may not) ship a service worker, how stale workers must be evicted, and how the dev server must remain service-worker-free unless an active PWA spec defines one. Born from the `kill-stale-pwa-service-worker` change after a buggy SW from the retired smoke-test UI stranded every browser that had ever loaded the legacy Phoenix static HTML.

## ADDED Requirements

### Requirement: No service worker without a spec

The repo SHALL NOT register a service worker in any environment unless a live OpenSpec capability under `openspec/specs/` defines it, including its versioning scheme, cache-invalidation strategy, and eviction path.

#### Scenario: grep finds a stray SW registration

**Given** a developer runs `grep -rn "serviceWorker.register" redwood/ phoenix/` on `main`
**When** the command completes
**Then** it returns **zero matches outside** the kill-switch SW file and any SW files explicitly approved by a live PWA spec.

#### Scenario: new PR adds SW registration without a spec

**Given** a PR adds `navigator.serviceWorker.register(...)` to any file
**And** no OpenSpec change exists that modifies or adds a `pwa-*` capability
**When** CI (or human review) runs
**Then** the PR must be blocked until a spec is written. The kill-switch SW (`redwood/web/public/sw.js`) is the only exception and does not count as a registration — it is a SW **file**, not a registration call.

### Requirement: Kill-switch SW must remain deployed at `/sw.js`

A kill-switch service worker SHALL exist at `redwood/web/public/sw.js` and SHALL be served at `http://<host>/sw.js` in every environment (dev, prod, tunneled). It MUST replace any stale SW acquired during prior releases.

#### Scenario: dev server serves the kill-switch

**Given** `./dev` is running
**When** a client requests `http://localhost:8910/sw.js`
**Then** the response body matches the kill-switch implementation (skipWaiting + claim + clear caches + unregister + no fetch handler).

#### Scenario: production build ships the kill-switch

**Given** the Redwood production build has completed
**When** the resulting bundle is inspected
**Then** `dist/sw.js` exists and matches the kill-switch source.

#### Scenario: kill-switch has no fetch handler

**Given** the kill-switch SW source
**When** the source is parsed
**Then** it contains **zero** occurrences of `addEventListener('fetch'` or `onfetch =`.

### Requirement: Phoenix must not serve PWA artifacts

Phoenix's `static_paths/0` SHALL NOT include `sw.js`, `manifest.json`, or any `icon-*.png` unless a PWA spec explicitly requires Phoenix to host them.

#### Scenario: static allowlist is PWA-free

**Given** `phoenix/lib/perplexica_web.ex:static_paths/0`
**When** the list is inspected
**Then** it does not contain `"sw.js"`, `"manifest.json"`, `"icon-180.png"`, `"icon-192.png"`, or `"icon-512.png"`.

#### Scenario: Phoenix priv/static is PWA-free

**Given** the `phoenix/priv/static/` directory
**When** inspected
**Then** it does not contain `sw.js`, `manifest.json`, or any `icon-*.png` file — those belong in `redwood/web/public/` if they are needed at all.

### Requirement: Post-OAuth navigation must not be SW-mediated

After the GitHub OAuth callback redirects to `http://localhost:8910/` (or the prod equivalent), the first request and all subsequent module/HMR requests SHALL reach the network directly and MUST NOT be intercepted by a service worker fetch handler.

#### Scenario: clean browser profile after OAuth

**Given** a browser profile with no existing SW registration
**When** the user completes the OAuth flow and lands on `http://localhost:8910/`
**Then** the DevTools Network panel shows every resource served with a `(disk cache)` or `(from server)` source — **not** `(ServiceWorker)`.
**And** the Vite HMR WebSocket at `ws://localhost:8910/?token=...` connects successfully and logs `[vite] connected` in the console.
**And** the main app layout renders (not the sign-in splash or a blank page).

#### Scenario: dirty browser profile after OAuth

**Given** a browser profile with a stale PWA SW at scope `http://localhost:8910/`
**When** the user visits `http://localhost:8910/` after the kill-switch is deployed
**Then** the browser downloads `sw.js`, activates the kill-switch, clears all caches, unregisters the SW, and reloads the page automatically
**And** the second page load has no `(ServiceWorker)` source in any Network request
**And** the user lands on the main app without seeing any module-load errors.

### Requirement: Regression note must exist

`tasks/lessons.md` SHALL contain the rule *"never ship a service worker without a kill-switch plan"* with a reference to commit `02423dd` (the one that introduced the buggy SW) so future engineers searching for SW context find the history.

#### Scenario: lessons file has the rule

**Given** `tasks/lessons.md`
**When** `grep -n "kill-switch" tasks/lessons.md` runs
**Then** it returns at least one match and the matched line references commit `02423dd` or the path `phoenix/priv/static/sw.js`.
