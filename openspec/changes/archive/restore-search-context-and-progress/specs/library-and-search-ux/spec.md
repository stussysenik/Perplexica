# library-and-search-ux Spec Delta

## ADDED Requirements

### Requirement: Unified browser tab title

Every page in the Redwood SPA SHALL render the literal browser tab title `Find Your Own Answer`. Per-page `document.title` overrides are forbidden and `titleTemplate` SHALL be the plain string without `%PageTitle` interpolation.

#### Scenario: Tab title on Home page

- **WHEN** the user navigates to `/`
- **THEN** `document.title` equals `Find Your Own Answer`

#### Scenario: Tab title on Library page

- **WHEN** the user navigates to `/library`
- **THEN** `document.title` equals `Find Your Own Answer`
- **AND** no page-level `useEffect` writes to `document.title`

#### Scenario: Tab title on Discover page

- **WHEN** the user navigates to `/discover`
- **THEN** `document.title` equals `Find Your Own Answer`

### Requirement: Library row right-edge accent bar

Each chat row in the Library list SHALL display a 4px blue accent bar on the **right** edge of the row (not the left), using the `--border-accent` CSS custom property.

#### Scenario: Accent bar position

- **WHEN** the Library list renders a chat row
- **THEN** the row element has the Tailwind class `border-r-[4px]` and a right-side border colored by `var(--border-accent)`
- **AND** the row element does NOT have `border-l-[4px]` on the left edge

### Requirement: Chat-level lifecycle fields

The `Chat` schema SHALL gain three nullable `:utc_datetime_usec` fields — `bookmarked_at`, `archived_at`, and `trashed_at` — backed by partial indexes for efficient tab filtering. The fields are mutually orthogonal: a chat can be both bookmarked and archived, or both bookmarked and trashed.

#### Scenario: Migration is additive and reversible

- **WHEN** the `add_chat_lifecycle_fields` migration runs on a Railway deployment with existing rows
- **THEN** every existing chat has `bookmarked_at = nil`, `archived_at = nil`, `trashed_at = nil`
- **AND** no NOT NULL constraint is violated
- **AND** partial indexes exist on each field `WHERE <field> IS NOT NULL`

#### Scenario: Bookmark and archive coexist

- **WHEN** a chat has both `bookmarked_at` and `archived_at` set to non-nil
- **THEN** it appears in the Bookmarks tab AND in the Archive tab simultaneously

### Requirement: Library lifecycle mutations

The GraphQL schema SHALL expose `toggleChatBookmark`, `archiveChat`, `restoreChat`, `trashChat`, and `purgeChat` mutations. All lifecycle operations SHALL be idempotent: applying the same mutation twice is a no-op on the second call.

#### Scenario: Toggle bookmark twice

- **WHEN** the client calls `toggleChatBookmark(id: X)` on a chat with `bookmarked_at = nil`
- **THEN** the chat's `bookmarked_at` becomes the current UTC timestamp
- **WHEN** the client calls `toggleChatBookmark(id: X)` again
- **THEN** the chat's `bookmarked_at` returns to `nil`

#### Scenario: Archive already-archived chat

- **WHEN** the client calls `archiveChat(id: X)` on a chat that already has `archived_at` set
- **THEN** the mutation succeeds and `archived_at` remains unchanged (no error, no overwrite)

#### Scenario: Restore clears both archive and trash

- **WHEN** a chat has both `archived_at` and `trashed_at` set
- **AND** the client calls `restoreChat(id: X)`
- **THEN** both fields are set to `nil` in a single mutation

#### Scenario: Trash then purge

- **WHEN** the client calls `trashChat(id: X)` on a chat
- **THEN** `trashed_at` is set to the current UTC timestamp
- **WHEN** the client then calls `purgeChat(id: X)`
- **THEN** the row is hard-deleted from the database and the mutation returns `{ success: true }`

### Requirement: 30-day trash retention with background purge

Chats in the Trash tab SHALL be hard-deleted automatically 30 days after `trashed_at`. A supervised `Perplexica.Library.Purger` GenServer SHALL run the purge job once on boot and once every 24 hours thereafter, crash-safely.

#### Scenario: Purger runs on boot

- **WHEN** the Phoenix application starts
- **THEN** `Perplexica.Library.Purger` is started in the supervision tree after `Perplexica.Repo`
- **AND** it schedules its first purge tick immediately

#### Scenario: Expired trash is purged

- **WHEN** the purge tick runs
- **AND** a chat has `trashed_at` older than 30 days
- **THEN** the chat row is hard-deleted
- **AND** the deletion is logged with the chat ID

#### Scenario: Purger crash does not kill the supervisor

- **WHEN** the purge tick raises an unexpected error (e.g., DB connection drop)
- **THEN** the error is caught and logged
- **AND** the next tick runs on schedule
- **AND** the supervision tree remains healthy

### Requirement: Trash tab shows purges_at countdown

The `trashedChats` query SHALL return each row with a computed `purgesAt` field equal to `trashed_at + 30 days`, formatted as an ISO-8601 UTC timestamp string.

#### Scenario: Trashed chat with 12 days remaining

- **GIVEN** a chat was trashed 18 days ago
- **WHEN** the client queries `trashedChats`
- **THEN** the row's `purgesAt` is 12 days in the future
- **AND** the frontend renders a "purges in 12d" badge on the row

