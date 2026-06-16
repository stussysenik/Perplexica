# Authentication

## Description

Password-based authentication using RedwoodJS dbAuth. Replaces the current HMAC-SHA256 session cookie system in `src/middleware.ts` and `src/app/api/auth/login/route.ts`.

See: frontend, data-persistence

## ADDED Requirements

### REQ-AUTH-001: Password Authentication via dbAuth

The system must authenticate users with a password using RedwoodJS dbAuth.

#### Scenario: Successful login
**Given** a user with the correct password
**When** they submit the login form
**Then** a session cookie is set and they are redirected to the home page

#### Scenario: Failed login
**Given** a user with an incorrect password
**When** they submit the login form
**Then** an error message is displayed and no session cookie is set

#### Scenario: Timing-safe comparison
**Given** a login attempt
**When** the password is compared
**Then** a constant-time comparison is used to prevent timing attacks

### REQ-AUTH-002: Session Management

The system must manage authenticated sessions via secure cookies.

#### Scenario: Session cookie properties
**Given** a successful login
**When** the session cookie is set
**Then** it has `httpOnly: true`, `secure: true` (in production), `sameSite: lax`, and 30-day expiry

#### Scenario: Session validation on protected routes
**Given** a request to a protected page
**When** the session cookie is present and valid
**Then** the request proceeds normally

#### Scenario: Missing session redirect
**Given** a request to a protected page
**When** no session cookie is present
**Then** the user is redirected to `/login`

### REQ-AUTH-003: Protected Routes

All routes except auth-related and static assets must require authentication.

#### Scenario: Public routes
**Given** an unauthenticated user
**When** they access `/login`, static assets, or the PWA manifest
**Then** the request is allowed without authentication

#### Scenario: Protected API routes
**Given** an unauthenticated request to `/api/graphql`
**When** the request is processed
**Then** it returns 401 Unauthorized

### REQ-AUTH-004: Environment-Based Auth Toggle

Authentication should only be enabled when `AUTH_PASSWORD` environment variable is set.

#### Scenario: Auth disabled
**Given** `AUTH_PASSWORD` is not set
**When** a user accesses any page
**Then** no authentication is required

#### Scenario: Auth enabled
**Given** `AUTH_PASSWORD` is set to a non-empty value
**When** a user accesses a protected page without a session
**Then** they are redirected to the login page
