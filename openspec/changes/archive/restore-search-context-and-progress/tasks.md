# Tasks — Restore Search Context and Progress

Work items are grouped by slice. Each slice is independently shippable and has its own acceptance criteria.

## Slice 1 — Visual polish + inline follow-ups (pure frontend)

- [x] Change `redwood/web/src/App.tsx` `titleTemplate` from `%PageTitle | FYOA` to the literal `Find Your Own Answer`.
- [x] Remove `document.title` overrides from `redwood/web/src/pages/DiscoverPage/DiscoverPage.tsx`.
- [x] Update `redwood/web/src/index.html` initial `<title>` to `Find Your Own Answer`.
- [x] Move accent bar from `border-l-[4px]` to `border-r-[4px]` on chat rows in `LibraryPage.tsx`.
- [x] Add inline `MessageInput` to the detail column of `LibraryPage.tsx` wired to `startSearch` with `chatId` + `history`.
- [x] **Acceptance**: every page shows `Find Your Own Answer` in the browser tab; Library rows have a right-edge blue accent; opening a chat reveals a follow-up composer that stays on `/library`.

## Slice 2 — Chat-level lifecycle schema + resolvers

- [x] Write migration `phoenix/priv/repo/migrations/20260413120000_add_chat_lifecycle_fields.exs` adding `bookmarked_at`, `archived_at`, `trashed_at` as nullable `:utc_datetime_usec` columns with partial indexes.
- [x] Extend `phoenix/lib/perplexica/chat.ex` with the three fields and helper predicates.
- [x] Create `phoenix/lib/perplexica/library.ex` context module with `toggle_bookmark/1`, `archive/1`, `restore/1`, `trash/1`, `purge/1`, `list_bookmarked/0`, `list_archived/0`, `list_trashed/0`, `purges_at/1`.
- [x] Create `phoenix/lib/perplexica/library/purger.ex` GenServer with daily tick + boot tick + crash rescue.
- [x] Wire Purger into `phoenix/lib/perplexica/application.ex` supervision tree after `Perplexica.Repo`.
- [x] Create `phoenix/lib/perplexica_web/resolvers/library_resolver.ex` exposing `bookmarked_chats`, `archived_chats`, `trashed_chats`, `toggle_chat_bookmark`, `archive_chat`, `restore_chat`, `trash_chat`, `purge_chat`.
- [x] Add `:chat` type fields (`bookmarked_at`, `archived_at`, `trashed_at`, `purges_at`) and Library queries/mutations to `phoenix/lib/perplexica_web/schema.ex` and `phoenix/lib/perplexica_web/schema/chat_types.ex`.
- [x] **Acceptance**: `mix compile --warnings-as-errors` passes; GraphQL schema introspection shows the new queries and mutations; existing `chats` query still filters out archived + trashed rows.

## Slice 3 — Library four-tab switcher

- [x] Refactor `LibraryPage.tsx` from two toggles (chats / bookmarks) to four tabs (Chats / Bookmarks / Archive / Trash).
- [x] Per-tab row action bar: Chats = Bookmark + Archive + Trash; Bookmarks = Unbookmark + Archive + Trash; Archive = Restore + Trash; Trash = Restore + Purge + "purges in Nd" badge.
- [x] Wire each tab to its own GraphQL query via `phoenixGql` with module-level refetch listeners for cross-component cache invalidation.
- [x] **Acceptance**: switching tabs is instant with no re-fetch flicker; every lifecycle mutation updates the correct tab and removes the row from the previous one.

## Slice 4 — Search instrumentation (Phoenix)

- [x] Extend `phoenix/lib/perplexica/search/session.ex` with `with_stage/2` wrapper that sets `Process.put(:current_step, name)` + `:step_started_at_ms` before the inner fun and restores on exit.
- [x] Wrap every external call (Brave / Exa / NIM / GLM / SearXNG backends, Classifier, Researcher, Registry.chat_completion, reader_fetch) in `with_stage/2`.
- [x] Add `emitted_at_ms` to every published SearchEvent root via `System.system_time(:millisecond)`.
- [x] Change the `:error` publish shape from `%{type: "error", data: <str>}` to `%{type: "error", data: <str>, step: <str|nil>, elapsed_ms: <int|nil>}`.
- [x] Add `emitted_at_ms`, `step`, `elapsed_ms` nullable fields to `:search_event` in `phoenix/lib/perplexica_web/schema/search_types.ex`.
- [x] **Acceptance**: a query that hits Brave and NIM publishes `step_started` + `step_finished` events for each external call; a deliberately failing NIM call publishes an error event with `step: "nim_chat_completion"` and a non-nil `elapsed_ms`.

## Slice 5 — Search progress UI (frontend)

- [x] Extend `useSearch.ts` `Message` with `currentStep`, `currentStepElapsedMs`, `failingStep`, `failingElapsedMs`, `subStepArrivals` fields.
- [x] Handle new fields in `phoenix-ws.ts` `SearchEvent` interface.
- [x] `SearchProgress.tsx` — render "Waiting on `<step>` · `<X.Xs>`" below creative ticker when a step is running and no peek text is available; update every 100ms.
- [x] `SearchProgress.tsx` — on `phase === 'error'`, render red "Failed in `<step>` after `<X.Xs>`" card with collapsible raw message.
- [x] `MessageBox.tsx` — pass new fields to SearchProgress; render failure inline when `status === 'error'`.
- [ ] (Deferred) StepTimeline drawer component — the optional "steps" toggle for a full timeline view. Non-blocking for the first ship.
- [x] **Acceptance**: during a slow search, the UI shows the currently-running step name and its live elapsed time; on failure, the UI attributes the failure to the exact step.

## Slice 6 — Cleanup + regression docs

- [ ] (Deferred) Migrate existing message-level bookmarks into chat-level `bookmarked_at`. Non-blocking: the old `bookmarks` query still works.
- [x] Append a rule to `tasks/lessons.md` — "every external call in the search pipeline must be wrapped in `with_stage/2` so failures carry their step name".
- [x] **Acceptance**: `grep -n "with_stage" tasks/lessons.md` returns a match.

## Slice 7 — OpenSpec validation

- [x] Write spec delta at `specs/library-and-search-ux/spec.md` with all capabilities above.
- [x] Write this tasks.md file.
- [ ] `openspec validate restore-search-context-and-progress --strict` — acceptance: exits 0.

## Slice 8 — Ship

- [ ] Stage Slices 1–6 and commit in logical groups (frontend polish, backend schema, backend purger, frontend Library refactor, backend instrumentation, frontend progress, docs).
- [ ] Push to `main` → Railway auto-deploys → verify production `/library`, `/discover`, and a live search end-to-end.
- [ ] After production verification, run `/openspec:archive restore-search-context-and-progress`.
