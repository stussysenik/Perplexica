# auth-github-gate Spec Delta

## ADDED Requirements

### Requirement: GraphQL pipeline requires an allowlisted session

The Phoenix GraphQL endpoint at `POST /api/graphql` SHALL reject any request that does not carry a session cookie whose decoded `github_username` claim is present in the configured allowlist. CORS preflight (`OPTIONS`) SHALL continue to succeed without authentication so browsers can discover the endpoint.

#### Scenario: Unauthenticated GraphQL request
- **WHEN** a client POSTs a GraphQL query to `/api/graphql` without a session cookie
- **THEN** the server responds with HTTP `401` and JSON body `{"error":"unauthenticated"}`
- **AND** no upstream API call (NIM, GLM, Brave, Exa) is made

#### Scenario: Session with non-allowlisted username
- **WHEN** a client POSTs a GraphQL query with a valid session whose `github_username` is not in the allowlist
- **THEN** the server responds with HTTP `403` and JSON body `{"error":"forbidden"}`

#### Scenario: Session with allowlisted username
- **WHEN** a client POSTs a GraphQL query with a valid session whose `github_username` is in the allowlist
- **THEN** the request proceeds to the Absinthe resolver and returns the query result

#### Scenario: CORS preflight bypasses auth
- **WHEN** a browser sends `OPTIONS /api/graphql` with no session
- **THEN** the server responds with HTTP `204` and the `Access-Control-Allow-*` headers set

### Requirement: GitHub OAuth sign-in flow

The system SHALL expose a browser-navigable endpoint that initiates GitHub OAuth via Ueberauth, handles the callback, and persists the authenticated identity into the session. A successful callback SHALL redirect the browser to the application root.

#### Scenario: Initiate sign-in
- **WHEN** the user navigates to `GET /auth/github`
- **THEN** the browser is redirected to `github.com/login/oauth/authorize` with the configured `client_id` and `scope=read:user`

#### Scenario: Successful callback stores session
- **WHEN** GitHub redirects to `/auth/github/callback?code=<valid>` and Ueberauth exchanges the code successfully
- **THEN** the server stores `github_username` (lowercased), `github_user_id`, and `avatar_url` in the session
- **AND** calls `configure_session(conn, renew: true)` to rotate the session id
- **AND** redirects the browser to `/` with HTTP `302`

#### Scenario: Failed callback
- **WHEN** GitHub redirects to `/auth/github/callback` with an `error` query parameter
- **THEN** the server drops any existing session via `configure_session(conn, drop: true)`
- **AND** redirects the browser to `/?auth_error=1`

### Requirement: Session introspection endpoint

The system SHALL expose an unauthenticated `GET /auth/whoami` endpoint that the frontend uses to determine current sign-in state. The response SHALL clear the session cookie if the session contains a username that is no longer in the allowlist.

#### Scenario: Signed-out introspection
- **WHEN** a client calls `GET /auth/whoami` with no session cookie
- **THEN** the server responds with HTTP `200` and body `{"signed_in": false}`

#### Scenario: Signed-in introspection
- **WHEN** a client calls `GET /auth/whoami` with a session containing `github_username = "senik"` and `senik` is in the allowlist
- **THEN** the server responds with HTTP `200` and body `{"signed_in": true, "username": "senik", "avatar_url": "<github avatar url>"}`

#### Scenario: Revoked-allowlist introspection
- **WHEN** a client calls `GET /auth/whoami` with a session containing a username that has been removed from the allowlist
- **THEN** the server responds with HTTP `200` and body `{"signed_in": false}`
- **AND** the response includes a `Set-Cookie` header that clears the session cookie

### Requirement: Sign-out endpoint

The system SHALL expose `DELETE /auth/session` which clears the session cookie unconditionally.

#### Scenario: Sign-out with existing session
- **WHEN** a client calls `DELETE /auth/session` with a valid session cookie
- **THEN** the server responds with HTTP `204`
- **AND** the response includes a `Set-Cookie` header that expires the session cookie in the past

#### Scenario: Sign-out without session
- **WHEN** a client calls `DELETE /auth/session` with no session cookie
- **THEN** the server responds with HTTP `204` (idempotent)

### Requirement: Health endpoint stays public

`GET /health` SHALL NOT require authentication — Fly.io health probes cannot carry session cookies, and a 401 on the health endpoint would mark the instance unhealthy.

#### Scenario: Unauthenticated health check
- **WHEN** a client calls `GET /health` with no session cookie
- **THEN** the server responds with HTTP `200` and body `{"status":"ok"}`

### Requirement: Session cookie hardening

The session cookie SHALL be encrypted, signed, `HttpOnly`, `SameSite=Lax`, and `Secure` in production. Development builds (`MIX_ENV=dev`) MAY relax `Secure` so `http://localhost` works.

#### Scenario: Production cookie attributes
- **WHEN** the Phoenix application runs with `MIX_ENV=prod` and sets a session cookie
- **THEN** the `Set-Cookie` header contains `HttpOnly`, `SameSite=Lax`, and `Secure`

#### Scenario: Development cookie attributes
- **WHEN** the Phoenix application runs with `MIX_ENV=dev` and sets a session cookie
- **THEN** the `Set-Cookie` header contains `HttpOnly` and `SameSite=Lax` but omits `Secure`

#### Scenario: Session renewal on sign-in
- **WHEN** the server handles `/auth/github/callback` successfully
- **THEN** it calls `configure_session(conn, renew: true)` before writing the new session, producing a new cookie value distinct from the pre-sign-in cookie

### Requirement: Allowlist configuration

The username allowlist SHALL be read at runtime from the `GITHUB_ALLOWLIST` environment variable as a comma-separated list, lowercased for case-insensitive matching, and SHALL NOT require a recompile to change.

#### Scenario: Allowlist parsed from env
- **WHEN** `GITHUB_ALLOWLIST="Senik,OtherUser"` and the application boots
- **THEN** `Application.get_env(:perplexica, :github_allowlist)` returns `["senik", "otheruser"]`

#### Scenario: Empty allowlist locks everyone out
- **WHEN** `GITHUB_ALLOWLIST` is unset or empty and any GraphQL request arrives with any session
- **THEN** `RequireOwner` responds with HTTP `403`
- **AND** the application logs a warning `"GITHUB_ALLOWLIST is empty — no users can sign in"`

### Requirement: Frontend session provider and sign-in gate

The Redwood frontend SHALL expose a `SessionProvider` context that fetches `/auth/whoami` on mount (`credentials: 'include'`) and a `SignInGate` component that renders a sign-in splash when the session is signed-out and renders its children when signed-in.

#### Scenario: Initial load while signed out
- **WHEN** the SPA boots without a session cookie and `SessionProvider` completes its `/auth/whoami` fetch
- **THEN** `SignInGate` renders the sign-in splash instead of `children`
- **AND** the splash contains an anchor pointing at `${PHOENIX_URL}/auth/github`

#### Scenario: Initial load while signed in
- **WHEN** the SPA boots with a valid session for an allowlisted user and `SessionProvider` completes its `/auth/whoami` fetch
- **THEN** `SignInGate` renders `children`
- **AND** `useSession()` returns `{ signedIn: true, username, avatarUrl }`

#### Scenario: Mid-session revocation
- **WHEN** an Apollo query returns HTTP `403` during an authenticated session
- **THEN** the Apollo error link calls `SessionProvider.refresh()`
- **AND** the gate re-renders the sign-in splash on the next React tick
