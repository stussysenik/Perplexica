# Restore Search Context and Progress

## Why

After getting past the stale-service-worker bug, the user surfaced four gaps that together prevent the app from being used as a real research tool:

1. **Progress is opaque.** `SearchProgress` already renders elapsed time and a mode-budget ETA (`components/Chat/SearchProgress.tsx:131-144`), but the pipeline never says *which* external dependency is currently blocking, for how long, or which step a failure happened in. Errors collapse to a generic `{:error, message}` (`phoenix/lib/perplexica/search/session.ex:93`) — the user can't tell if Brave timed out at 14s, if NIM refused the prompt, or if the reader choked on a paywall. Long runs "just go through the same things" because the UI cycles the creative ticker lines while the real pipeline is silently stuck on one step.
2. **Conversations don't thread.** Clicking a library entry shows the messages — actually, the thread renderer is already there (`pages/LibraryPage/LibraryPage.tsx:172-186`) — but there is **no compose box**, so the user cannot add a follow-up to an existing conversation. The backend *already supports* follow-ups: `startSearch` accepts `history: [HistoryEntry!]` (`lib/useSearch.ts:187-203`, `phoenix/lib/perplexica_web/schema.ex:82-83`) and `Chat` has `has_many :messages` (`phoenix/lib/perplexica/chat.ex:14-23`). Only the UI wiring is missing.
3. **Library is read-only from the list.** List rows only render Delete (`pages/LibraryPage/LibraryPage.tsx:260-265`). You have to open the detail view to bookmark. There's no archive. There's no trash with retention. Accidentally deleting a chat is irreversible today.
4. **Visual polish:** the blue accent bar lives on the left side of each library row (`border-l-[4px] border-l-[var(--border-accent)]`), and every browser tab title is per-page (`Library — FYOA`, `Discover — FYOA`). The user wants the accent on the **right** edge and every tab to say `Find Your Own Answer`.

## What Changes

### Slice 1 — Visual polish + inline follow-ups (pure frontend)

- **Tab titles** — drop every per-page `document.title` assignment and change `App.tsx`'s `titleTemplate` to the literal string `Find Your Own Answer`. Update `index.html`'s pre-hydration `<title>` to match.
- **Library list visual** — move the accent bar from `border-l-[4px] border-l-…` to `border-r-[4px] border-r-…` on chat rows (`pages/LibraryPage/LibraryPage.tsx:250-253`).
- **Library list actions** — add a Bookmark icon button next to Delete on each chat row. In Slice 1 it toggles a chat-level bookmark via a new `toggleChatBookmark` mutation (landed in Slice 2); until Slice 2 ships, the button is wired to the existing `toggleBookmark` mutation against the chat's *first* message as a temporary shim.
- **Library detail — inline follow-ups** — in the `if (selectedChat)` branch of `LibraryPage`, add a `MessageInput` pinned to the bottom of the detail column. On submit: create a new message row with `status: 'answering'`, call `startSearch` with the existing `chatId` and a `history` array built from every completed prior message in this chat, and let the existing polling effect (`pages/LibraryPage/LibraryPage.tsx:103-125`) pick up the in-flight state. No navigation, no "weird travelling" — the user stays in Library.

### Slice 2 — Chat-level bookmark / archive / trash (Phoenix schema + resolvers)

