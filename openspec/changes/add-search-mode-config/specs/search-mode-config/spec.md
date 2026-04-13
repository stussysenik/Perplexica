# search-mode-config Spec Delta

## ADDED Requirements

### Requirement: Persistent mode configuration

The system SHALL persist one configuration row per search mode in Postgres with fields `mode`, `max_iterations`, `budget_ms`, and `updated_at`. The table SHALL be seeded on first boot with the current defaults — `speed` (2, 7000), `balanced` (6, 16000), `quality` (25, 35000).

#### Scenario: Fresh migration seeds defaults
- **WHEN** the `create_search_mode_configs` migration runs against an empty database and `Perplexica.Search.ModeConfig.warm_cache/0` runs on application boot
- **THEN** the table contains exactly three rows — one per mode — with the seed values
- **AND** `ModeConfig.get_all/0` returns `%{"speed" => ..., "balanced" => ..., "quality" => ...}`

#### Scenario: Boot with populated table preserves values
- **WHEN** the table already contains rows with non-default values
- **AND** the application boots
- **THEN** `warm_cache/0` reads those non-default values and the cache reflects them
- **AND** the seed defaults are NOT re-applied

### Requirement: In-process cache

The system SHALL cache the current configuration in `:persistent_term` and read from the cache on every research loop invocation rather than hitting Postgres. The cache SHALL be refreshed on application boot and after every successful write.

#### Scenario: Cache warm on boot
- **WHEN** `Perplexica.Application.start/2` runs during boot
- **THEN** it calls `Perplexica.Search.ModeConfig.warm_cache/0` exactly once
- **AND** a subsequent `ModeConfig.get/1` call returns without opening a DB transaction

#### Scenario: Cache refresh on write
- **WHEN** `ModeConfig.update/2` successfully upserts a row
- **THEN** the function reads all rows from Postgres into a fresh map
- **AND** writes the map to `:persistent_term` before returning `{:ok, row}`

#### Scenario: Cache fallback on DB failure at boot
- **WHEN** `warm_cache/0` runs and Postgres is unreachable
- **THEN** the cache is populated with the hardcoded defaults (2/7000, 6/16000, 25/35000)
- **AND** a warning is logged stating the DB fallback happened

### Requirement: Researcher honors configured max iterations

`Perplexica.Search.Researcher.research/3` SHALL read `max_iterations` from `ModeConfig.get(mode)` instead of the removed `@max_iterations` module attribute.

#### Scenario: Balanced mode uses configured iteration cap
- **WHEN** a search runs in `balanced` mode and the cached `max_iterations` for balanced is `10`
- **THEN** the research loop runs at most `10` iterations before the pre-iteration cap check halts it

#### Scenario: Cap reduced mid-deployment
- **WHEN** an operator calls `updateModeConfig(mode: "quality", maxIterations: 5, budgetMs: 35000)` followed immediately by a `quality` search
- **THEN** the next search loop caps at 5 iterations (not 25)

### Requirement: Researcher honors soft time budget

The research loop SHALL maintain a `started_at` monotonic timestamp and, before each iteration, compare `System.monotonic_time(:millisecond) - started_at` against `budget_ms`. When the elapsed time exceeds the budget, the loop SHALL exit with whatever results have been collected so far (soft budget — the current iteration is never interrupted mid-call).

#### Scenario: Budget exceeded before next iteration
- **WHEN** a `quality` search is running, iteration 12 has just completed, and `elapsed_ms > budget_ms`
- **THEN** the loop does NOT start iteration 13
- **AND** returns `{:ok, state.all_results}` with the results accumulated through iteration 12
- **AND** logs `"[Researcher] Soft budget (<budget>ms) exceeded after <N> iterations"`

#### Scenario: Budget not exceeded
- **WHEN** a research iteration finishes and `elapsed_ms < budget_ms` and `iteration < max_iterations`
- **THEN** the next iteration starts normally

#### Scenario: Budget and iteration cap race
- **WHEN** both `elapsed_ms > budget_ms` and `iteration >= max_iterations`
- **THEN** either exit path is acceptable — the loop returns the accumulated results without starting another iteration

### Requirement: GraphQL query for mode configs

The system SHALL expose `query modeConfigs: [ModeConfig!]!` that returns the current cached configuration for all three modes.

