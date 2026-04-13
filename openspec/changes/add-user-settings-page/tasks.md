# Tasks — Add User Settings Page

## 1. Settings provider and schema
- [x] 1.1 Create `redwood/web/src/lib/settings.tsx` exporting `SettingsProvider`, `useSettings`, `useUpdateSettings`, default value `{ defaultMode: 'balanced', theme: 'system', version: 1 }`, and a `parseStoredSettings(raw: string | null): Settings` helper that tolerates bad JSON and unknown versions by returning defaults.
- [x] 1.2 On mount, the provider reads `localStorage.getItem('perplexica.settings.v1')` and hydrates state; on every state change, writes back (debounced 150ms via a single `useEffect`). Exposes `set<Key>` callbacks that go through `useUpdateSettings`.
- [x] 1.3 Wrap `Routes` in `App.tsx` as `<SettingsProvider>` (outside `SessionProvider` is fine — they are independent).
- [x] 1.4 Vitest unit test for `parseStoredSettings`: null → defaults, malformed string → defaults, valid v1 blob → parsed, blob with `version: 999` → defaults.

**Verification**: `pnpm -C redwood/web run test` (or Vitest CLI) green on `parseStoredSettings`. `npx tsc --noEmit` clean on the new file.

## 2. Theme provider refactor
- [x] 2.1 Refactor `redwood/web/src/lib/theme.tsx` so it consumes `useSettings().theme` and `useUpdateSettings().setTheme` instead of owning its own state. The `toggle()` export becomes a helper that flips `light ↔ dark` (or switches to `light` when `theme === 'system'` and system is dark, etc.).
- [x] 2.2 On mount, `ThemeProvider` applies the resolved theme to `document.documentElement` and subscribes to `window.matchMedia('(prefers-color-scheme: dark)')` when `theme === 'system'`.
- [x] 2.3 Remove any existing localStorage reads/writes from `ThemeProvider` (the settings provider is now the single source of truth) to avoid double-writes.

**Verification**: Dev server — set theme to light, reload, app renders light without flicker. Toggle back to dark, reload, renders dark. Change OS theme while "System" is selected, see instant swap without reload.

## 3. Settings route and page scaffold
- [x] 3.1 Add `<Route path="/settings" page={SettingsPage} name="settings" />` inside the `<Set wrap={AppLayout}>` block of `Routes.tsx`.
- [x] 3.2 Create `redwood/web/src/pages/SettingsPage/SettingsPage.tsx`. Structure: back-button header + page title + three stacked cards (Account / Appearance / Search defaults). Use existing design tokens for typography and spacing; no new CSS variables.
- [x] 3.3 Back button: `onClick={() => window.history.length > 1 ? window.history.back() : navigate('/')}`. Use an `ArrowLeft` Phosphor icon on the left, and a "Settings" title centered on mobile, left-aligned on desktop.

**Verification**: `pnpm -C redwood/web run dev` — navigate to `/settings` manually, see the shell with 3 empty cards and working back button.

## 4. Appearance card
- [x] 4.1 Implement the Appearance card with a segmented control: `System`, `Light`, `Dark`. Each option has an icon (Monitor / Sun / Moon) and a short caption underneath.
- [x] 4.2 Wire the selected state to `useSettings().theme` and dispatch changes via `useUpdateSettings().setTheme`.
- [x] 4.3 Add an `aria-label` to the segmented control and `aria-pressed` on each button.

**Verification**: Click each option, the active state updates, the `<html>` data-theme attribute flips, and a reload preserves the choice.

## 5. Search defaults card
- [x] 5.1 Implement the Search defaults card with a radio list of `Speed / Balanced / Quality`. Each row: mode name, current hint text (copied from `MessageInput.tsx` `modes` array), radio dot on the left.
- [x] 5.2 Wire selected state to `useSettings().defaultMode` / `useUpdateSettings().setDefaultMode`.
- [x] 5.3 Update `HomePage.tsx` so new chat initialization reads `useSettings().defaultMode` instead of `'balanced'`.
- [x] 5.4 Update `MessageInput.tsx` — the `mode` prop's initial value in any parent that creates a new chat flow must come from the settings default. Existing chats continue to honor whatever mode they were created with.

**Verification**: Set default to "Speed", start a new search from `/`, verify the Speed tab is highlighted on load. Reload, same result.

## 6. Account card
- [x] 6.1 Implement the Account card. Reads `useSession()` from `add-github-auth-gate`. Left: 40×40 avatar image; right: username (bold) + secondary line "Signed in via GitHub"; trailing: "Sign out" text button.
- [x] 6.2 Sign-out onClick: `await fetch('${PHOENIX_URL}/auth/session', { method: 'DELETE', credentials: 'include' })`, then `session.refresh()`. The `SignInGate` wrapper handles re-rendering the splash.

**Verification**: With a real session, see avatar + username. Click Sign out, land back on the splash.

## 7. Navigation entry points
- [x] 7.1 `AppLayout` desktop sidebar: add a `<Link to="/settings">` above the Light/Dark mode toggle, with a `GearSix` icon + "Settings" label styled to match existing sidebar items.
- [x] 7.2 `AppLayout` mobile header: add a `<Link to="/settings">` with a `GearSix` icon button to the left of the existing theme toggle button. Maintain the existing flex-between layout (logo left, action buttons right). Keep the tap target at least 40×40.
- [x] 7.3 Active-state styling: when `pathname === '/settings'`, the sidebar link and mobile button highlight with accent-blue.

**Verification**: Click the desktop sidebar link, land on `/settings`; click the mobile gear icon, same. Active state visually distinct.

## 8. End-to-end verification
- [x] 8.1 Playwright e2e: `e2e/settings.spec.ts` — navigate to `/settings`, change theme to light, reload, assert light mode; change default mode to quality, open `/`, assert Quality tab is active; click Sign out, assert sign-in splash.
- [x] 8.2 Manual: tab/keyboard navigation through the settings page — all controls reachable, focus ring visible, Enter toggles.
- [x] 8.3 Manual: open DevTools → Application → localStorage — confirm `perplexica.settings.v1` exists with the correct shape after changes.

**Verification**: Playwright suite green; manual pass checks all boxes.