- **Migration** `YYYYMMDDHHMMSS_add_chat_lifecycle_fields.exs`: add `bookmarked_at :utc_datetime_usec`, `archived_at :utc_datetime_usec`, `trashed_at :utc_datetime_usec` nullable columns to `chats`. Add indexes on each so list filters stay cheap.
- **Chat schema** (`phoenix/lib/perplexica/chat.ex`) — add the three fields. Add helper functions `bookmarked?/1`, `archived?/1`, `trashed?/1`. Default `chats` query excludes archived + trashed rows (soft-delete semantics).
- **Resolvers** (`phoenix/lib/perplexica_web/resolvers/chat_resolver.ex` or new `library_resolver.ex`):
  - `toggle_chat_bookmark/3` — flip `bookmarked_at` between `nil` and `DateTime.utc_now/0`.
  - `archive_chat/3` — set `archived_at = now`.
  - `restore_chat/3` — clear `archived_at` **and** `trashed_at`.
  - `trash_chat/3` — set `trashed_at = now`. This is the soft-delete path. The old `delete_chat` mutation is kept but the UI no longer exposes it; it becomes `purge_chat` behind a confirm dialog for users who want a hard delete.
  - `purge_chat/3` — hard delete (owner confirmation required on the frontend).
- **Queries**:
  - `chats` — existing, filters out archived + trashed.
  - `bookmarked_chats` — rows where `bookmarked_at IS NOT NULL`, ordered by `bookmarked_at DESC`.
  - `archived_chats` — rows where `archived_at IS NOT NULL AND trashed_at IS NULL`, ordered by `archived_at DESC`.
  - `trashed_chats` — rows where `trashed_at IS NOT NULL`, with a computed `purges_at = trashed_at + 30 days` field so the UI can show "purges in 12 days".
- **Background purge** — a `Perplexica.Library.Purger` `Task.Supervisor` child that runs once per day, deleting rows older than 30 days since `trashed_at`. On boot it also runs once so a restart doesn't skip the window. Wire into `Perplexica.Application.start/2` after the repo.
- **GraphQL schema** — add the new mutations + queries + fields to `phoenix/lib/perplexica_web/schema.ex`, flagged with `@desc` strings.

### Slice 3 — Library tabs: Chats / Bookmarks / Archive / Trash

- LibraryPage grows a four-tab switcher (replacing the current Chats / Bookmarks toggle). Each tab renders a filtered list using the new resolvers.
- Chat row action bar per tab:
  - **Chats**: Bookmark (toggle), Archive, Trash
  - **Bookmarks**: Unbookmark, Archive, Trash
  - **Archive**: Restore, Trash
  - **Trash**: Restore, Purge (hard delete, confirm dialog) + "purges in Nd" badge
- Detail view (opening a library entry) keeps the same thread + compose UX across all tabs.
- The existing message-level Bookmarks tab is merged into the chat-level Bookmarks tab as a secondary "Saved answers" section below the chat list.

### Slice 4 — Search instrumentation (Phoenix)

- **`Perplexica.Search.Step`** — a thin wrapper around an external call that:
  - Emits `{:step_started, name, started_at_ms}` before the call runs.
  - Emits `{:step_finished, name, started_at_ms, ended_at_ms, :ok | {:error, reason}}` after.
  - On crash, publishes `{:error, %{step: name, elapsed_ms: …, message: …}}` (shape change to carry the failing step).
- Wrap every external call in `Researcher.research/3`, `Classifier.classify/3`, `Registry.chat_completion/2`, `reader_fetch`, and the individual search backends (Brave, Exa, NIM, GLM, SearXNG) with `Step.run("brave_search", fn -> … end)`.
- Every Absinthe event root includes `emitted_at_ms: System.system_time(:millisecond)` so the frontend can plot a live timeline.
- The top-level `publish/2` for `{:error, …}` switches from `%{type: "error", data: to_string(message)}` to `%{type: "error", data: message_str, step: step_name, elapsed_ms: …}` — frontend displays the failing step.
- GraphQL `SearchEvent` object type gains `emittedAtMs`, `step`, `elapsedMs` fields (nullable).

### Slice 5 — Search progress UI (frontend)