### Requirement: Four-tab Library switcher

The LibraryPage SHALL render four tabs — Chats, Bookmarks, Archive, Trash — each backed by an independent GraphQL query and local state. Switching tabs does not reset state in the other tabs.

#### Scenario: Tab contents are isolated

- **GIVEN** the user has loaded the Chats tab with 10 chats
- **WHEN** the user switches to the Bookmarks tab and back
- **THEN** the Chats tab still shows the same 10 chats without re-fetching

#### Scenario: Per-tab row actions

- **WHEN** the user is on the Chats tab
- **THEN** each row shows Bookmark, Archive, and Trash buttons
- **WHEN** the user is on the Trash tab
- **THEN** each row shows Restore and Purge buttons plus a "purges in Nd" badge

### Requirement: Inline follow-ups in Library detail

When the user opens a chat in the Library detail view, a `MessageInput` SHALL be pinned to the bottom of the detail column. Submitting a follow-up SHALL call `startSearch` with the existing `chatId` and a `history` array built from all prior completed messages in the chat, without navigating away from the Library page.

#### Scenario: Follow-up from detail view

- **GIVEN** the user has opened a chat with 3 prior completed messages
- **WHEN** the user types a follow-up and submits
- **THEN** `startSearch` is called with the same `chatId` and a 3-entry `history` array
- **AND** the UI remains on `/library` (no navigation)
- **AND** the new message row appears with `status: 'answering'` and is updated as events arrive

### Requirement: Per-step search pipeline instrumentation

Every external call in the search pipeline SHALL be wrapped in a `Perplexica.Search.Step.run/2` helper that emits `{:step_started, name}` before the call and `{:step_finished, name, elapsed_ms}` after. On error, the published event SHALL include the failing step name and elapsed time.

#### Scenario: Successful step emits start and finish

- **WHEN** `Researcher.research/3` wraps a Brave backend call in `Step.run("brave_search", fn -> ... end)`
- **THEN** the session publishes `{:step_started, "brave_search"}` before the HTTP call
- **AND** publishes `{:step_finished, "brave_search", elapsed_ms}` after the call succeeds

#### Scenario: Failing step emits error with attribution

- **WHEN** the NIM completion call crashes in `Step.run("nim_chat_completion", ...)`
- **THEN** the session publishes a `:error` event with shape `%{type: "error", message: <str>, step: "nim_chat_completion", elapsed_ms: <int>}`
- **AND** the frontend receives the step name and displays "Failed in NIM Chat Completion after X.Xs"

### Requirement: SearchEvent GraphQL type exposes timing fields

The Absinthe `SearchEvent` object type SHALL expose three nullable fields: `emittedAtMs` (Float, wall-clock milliseconds), `step` (String, pipeline stage name), and `elapsedMs` (Float, milliseconds since step start).

#### Scenario: Old client without timing fields

- **WHEN** a legacy client queries the `searchEvents` subscription without selecting `emittedAtMs`, `step`, or `elapsedMs`
- **THEN** the subscription works unchanged (fields are nullable and optional)

#### Scenario: New client reads timing fields

- **WHEN** a new client queries `searchEvents` with all three fields selected
- **THEN** `emittedAtMs` is a wall-clock millisecond timestamp
- **AND** `step` is the pipeline stage name or null for events emitted outside any step
- **AND** `elapsedMs` is the milliseconds since the current step started or null

### Requirement: SearchProgress UI shows real-time stage and failure attribution

The `SearchProgress` component SHALL display "Waiting on `<step>` · `<X.Xs>`" whenever a step is running and no peek text is available. On pipeline failure, the component SHALL display a red "Failed in `<step>` after `<X.Xs>`" card with the raw error message in a collapsible section.

#### Scenario: Waiting-on line during a long-running step

- **GIVEN** the Researcher step has been running for 2.1 seconds
- **WHEN** the SearchProgress component renders
- **THEN** it displays the line "Waiting on Researcher · 2.1s" below the creative ticker
- **AND** the line updates every 100ms as elapsed time advances

#### Scenario: Failure card with step attribution

- **GIVEN** the Classifier step failed after 4.2 seconds with the message "rate limited"
- **WHEN** the SearchProgress component renders
- **THEN** it displays a red card with the headline "Failed in Classifier after 4.2s"
- **AND** the raw message "rate limited" is available in a collapsible section

### Requirement: Step timeline drawer

The SearchProgress component SHALL expose a toggle button that opens a drawer rendering every step in the pipeline as a row with its name, start offset, duration, and status icon.

#### Scenario: Open timeline drawer

- **WHEN** the user clicks the "steps" toggle button on a completed search
- **THEN** a drawer opens listing every step with: name, start offset in seconds, duration in seconds, and a status icon (✓ for ok, ✕ for error, ⏱ for still running)

## Why

Four UX gaps prevented the app from being used as a real research tool: (1) opaque search progress — the UI cycled creative ticker lines while the real pipeline was stuck on one silent external call; (2) no follow-up composer in the Library detail view — the backend already supported it, only the UI was missing; (3) Library rows were read-only except for Delete — no archive, no trash, no recovery; (4) per-page tab titles and a left-edge accent bar that the user wanted flipped. This change closes all four in six incrementally shippable slices while introducing chat-level lifecycle semantics and real per-step pipeline instrumentation as the foundation for a library-and-search-ux capability.
