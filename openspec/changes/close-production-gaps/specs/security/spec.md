# Security

## Description

Production security posture for the deployed Perplexica stack, prioritized by real
blast radius (network exposure, control-plane exposure, server-side request forgery,
access hygiene). Compliance frameworks (e.g. SOC 2) are explicitly out of scope.

See: deployment, data-durability, observability

## ADDED Requirements

### REQ-SEC-001: Network-edge firewall with default-deny inbound

The server hosting Perplexica MUST sit behind a Hetzner Cloud Firewall that denies all
inbound traffic except an explicit allowlist, enforced at the network edge (before
Docker port publishing).

#### Scenario: Only public app + ACME ports are reachable from the internet
**Given** the firewall is attached to the Perplexica server
**When** an arbitrary internet host connects to TCP 80 or 443
**Then** the connection is allowed (public app and Let's Encrypt)

#### Scenario: The control plane is not reachable from the internet
**Given** the firewall is attached
**When** an arbitrary internet host connects to the Coolify admin port (8000) or the
database port (5432)
**Then** the connection is dropped unless the source IP is on the operator allowlist

#### Scenario: SSH is restricted
**Given** the firewall is attached
**When** an arbitrary internet host connects to TCP 22
**Then** the connection is dropped unless the source matches the operator rule
**And** if SSH is left open to all, password authentication is disabled (key-only)

### REQ-SEC-002: No plain-HTTP administrative access

Administrative interfaces (Coolify dashboard, any future admin UI) MUST NOT be served
over unencrypted HTTP on a public address.

#### Scenario: Admin dashboard over HTTP is unavailable publicly
**Given** the deployment is hardened
**When** a user requests the Coolify dashboard over `http://<public-ip>:8000`
**Then** the request is not served to non-operator source IPs
**And** operator access is over TLS or an SSH tunnel / restricted source IP

### REQ-SEC-003: SSRF protection for server-side URL fetching

Any feature that fetches a user- or model-supplied URL server-side (notably
`scrape_url`) MUST validate the target before connecting.

#### Scenario: Disallowed schemes are rejected
**Given** a scrape request with a non-HTTP(S) URL (e.g. `file://`, `gopher://`)
**When** `scrape_url` processes it
**Then** the URL is rejected and not fetched

#### Scenario: Private and metadata destinations are blocked after DNS resolution
**Given** a scrape request whose host resolves to a private (RFC-1918), loopback,
link-local, unique-local, or cloud-metadata address (e.g. `169.254.169.254`)
**When** `scrape_url` resolves the host and checks the resolved IP
**Then** the URL is rejected and not fetched
**And** the rejection is logged without leaking internal addresses to the client

#### Scenario: Public URLs still work
**Given** a scrape request for a normal public website
**When** `scrape_url` validates and resolves it to a public IP
**Then** the fetch proceeds as before

### REQ-SEC-004: Authentication cannot be silently disabled in production

The `AUTH_BYPASS` escape hatch MUST be provably off in the production environment.

#### Scenario: Production rejects AUTH_BYPASS
**Given** the production deployment configuration
**When** the running environment is inspected
**Then** `AUTH_BYPASS` is unset (or false)
**And** if it were enabled, a startup warning is emitted and recorded

### REQ-SEC-005: SSH key and credential hygiene

Access credentials MUST be limited to what is in active use, and credentials that have
been exposed MUST be rotated.

#### Scenario: Stale SSH keys are removed
**Given** the server's authorized keys and the Hetzner project key list
**When** the key inventory is reviewed
**Then** only keys in active operational use remain; stale/temporary keys are removed

#### Scenario: Exposed high-blast-radius secrets are rotated
**Given** credentials known to have been exposed (DNS registrar token, database
password, infrastructure API token)
**When** hardening completes
**Then** each such credential has been rotated and the new value stored only in
untracked secret storage (never committed, never in plain config)