- `useSearch.ts` — extend `Message` with `steps: Step[]` (each `{name, startedAt, endedAt?, status: 'running' | 'ok' | 'error'}`) and `failingStep?: string`. Handle `step_started` / `step_finished` events.
- `SearchProgress.tsx`:
  - Add a "Waiting on `<step>` for `<Xs>`" line below the creative ticker when any step is `running` (and the peek text is absent).
  - On `phase === 'error'`, show a red `✕ Failed in <step> after <X.Xs>` with the raw message underneath (collapsible).
  - Add a small "steps" toggle button that opens a timeline drawer — every step rendered as a row with its name, start offset, duration, and status icon. This is the "real SSE-like" visibility the user asked for.
- `MessageBox.tsx` — render the failure state inline when `status === 'error'` with the step attribution.

### Slice 6 — Cleanup

- Remove the deprecated message-level `bookmarks` query now that `bookmarked_chats` is the canonical list (migrate existing records by setting `Chat.bookmarked_at` to the earliest bookmark time for any message in that chat, then dropping `bookmarks` from the schema in a follow-up change — NOT in this one).
- Update `tasks/lessons.md` with the rule "every external call in the search pipeline must be wrapped in `Perplexica.Search.Step.run/2` so failures carry their step name".

## Capabilities

### New Capabilities

- **library-and-search-ux** — chat-level bookmarks, archive, 30-day trash, inline follow-ups in Library detail, real-time per-step progress, failure attribution, tab title normalization.

### Modified Capabilities

- **auth-github-gate** — unchanged.
- Existing message-level bookmarks stay functional in Slice 2 but become a subordinate list inside the new Bookmarks tab in Slice 3.

## Impact

- **Affected code (Slice 1 only, the one that lands first)**:
  - `redwood/web/src/index.html`
  - `redwood/web/src/App.tsx`
  - `redwood/web/src/pages/DiscoverPage/DiscoverPage.tsx`
  - `redwood/web/src/pages/LibraryPage/LibraryPage.tsx`
- **Affected code (Slice 2)**:
  - `phoenix/priv/repo/migrations/<ts>_add_chat_lifecycle_fields.exs` (NEW)
  - `phoenix/lib/perplexica/chat.ex`
  - `phoenix/lib/perplexica/library.ex` (NEW — context module for lifecycle ops)
  - `phoenix/lib/perplexica/library/purger.ex` (NEW)
  - `phoenix/lib/perplexica/application.ex`
  - `phoenix/lib/perplexica_web/resolvers/library_resolver.ex` (NEW)
  - `phoenix/lib/perplexica_web/schema.ex`
- **Affected code (Slice 3)**: `redwood/web/src/pages/LibraryPage/LibraryPage.tsx` — tab switcher + row action bar per tab.
- **Affected code (Slice 4)**:
  - `phoenix/lib/perplexica/search/step.ex` (NEW)
  - `phoenix/lib/perplexica/search/session.ex`
  - `phoenix/lib/perplexica/search/researcher.ex`, `classifier.ex`, plus the individual backend modules under `phoenix/lib/perplexica/search/backends/`
  - `phoenix/lib/perplexica/models/registry.ex`
  - `phoenix/lib/perplexica_web/schema.ex` — SearchEvent object type
- **Affected code (Slice 5)**:
  - `redwood/web/src/lib/useSearch.ts`
  - `redwood/web/src/lib/phoenix-ws.ts`
  - `redwood/web/src/components/Chat/SearchProgress.tsx`
  - `redwood/web/src/components/Chat/MessageBox.tsx`
  - `redwood/web/src/components/Chat/StepTimeline.tsx` (NEW)
- **Dependencies**: none new. Purger is a plain supervised Task, no oban/quantum.
- **Reversibility**: every slice is its own commit. Slice 1 is pure CSS/JSX. Slice 2's migration is trivially rollback-safe (three nullable columns, no backfill). Slice 4 is additive — old clients without `emitted_at_ms` keep working because the field is optional.
- **Risk**: medium. Slice 4 touches every search backend; we need a smoke test at `./dev` that runs at least one query in each mode after landing. Slice 2's Purger must be idempotent so a restart doesn't double-delete.
