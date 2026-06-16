# auth-github-gate Spec Delta — unblock-prod-preview

## ADDED Requirements

### Requirement: Authentication bypass via `AUTH_BYPASS` env var

The system SHALL support an operator-only escape hatch, activated by the `AUTH_BYPASS` environment variable, that short-circuits all authentication and allowlist checks. When enabled, every request — regardless of session state — SHALL be treated as signed-in under the synthetic identity `"preview"`. When disabled or unset, the existing GitHub OAuth + allowlist gate SHALL behave identically to today.

The flag SHALL be read at runtime from `System.get_env("AUTH_BYPASS")` and normalized to a boolean. Accepted truthy values: `"true"`, `"1"`, `"yes"`. Any other value (including unset) SHALL be treated as false.

The flag SHALL be stored in the application environment at `:perplexica, :auth_bypass` so that `Application.get_env/3` can be used at request time without re-reading the OS env.

#### Scenario: AUTH_BYPASS unset — existing behavior preserved

- **Given** the `AUTH_BYPASS` environment variable is not set
- **When** the Phoenix application boots
- **Then** `Application.get_env(:perplexica, :auth_bypass, false)` returns `false`
- **And** `GET /auth/whoami` with no session cookie returns HTTP `200` with body `{"signed_in":false}`
- **And** a GraphQL POST with no session cookie receives HTTP `401` `{"error":"unauthenticated"}`
- **And** a GraphQL POST with an allowlisted session receives the resolver result
- **And** a GraphQL POST with a non-allowlisted session receives HTTP `403` `{"error":"forbidden"}`

#### Scenario: AUTH_BYPASS=false — existing behavior preserved

- **Given** `AUTH_BYPASS="false"` is set in the environment
- **When** the Phoenix application boots
- **Then** `Application.get_env(:perplexica, :auth_bypass, false)` returns `false`
- **And** the full existing `auth-github-gate` behavior (OAuth, allowlist, 401/403) applies unchanged

#### Scenario: AUTH_BYPASS=true — anonymous requests succeed

- **Given** `AUTH_BYPASS="true"` is set in the environment
- **And** the Phoenix application has booted
- **When** a client makes a GraphQL POST with no session cookie
- **Then** `RequireOwner` assigns `:github_username = "preview"` to the conn
- **And** the request proceeds to the Absinthe resolver
- **And** the response is the resolver's output (not `401` or `403`)

#### Scenario: AUTH_BYPASS=true — real sessions are overridden

- **Given** `AUTH_BYPASS="true"` is set
- **And** a client holds a valid session cookie for an allowlisted user `realuser`
- **When** the client makes a GraphQL POST
- **Then** `RequireOwner` assigns `:github_username = "preview"` (NOT `"realuser"`)
- **And** the request proceeds to the resolver
- **And** downstream code that reads `conn.assigns.github_username` sees `"preview"`

#### Scenario: AUTH_BYPASS=true — whoami reports preview identity

- **Given** `AUTH_BYPASS="true"` is set
- **When** a client calls `GET /auth/whoami` with no session cookie
- **Then** the response is HTTP `200` with body `{"signed_in":true,"username":"preview","avatar_url":null,"auth_bypass":true}`

#### Scenario: AUTH_BYPASS=true — boot warning is logged

- **Given** `AUTH_BYPASS="true"` is set and `config_env()` is not `:test`
- **When** the Phoenix application boots
- **Then** a warning log line is emitted containing the substring `"AUTH_BYPASS=true"` and the substring `"authentication is disabled"`
- **And** the log level is `:warn` or `:warning`

#### Scenario: AUTH_BYPASS value normalization

- **Given** `AUTH_BYPASS="yes"` is set
- **When** the application boots
- **Then** `Application.get_env(:perplexica, :auth_bypass, false)` returns `true`

- **Given** `AUTH_BYPASS="1"` is set
- **When** the application boots
- **Then** `Application.get_env(:perplexica, :auth_bypass, false)` returns `true`

- **Given** `AUTH_BYPASS="foo"` is set
- **When** the application boots
- **Then** `Application.get_env(:perplexica, :auth_bypass, false)` returns `false`

