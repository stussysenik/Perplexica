# user-settings-preferences Spec Delta

## ADDED Requirements

### Requirement: Versioned settings storage

The frontend SHALL persist user preferences in `localStorage` under a single versioned key `perplexica.settings.v1`, storing a JSON blob with shape `{ defaultMode, theme, version }`. On read, unknown or malformed blobs SHALL fall back to defaults instead of crashing the app.

#### Scenario: Fresh load without stored settings
- **WHEN** the SPA boots and no `perplexica.settings.v1` key exists
- **THEN** `useSettings()` returns defaults `{ defaultMode: "balanced", theme: "system" }`
- **AND** no write to `localStorage` is made until the user changes a preference

#### Scenario: Write persists on change
- **WHEN** the user changes `defaultMode` to `"quality"`
- **THEN** `localStorage.getItem("perplexica.settings.v1")` contains a JSON blob whose `defaultMode` field equals `"quality"`
- **AND** the blob includes `"version": 1`

#### Scenario: Malformed blob falls back to defaults
- **WHEN** the SPA boots and `perplexica.settings.v1` contains non-JSON or a blob with an unknown `version`
- **THEN** `useSettings()` returns defaults
- **AND** the malformed entry is NOT overwritten until the user changes a preference (so a future migration has a chance to read the original)

### Requirement: Settings route and navigation

The Redwood router SHALL expose a `/settings` route wrapped in `AppLayout`, reachable from both the desktop sidebar and the mobile header. The settings page SHALL provide a back-navigation control that returns the user to their prior location.

#### Scenario: Desktop sidebar link
- **WHEN** the user is on any page at a `lg` or larger viewport
- **THEN** the sidebar contains a "Settings" link targeting `/settings` positioned above the Light/Dark mode toggle

#### Scenario: Mobile header gear button
- **WHEN** the user is on any page at a viewport smaller than `lg`
- **THEN** the mobile header contains a gear icon button that navigates to `/settings`
- **AND** the button is positioned adjacent to the existing theme toggle

#### Scenario: Back from settings
- **WHEN** the user is on `/settings` and clicks the back button
- **THEN** the browser navigates to the previous entry in `window.history`
- **AND** if no prior entry exists, the browser navigates to `/`

### Requirement: Appearance preferences

The settings page SHALL allow the user to choose a theme mode from `system`, `light`, or `dark` via a segmented control, and the chosen theme SHALL persist across reloads and tabs.

#### Scenario: Choose light theme
- **WHEN** the user selects "Light" on the appearance control
- **THEN** `useSettings().theme` is `"light"` immediately after the click
- **AND** the `<html>` element has `data-theme="light"` or equivalent within the same React tick
- **AND** after a hard reload, the app renders in light mode without flicker

#### Scenario: Choose system theme
- **WHEN** the user selects "System" on the appearance control
- **THEN** the app follows `prefers-color-scheme` and listens for OS-level changes via a `matchMedia` listener

### Requirement: Search default preference

The settings page SHALL allow the user to choose a default search mode (`speed`, `balanced`, `quality`) that SHALL be used when a new chat is started.

#### Scenario: Choose quality default
- **WHEN** the user selects "Quality" on the search-defaults radio group
- **AND** subsequently opens a new chat from `HomePage`
- **THEN** the `MessageInput` component initializes with `mode="quality"`

#### Scenario: Default mode preserved across reload
- **WHEN** the user has chosen "Speed" as the default and reloads the page
- **THEN** `useSettings().defaultMode` equals `"speed"`

### Requirement: Account section

The settings page SHALL display an Account card that shows the signed-in user's GitHub avatar and username (sourced from the session provider added by `auth-github-gate`) and a "Sign out" button that terminates the session.

#### Scenario: Account card while signed in
- **WHEN** the user navigates to `/settings` with an active session
- **THEN** the Account card displays `useSession().avatarUrl` and `useSession().username`
- **AND** the Account card displays a "Sign out" button

#### Scenario: Sign out from settings
- **WHEN** the user clicks "Sign out" on the Account card
- **THEN** the frontend calls `DELETE /auth/session`
- **AND** on success calls `SessionProvider.refresh()`
- **AND** the `SignInGate` re-renders the sign-in splash on the next React tick
