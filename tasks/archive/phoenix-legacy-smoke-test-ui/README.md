# Archived: Phoenix smoke-test SPA shell

**Archived:** 2026-04-13
**Original location:** `phoenix/priv/static/index.html`
**Replaced by:** `redwood/web/` (the real frontend, served on `:8910` in dev and built into `phoenix/priv/static/index.html` in prod via the Redwood build step)

## What this was

A single-file hand-written HTML/CSS/JS app — 693 lines — that talked directly to
`/api/graphql` and polled for search results. Header logo, "What do you want
to know?" welcome, Speed/Balanced/Quality mode pills, input at the bottom. No
auth splash, no settings page, no proper theming toggle — just the minimum
needed to prove the Phoenix GraphQL pipeline end-to-end.

## Why it existed

It was the first UI that ever hit the new Phoenix backend during the
RedwoodJS + Phoenix + Zig rewrite. Phoenix needed *something* to serve from
`priv/static/index.html` so the catch-all route
(`PerplexicaWeb.Router` → `PageController.index`) didn't 404 while the real
frontend was being built. It doubled as a smoke test: if this file could
mutate `startSearch`, poll `messages`, and render blocks, the backend was
healthy.

## Why we're retiring it

The Redwood frontend (`redwood/web/`) now covers every flow this file did —
and more:

- Auth splash that gates on `/auth/whoami`
- Settings page
- Light-default theme with a real toggle (commits `7aa5962`, `ab338a6`)
- Proper SPA routing, not a single-page scroll container
- Actual component system, not 693 lines of template literals

Keeping the legacy file on disk was actively harmful:

1. **It shadowed the real UI.** In local dev the Redwood app runs on `:8910`.
   Anyone who wandered to `:4000/` (including the GitHub OAuth callback, which
   does `redirect(to: "/")`) landed on this stale file and thought "the new
   UI isn't working." It wasn't broken — they were looking at the wrong app.
2. **It lied about the architecture.** It implied Phoenix still had a
   built-in UI. Phoenix is the API layer; the UI lives in Redwood.
3. **It outlived its usefulness.** The smoke tests it originally supported
   are now covered by the e2e specs added in commit `30612a3`.

## What changed alongside the archive

Same PR:

- `phoenix/priv/static/index.html` moved here.
- `phoenix/lib/perplexica_web.ex` — removed `"index.html"` from
  `static_paths/0` so `Plug.Static` no longer expects the file.
- `phoenix/lib/perplexica_web/controllers/page_controller.ex` — now checks a
  `:frontend_url` app config. In dev it redirects (301-ish, 302 actually)
  to the Redwood dev server on `:8910` preserving path and query string.
  In prod `:frontend_url` is unset, so it continues to `send_file` the
  Redwood *build output* at `priv/static/index.html` (which the Railway
  build pipeline writes during deploy).
- `phoenix/config/dev.exs` — sets
  `config :perplexica, :frontend_url, "http://localhost:8910"`.
- `phoenix/lib/perplexica_web/controllers/auth_controller.ex` — unchanged.
  It still does `redirect(to: "/")`, but now `/` is itself environment-aware
  via `PageController.index`, so the OAuth callback lands on the right
  origin in each environment without the callback knowing which one it's in.

## How to reproduce the legacy UI if you ever want it back

This file is preserved verbatim at `./index.html`. It is a self-contained
HTML document — no build step, no dependencies. Open it in a browser pointed
at a running Phoenix on the same origin and it will work the way it used to.

It is not meant to come back. If you find yourself wanting it back, the
*real* question is "why is the Redwood frontend failing me today?" — answer
that instead.