#### Scenario: Read all mode configs
- **WHEN** an authenticated client queries `{ modeConfigs { mode maxIterations budgetMs } }`
- **THEN** the response is an array of exactly three items, one per mode
- **AND** each item reflects the current `:persistent_term` cache values
- **AND** the request does NOT open a Postgres transaction (reads from cache)

#### Scenario: Unauthenticated read rejected
- **WHEN** an unauthenticated client queries `modeConfigs`
- **THEN** the request is rejected by `PerplexicaWeb.Plugs.RequireOwner` with HTTP `401`
- **AND** the Absinthe resolver is never invoked

### Requirement: GraphQL mutations for mode config

The system SHALL expose `mutation updateModeConfig(mode, maxIterations, budgetMs)` and `mutation resetModeConfig(mode)`. Both SHALL be gated by the existing auth plug. Both SHALL validate arguments and return field-level errors when validation fails.

#### Scenario: Valid update
- **WHEN** an authenticated client mutates `updateModeConfig(mode: "balanced", maxIterations: 10, budgetMs: 20000)`
- **THEN** the response returns `{ mode: "balanced", maxIterations: 10, budgetMs: 20000 }`
- **AND** the Postgres row for `balanced` is updated
- **AND** the `:persistent_term` cache reflects the new values
- **AND** `ModeConfig.get("balanced").max_iterations` returns `10`

#### Scenario: Invalid mode rejected
- **WHEN** an authenticated client mutates `updateModeConfig(mode: "ultra", maxIterations: 10, budgetMs: 20000)`
- **THEN** the response includes a validation error with message referencing the `mode` field
- **AND** the database is not modified

#### Scenario: Iteration out of range
- **WHEN** an authenticated client mutates `updateModeConfig(mode: "speed", maxIterations: 100, budgetMs: 7000)`
- **THEN** the response includes a validation error referencing `maxIterations` with a message about the `[1, 50]` range
- **AND** the database is not modified

#### Scenario: Budget out of range
- **WHEN** an authenticated client mutates `updateModeConfig(mode: "speed", maxIterations: 2, budgetMs: 500)`
- **THEN** the response includes a validation error referencing `budgetMs` with a message about the `[1000, 120000]` range

#### Scenario: Reset restores defaults
- **WHEN** an authenticated client mutates `resetModeConfig(mode: "quality")`
- **THEN** the row for `quality` is updated back to `max_iterations: 25, budget_ms: 35000`
- **AND** the cache refreshes
- **AND** the mutation returns the reset row

### Requirement: Settings page mode-config card

The `SettingsPage` from `user-settings-preferences` SHALL render a "Search Modes" card with one row per mode, each row exposing a number input for `maxIterations`, a number input for `budgetMs` displayed as seconds with one decimal place, and a reset control. Edits SHALL be debounced-saved (500 ms).

#### Scenario: Initial render reads from GraphQL
- **WHEN** the user navigates to `/settings` while signed in
- **THEN** the Search Modes card issues `query modeConfigs` exactly once on mount
- **AND** renders three rows with the returned values

#### Scenario: Debounced save on edit
- **WHEN** the user changes the `quality` iterations input to `30`
- **AND** waits 500 ms without further edits
- **THEN** the frontend issues `updateModeConfig(mode: "quality", maxIterations: 30, budgetMs: <current>)`
- **AND** shows a brief success checkmark on the row upon mutation success

#### Scenario: Validation error surfaced inline
- **WHEN** the user enters a `budgetMs` value of `500` (below floor) and blurs the field
- **THEN** after the debounced mutation returns a validation error
- **THEN** the row shows an inline error message below the `budgetMs` input
- **AND** the cached value does NOT change

#### Scenario: Reset button
- **WHEN** the user clicks the reset control on the `speed` row
- **THEN** the frontend issues `resetModeConfig(mode: "speed")`
- **AND** the inputs update to the returned default values

## REMOVED Requirements

### Requirement: Hardcoded @max_iterations module attribute
**Reason**: Replaced by the `search_mode_configs` table and `ModeConfig` context. The module attribute forced a recompile for every tuning change and could not be edited at runtime.
**Migration**: Callers that read `Perplexica.Search.Researcher.@max_iterations` MUST call `Perplexica.Search.ModeConfig.get(mode).max_iterations` instead. A repo-wide grep shows zero external callers — the module attribute was only referenced inside `researcher.ex`.
