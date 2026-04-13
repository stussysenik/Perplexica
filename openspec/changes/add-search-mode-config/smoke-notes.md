# Smoke Notes — add-search-mode-config

## Local smoke

1. Run the migration:
   ```
   cd phoenix && mix ecto.migrate
   ```
2. Verify seeds exist:
   ```
   mix run -e "IO.inspect(Perplexica.Search.ModeConfig.get_all())"
   # → %{"speed" => %{max_iterations: 2, budget_ms: 7000}, "balanced" => ..., "quality" => ...}
   ```
3. Start the stack (`mix phx.server` + `pnpm -C redwood/web run dev`), sign in,
   navigate to `/settings`. Confirm the "Search Modes" card renders with the
   three rows at their seeded values.
4. Bump `quality` iterations to 3 and budget to 5 seconds. Save the change
   (watch for the transient checkmark after the 500 ms debounce).
5. Verify via iex:
   ```
   iex(1)> Perplexica.Search.ModeConfig.get("quality")
   %{max_iterations: 3, budget_ms: 5000}
   ```
6. Start a quality-mode search and confirm the research loop exits early —
   either after the 3-iteration cap or the 5-second budget, whichever fires
   first.
7. Click the "Reset" icon on the quality row. Confirm values return to 25 /
   35000 in the UI AND in iex.

## Post-deploy (Fly)

1. Run the migration via a release task:
   ```
   fly ssh console -C "/app/bin/perplexica eval 'Perplexica.Release.migrate'" \
     -a perplexica-search
   ```
2. Watch deploy logs for the `warm_cache` success line (or the fallback warning
   if the DB happened to be unreachable at boot).
3. Sign in via the production browser, tune a mode from `/settings`, run a
   search, confirm the new cap takes effect.
4. Mark this change ready for archive.

## Regression checks

- `audit_logs` table from the prior migration is untouched — no FK crosstalk.
- The REMOVED `@max_iterations` module attribute should no longer appear in
  `phoenix/lib/perplexica/search/researcher.ex`. Grep confirms the only
  references now go through `ModeConfig.get/1`.
