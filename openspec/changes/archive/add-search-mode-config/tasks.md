# Tasks — Add Search Mode Config

## 1. Schema and migration
- [x] 1.1 Create migration `phoenix/priv/repo/migrations/<timestamp>_create_search_mode_configs.exs` creating `search_mode_configs(id, mode, max_iterations, budget_ms, inserted_at, updated_at)` with a unique index on `mode`.
- [x] 1.2 In the migration `up/0` (post-create), insert the three default rows: `speed` (2, 7000), `balanced` (6, 16000), `quality` (25, 35000). In `down/0`, drop the table.
- [x] 1.3 Create Ecto schema `phoenix/lib/perplexica/search/mode_config/schema.ex` (module `Perplexica.Search.ModeConfig.Schema`) mapping the table.

**Verification**: `mix ecto.migrate` creates the table; `mix ecto.rollback` drops it cleanly; `psql` shows the 3 seed rows after migration.

## 2. Context module and cache
- [x] 2.1 Create `phoenix/lib/perplexica/search/mode_config.ex` (module `Perplexica.Search.ModeConfig`) with `get/1`, `get_all/0`, `update/2`, `reset/1`, `warm_cache/0`, and a private `@cache_key :search_mode_config_cache` in `:persistent_term`.
- [x] 2.2 `warm_cache/0` reads all three rows via `Repo.all/1`, builds a map keyed by mode, and stores it in `:persistent_term`. If `Repo.all/1` raises (DB unreachable), catch and store the hardcoded defaults, logging a warning.
- [x] 2.3 `update/2` runs validation (mode ∈ {speed,balanced,quality}, max_iterations ∈ [1,50], budget_ms ∈ [1000,120000]), upserts the row via `Repo.insert_or_update/2`, then calls `warm_cache/0` to refresh, then returns `{:ok, row}` or `{:error, reason}`.
- [x] 2.4 `reset/1` calls `update/2` with the seed defaults for the given mode.
- [x] 2.5 Register `warm_cache/0` in `Perplexica.Application.start/2` as part of the supervision tree init (run once after the Repo starts).
- [x] 2.6 ExUnit test `test/perplexica/search/mode_config_test.exs` covering: warm_cache reads 3 rows, update validates bounds, update refreshes cache, reset restores defaults, warm_cache falls back to defaults when Repo errors (use `Mox` or stub `Repo.all/1`).

**Verification**: `mix test test/perplexica/search/mode_config_test.exs` green. `iex -S mix` + `Perplexica.Search.ModeConfig.get_all()` returns the expected map.

## 3. Researcher integration
- [x] 3.1 In `phoenix/lib/perplexica/search/researcher.ex`, **remove** the `@max_iterations` module attribute.
- [x] 3.2 In `research/3`, replace `@max_iterations[mode]` with `Perplexica.Search.ModeConfig.get(mode).max_iterations`. Fall back to `6` if `get/1` raises (defensive — should never happen post-warm_cache).
- [x] 3.3 Add `budget_ms` and `started_at` to the `initial_state` map. `started_at = System.monotonic_time(:millisecond)`; `budget_ms = ModeConfig.get(mode).budget_ms`.
- [x] 3.4 Add a new `run_loop/1` clause that checks the budget BEFORE calling the LLM: if `elapsed_ms(state) >= state.budget_ms`, log and return `{:ok, state.all_results}`. Place the clause after the iteration-cap clause but before the "do an iteration" clause.
- [x] 3.5 Add a private helper `elapsed_ms(state)` that returns `System.monotonic_time(:millisecond) - state.started_at`.
- [x] 3.6 Update the researcher's moduledoc to describe the soft budget semantics.
- [x] 3.7 Extend the existing researcher tests (or add a new file) to cover: iteration cap is honored at runtime from a mocked `ModeConfig.get/1`, budget exit takes effect when the mock system-time exceeds budget, logs include the expected message.

**Verification**: `mix test` green across the `phoenix/test/perplexica/search/` directory. `mix compile --warnings-as-errors` clean.