### Requirement: Preview mode banner in the frontend

When the backend reports `auth_bypass: true` in the `GET /auth/whoami` response, the Redwood SPA SHALL render a persistent top banner on every page indicating that authentication is disabled. The banner SHALL be absent whenever `auth_bypass` is `false` or missing.

The banner SHALL contain a direct sign-in link pointing at `${PHOENIX_URL}/auth/github` so the operator can leave preview mode without manually navigating.

The frontend session context SHALL expose a `authBypass: boolean` field derived from the whoami response, defaulting to `false` when the field is absent.

#### Scenario: whoami returns auth_bypass true — banner renders

- **Given** `GET /auth/whoami` returns `{"signed_in":true,"username":"preview","auth_bypass":true}`
- **When** the Redwood SPA mounts
- **Then** `useSession().authBypass` returns `true`
- **And** `PreviewModeBanner` renders at the top of the app layout on every route
- **And** the banner contains text indicating authentication is disabled
- **And** the banner contains an anchor whose `href` is `${PHOENIX_URL}/auth/github`

#### Scenario: whoami returns auth_bypass false — banner hidden

- **Given** `GET /auth/whoami` returns `{"signed_in":true,"username":"realuser","avatar_url":"...","auth_bypass":false}`
- **When** the Redwood SPA mounts
- **Then** `useSession().authBypass` returns `false`
- **And** `PreviewModeBanner` renders as `null` (not present in the DOM)

#### Scenario: whoami omits auth_bypass — banner hidden

- **Given** `GET /auth/whoami` returns `{"signed_in":false}` (no `auth_bypass` field)
- **When** the Redwood SPA mounts
- **Then** `useSession().authBypass` returns `false`
- **And** `PreviewModeBanner` renders as `null`

### Requirement: Bypass must not persist session state

When `AUTH_BYPASS=true`, the bypass path SHALL NOT call `put_session/3`, `configure_session/2`, or otherwise mutate the session cookie. Bypassed requests SHALL leave the session cookie unchanged so that a real OAuth session persisted before bypass was enabled remains intact and becomes active again when bypass is turned off.

#### Scenario: Bypassed request preserves existing session cookie

- **Given** `AUTH_BYPASS="true"` is set
- **And** a client holds a pre-existing session cookie for `realuser` who is in the allowlist
- **When** the client makes a GraphQL POST
- **Then** the response does NOT include a `Set-Cookie` header that modifies the session value
- **And** after turning bypass off (without client reload), the next request from the same client is recognized as `realuser` via the unchanged cookie

#### Scenario: Bypassed request with no cookie does not set one

- **Given** `AUTH_BYPASS="true"` is set
- **And** a client has no session cookie
- **When** the client makes a GraphQL POST
- **Then** the response does NOT include a `Set-Cookie` header for the session
- **And** no new session is created server-side

### Requirement: Allowlist remains loaded under bypass

When `AUTH_BYPASS=true`, `runtime.exs` SHALL still parse the `GITHUB_ALLOWLIST` env var and populate `:perplexica, :github_allowlist` as usual. This ensures flipping `AUTH_BYPASS` off requires only a restart (triggered by the Railway env var change), not a separate allowlist reload.

#### Scenario: Allowlist still parsed when bypass is on

- **Given** `AUTH_BYPASS="true"` and `GITHUB_ALLOWLIST="stussysenik,alice"` are both set
- **When** the Phoenix application boots
- **Then** `Application.get_env(:perplexica, :github_allowlist)` returns `["stussysenik", "alice"]`
- **And** `Application.get_env(:perplexica, :auth_bypass)` returns `true`

#### Scenario: Flipping bypass off re-enables allowlist immediately

- **Given** `AUTH_BYPASS="true"` and `GITHUB_ALLOWLIST="stussysenik"` are set, and a client is actively using bypass
- **When** `AUTH_BYPASS` is set to `"false"` and the Phoenix application restarts
- **Then** the next request with no session cookie receives HTTP `401`
- **And** the next request with a `stussysenik` session cookie is allowlisted and proceeds to the resolver
