# Add User Settings Page

## Why

There is no surface today for changing app preferences — default search mode is hardcoded, theme persistence is session-only (lost on reload because `ThemeProvider` does not hydrate from localStorage), and there is no place for future knobs (keyboard shortcuts, default result count, etc.) to live. The owner has asked for a fast way to tweak things. A dedicated `/settings` page is the conventional home for that, and it is also the natural place to show "who am I signed in as" (from `add-github-auth-gate`) and the "Sign out" button.

## What Changes

- New `/settings` route in Redwood, wrapped by `AppLayout`, served by a new `SettingsPage` component.
- New `SettingsProvider` context that persists a versioned JSON blob in `localStorage` under the key `perplexica.settings.v1`. Current fields: `defaultMode: "speed" | "balanced" | "quality"`, `theme: "system" | "light" | "dark"`. The provider hydrates on mount, exposes `useSettings()` (read) and `useUpdateSettings()` (write), and writes back to `localStorage` on every change.
- `HomePage` reads the default mode from settings when initializing a new chat instead of hardcoding `"balanced"`.
- `ThemeProvider` is refactored to treat `SettingsProvider.theme` as the source of truth instead of component-local state, so reload persistence works for the first time.
- `AppLayout` gains a "Settings" entry in both the desktop sidebar (above the Light/Dark Mode toggle) and the mobile header (gear icon next to the theme toggle).
- `SettingsPage` displays three grouped cards:
  - **Account** — avatar, GitHub username, "Sign out" button (delegates to `useSession().signOut()` from the auth gate work).
  - **Appearance** — segmented control: system / light / dark.
  - **Search defaults** — radio group: speed / balanced / quality; each option shows its hint line from `MessageInput.tsx` so the choice is meaningful.
- The page supports a mobile back button (top-left arrow → browser history back) so the user can return to wherever they came from.
- **Non-goals for this change**: no backend settings table, no server-persisted preferences, no per-user preferences (single user). Mode *behavior* (iteration counts, budgets) is NOT in scope — that ships in `add-search-mode-config`, which depends on this one.

## Capabilities

### New Capabilities
- `user-settings-preferences`: `/settings` route, `SettingsProvider` with versioned `localStorage` persistence, `SettingsPage` UI for account / appearance / search-default preferences, and mobile-header + sidebar entry points.

### Modified Capabilities
None — this repo has no existing settings capability spec.

## Impact

- **Dependencies**: this change depends on `add-github-auth-gate` (needs `useSession()` for the Account card).
- **Affected code**:
  - `redwood/web/src/Routes.tsx` — add `/settings` route
  - `redwood/web/src/pages/SettingsPage/SettingsPage.tsx` — new page component
  - `redwood/web/src/lib/settings.tsx` — new provider/hooks/schema
  - `redwood/web/src/lib/theme.tsx` — refactor to consume `SettingsProvider`
  - `redwood/web/src/App.tsx` — wrap with `SettingsProvider`
  - `redwood/web/src/layouts/AppLayout/AppLayout.tsx` — mobile header gear button + sidebar Settings link
  - `redwood/web/src/components/Chat/MessageInput.tsx` — initial mode prop now sourced from `useSettings().defaultMode`
  - `redwood/web/src/pages/HomePage/HomePage.tsx` — new chats use `useSettings().defaultMode`
- **Storage**: one new `localStorage` key (`perplexica.settings.v1`) on the user's device. Nothing sensitive — just UI preferences.
- **Reversibility**: removing the provider and deleting the key returns the app to its current behavior (default `"balanced"` + session-only theme).