## 4. GraphQL surface
- [x] 4.1 Create `phoenix/lib/perplexica_web/schema/mode_config_types.ex` defining the `mode_config` object type with fields `mode`, `max_iterations`, `budget_ms` (snake_case → camelCase handled by Absinthe's default).
- [x] 4.2 Import the types module in `schema.ex`. Add `field :mode_configs, list_of(:mode_config), resolve: &ModeConfigResolver.list/3` to `query`. Add `updateModeConfig` and `resetModeConfig` mutations with args `mode`, `max_iterations`, `budget_ms` (reset only takes `mode`).
- [x] 4.3 Create `phoenix/lib/perplexica_web/resolvers/mode_config_resolver.ex` with `list/3`, `update/3`, `reset/3`. `list/3` calls `ModeConfig.get_all/0` and returns a sorted list (speed, balanced, quality); `update/3` calls `ModeConfig.update/2` and maps validation errors to Absinthe errors with `fields` in `extensions`.
- [x] 4.4 ExUnit test `test/perplexica_web/resolvers/mode_config_resolver_test.exs`: list returns 3 items, update persists and refreshes, validation errors have expected shape, reset works.

**Verification**: `mix test test/perplexica_web/resolvers/mode_config_resolver_test.exs` green. `mix phx.server` + GraphiQL at `/api/graphiql` shows the new types and fields in the schema browser.

## 5. Frontend Apollo hooks
- [x] 5.1 Create `redwood/web/src/lib/modeConfig.ts` defining `MODE_CONFIGS_QUERY`, `UPDATE_MODE_CONFIG_MUTATION`, `RESET_MODE_CONFIG_MUTATION`, and React hooks `useModeConfigs()`, `useUpdateModeConfig()`, `useResetModeConfig()`. Each mutation hook includes an optimistic response and refetches `MODE_CONFIGS_QUERY` on completion.
- [x] 5.2 TypeScript types: `type ModeConfig = { mode: 'speed'|'balanced'|'quality'; maxIterations: number; budgetMs: number }`.

**Verification**: `npx tsc --noEmit` clean on the new file.

## 6. Frontend settings card
- [x] 6.1 Create `redwood/web/src/pages/SettingsPage/ModeConfigCard.tsx`. Renders a card with a title "Search Modes" and one `<ModeConfigRow>` per mode.
- [x] 6.2 `ModeConfigRow` component takes `mode`, `config`, `onSave`, `onReset` props. Renders: mode name (heading), description (from a local constant mirroring `MessageInput.tsx` hints), two number inputs (`Iterations` step=1, `Budget` step=0.5 displayed as seconds), a reset icon button. Uses debounced save (500 ms `useEffect` with cleanup) after the last keystroke; tracks success/error transiently via local state.
- [x] 6.3 Import `ModeConfigCard` into `SettingsPage.tsx` (from `add-user-settings-page`) and render it below the Search defaults card.
- [x] 6.4 Loading state: while `useModeConfigs` is loading, render three skeleton rows with the card chrome; error state: render an inline error message with a "Retry" button.

**Verification**: Dev server — navigate to `/settings` while signed in; see the card populated with 3 rows; change a value, see the debounced save; enter an out-of-range value, see the inline error.

## 7. End-to-end verification
- [x] 7.1 Playwright e2e: `e2e/mode-config.spec.ts` — navigate to `/settings`, set `quality` iterations to `3` and budget to `5`, trigger a search in quality mode, assert the progress event stream caps at 3 iterations and finishes within ~5 seconds + one iteration-worth of slack.
- [x] 7.2 Manual: `iex -S mix` after deploy — `Perplexica.Search.ModeConfig.get_all()` matches what the settings UI shows; edit from UI; re-run in iex; confirm the change.
- [x] 7.3 Manual: verify the audit-logs migration (already in the tree) does not interfere with the new table — they live in separate tables, no FK relationship.

**Verification**: Playwright suite green; manual checks pass; `mix precommit` (format + warnings-as-errors + test) clean.

## 8. Ship checklist
- [x] 8.1 Run the migration on the Fly instance: `fly ssh console -C "/app/bin/perplexica eval 'Perplexica.Release.migrate'"` (or the equivalent release task).
- [x] 8.2 Deploy the app; watch logs for the `warm_cache` log line; verify `GET /api/graphql` + `{ modeConfigs { mode maxIterations budgetMs } }` returns the 3 rows (after signing in).
- [x] 8.3 Tune `quality` mode from the settings UI; run a real search; confirm the loop honors the new caps.
- [x] 8.4 Mark this change ready for archive after the end-to-end verification from a production browser session.
