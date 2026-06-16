# Add Search Mode Config

## Why

Mode behavior is a hardcoded module attribute in `phoenix/lib/perplexica/search/researcher.ex:27-31`:

```elixir
@max_iterations %{"speed" => 2, "balanced" => 6, "quality" => 25}
```

Every tweak to those numbers — and there is no knob at all for time budget, only iteration count — requires an Elixir edit, a recompile, and a redeploy. The owner wants to tune mode behavior from the UI without shipping code, especially to experiment with shorter/longer research windows for quality mode. The frontend already hints at a "~35s budget" for quality mode (`MessageInput.tsx:19`), but nothing enforces it.

This change promotes mode behavior to a first-class, owner-editable capability: stored in Postgres, read at request time, edited from the settings page (built in `add-user-settings-page`), gated by the auth plug (built in `add-github-auth-gate`).

## What Changes

- New Ecto schema `Perplexica.Search.ModeConfig` with fields `mode`, `max_iterations`, `budget_ms`, `updated_at`, plus a unique index on `mode`.
- New migration `create_search_mode_configs` that creates the table and seeds three rows — `speed` (max_iterations=2, budget_ms=7000), `balanced` (6, 16000), `quality` (25, 35000) — matching the current hardcoded defaults and frontend hints.
- New context module `Perplexica.Search.ModeConfig` (hiding the Ecto schema detail) exposing `get/1`, `get_all/0`, `update/2`, `reset/1`, with an in-process cache (`Agent` or `:persistent_term`) to avoid a DB roundtrip on every search.
- `Perplexica.Search.Researcher.research/3` reads `max_iterations` and `budget_ms` from the context instead of the module attribute. Each iteration of the research loop checks `System.monotonic_time(:millisecond)` against a start time; when `elapsed_ms > budget_ms` the loop exits early with whatever results were collected (soft budget — the current iteration finishes, no interrupt).
- The module attribute `@max_iterations` is **REMOVED**.
- New GraphQL types and fields on `PerplexicaWeb.Schema`:
  - `type ModeConfig { mode: String!, maxIterations: Int!, budgetMs: Int! }`
  - `query modeConfigs: [ModeConfig!]!`
  - `mutation updateModeConfig(mode: String!, maxIterations: Int!, budgetMs: Int!): ModeConfig!`
  - `mutation resetModeConfig(mode: String!): ModeConfig!`
- New resolver `PerplexicaWeb.Resolvers.ModeConfigResolver` with validation: `mode ∈ {speed, balanced, quality}`, `max_iterations ∈ [1, 50]`, `budget_ms ∈ [1000, 120000]`. Resolver trusts the plug-level auth gate — no additional ownership check.
- `SettingsPage` (from `add-user-settings-page`) gains a new "Search modes" card with three rows, one per mode. Each row: mode name, a number input for `max_iterations` (step 1), a number input for `budget_ms` displayed as seconds with 1 decimal place, a "Reset" text button. Changes are debounced-saved (500ms) via the mutation; successful saves show a transient checkmark; failed validation shows an inline error under the offending field.
- **BREAKING** (internal): the `@max_iterations` module attribute is gone. Any code that imported or relied on it must migrate to `ModeConfig.get/1`. (Grep result shows zero external consumers today — only the researcher itself.)

## Capabilities

### New Capabilities
- `search-mode-config`: database-backed, editable per-mode configuration (max iterations + soft time budget), GraphQL read/write surface with validation, a settings-page card for editing, and researcher integration that respects both knobs with a clean early-exit path.

### Modified Capabilities
None — this repo has no existing search-mode or researcher capability spec.

## Impact

- **Dependencies**: this change depends on `add-github-auth-gate` (for the auth plug that protects the mutations) and `add-user-settings-page` (for the UI card that uses them).
- **Affected code**:
  - `phoenix/priv/repo/migrations/<timestamp>_create_search_mode_configs.exs` — new
  - `phoenix/lib/perplexica/search/mode_config.ex` — new schema + context
  - `phoenix/lib/perplexica/search/researcher.ex` — replace `@max_iterations` with `ModeConfig.get/1`, add budget loop-exit
  - `phoenix/lib/perplexica_web/schema.ex` — add query/mutations, import ModeConfig types
  - `phoenix/lib/perplexica_web/schema/mode_config_types.ex` — new types module
  - `phoenix/lib/perplexica_web/resolvers/mode_config_resolver.ex` — new
  - `redwood/web/src/pages/SettingsPage/SettingsPage.tsx` — add Search Modes card
  - `redwood/web/src/pages/SettingsPage/ModeConfigCard.tsx` — new extracted component
  - `redwood/web/src/lib/modeConfig.ts` — new Apollo hooks (`useModeConfigs`, `useUpdateModeConfig`, `useResetModeConfig`)
- **Data migration**: one new table, 3 seed rows. Zero existing data to migrate.
- **Reversibility**: drop the table + restore `@max_iterations` to revert. All other changes are additive (new query/mutation/card).
- **Performance**: module-attribute read was O(1). The in-process cache keeps the new read at effectively O(1) too; cache busts on writes. Budget check adds one `System.monotonic_time` call per loop iteration — negligible.
