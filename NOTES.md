# Security Research Notes — stagging.sinnau.com

## Stack

| Component  | Technology                              |
| ---------- | --------------------------------------- |
| Framework  | SvelteKit 2.69.1                        |
| Adapter    | @sveltejs/adapter-node 5.5.7            |
| Auth       | Better Auth 1.6.23                      |
| Database   | SQLite via Drizzle ORM + better-sqlite3 |
| UI         | shadcn-svelte, TailwindCSS 4            |
| Validation | Valibot 1.4.2                           |
| RPC        | oRPC 1.14.7                             |
| Hosting    | Fly.io                                  |

## Known URLs

- `https://stagging.sinnau.com` — main
- `https://stagging.sinnau.com/api/version` — version info
- `https://stagging.sinnau.com/api/auth/*` — Better Auth endpoints
- `https://stagging.sinnau.com/login` — login page
- `https://stagging.sinnau.com/sign-up` — registration page (200, NOT /register)
- `https://stagging.sinnau.com/robots.txt` — allows all crawling

## Useful Playwright Patterns

### Page Navigation

Use `page.goto()` for navigation, then wait for network idle or specific selectors.

### Auth Helpers

- Use `context.storageState()` to capture session state
- Better Auth uses standard cookie-based sessions
- API routes may need CSRF tokens

### Response Inspection

```ts
const response = await page.goto(url);
const headers = response!.headers();
```

### Cookie Inspection

```ts
const cookies = await context.cookies();
```

## Reusable Flows

### Playwright Header Inspection

```typescript
async function inspectHeaders(page, url) {
  const response = await page.goto(url, {
    waitUntil: "networkidle",
    timeout: 15000,
  });
  const headers = {};
  for (const key of Object.keys(response.headers())) {
    headers[key] = response.headers()[key];
  }
  return { status: response.status(), url: response.url(), headers };
}
```

### Key Observations for Subagents

- **Stack**: SvelteKit behind Cloudflare + Fly.io. All pages set `x-sveltekit-page: true` (except API).
- **Better Auth**: Auth endpoints at `/api/auth/*`. Sessions use cookies.
- **Register 404**: `/register` returns 404 — registration may be disabled or route changed.
- **No CSRF in headers**: CSRF tokens may be in cookies or request body (Better Auth handles CSRF differently).
- **API responses**: Use `content-type: application/json`. Forms likely x-www-form-urlencoded or JSON.
- **No security headers**: CSP, HSTS, XFO, XCTO all missing from app layer.
- **Info leak**: `x-powered-by: Sinnau`, `x-sinnau-sha`, `x-sinnau-version` expose app details.
- **HTTP**: Handled by Cloudflare automatic HTTPS. No HSTS.
- **Login page**: `/login` exists and returns 200 (POST, fields: email + password)
- **Sign-up page**: `/sign-up` (POST, fields: name + email + password + confirmPassword)
- **No CSRF tokens in forms**: Better Auth likely validates Origin/Referer instead
- **No cookies pre-auth**: Better Auth sets cookies only after successful sign-in
- **Error handling**: Clean 404 page `<h1>404</h1> <p>Not Found</p>` — no stack traces
- **CORS**: No CORS headers on any endpoint (safe default)
- **Info leak via version endpoint**: `/api/version` returns `{buildDate, sha, version}` without auth

## Auth API Endpoints

| Endpoint                  | Method | Purpose                                                            |
| ------------------------- | ------ | ------------------------------------------------------------------ |
| `/api/auth/sign-in/email` | POST   | Login with `{email, password}` → returns `{redirect, token, user}` |
| `/api/auth/sign-up/email` | POST   | Register with `{name, email, password, confirmPassword}`           |
| `/api/auth/get-session`   | GET    | Returns session or null                                            |
| `/api/auth/sign-out`      | POST   | Logout                                                             |

## Auth Details (Better Auth)

- **Session cookie**: `__Secure-better-auth.session_token` (httpOnly, Secure, SameSite=Lax)
- **Login cookie**: `better-auth.last_used_login_method` (no httpOnly, Secure)
- **CSRF**: Origin/Referer validation (no token-based CSRF)
- **Rate limiting**: IP-based, kicks in after ~11 failed attempts, returns 429 plain text
- **Protected routes**: `/home` redirects to `/login` when not authenticated
- **Min password length**: 8 characters (no complexity requirements)
- **No confirmPassword validation**: Server does NOT check if confirmPassword matches password
- **No password reset**: `/forget-password` etc. all 404

## Login/Sign-up Selectors

- Login: `input[name="email"]`, `input[name="password"]`, button text "Masuk"
- Sign-up: `input[name="name"]`, `input[name="email"]`, `input[name="password"]`, `input[name="confirmPassword"]`, button text "Daftar"

## Session Details

- **Session token format**: `sessionId.hmacSignature` (opaque, not JWT)
- **Cookie**: `__Secure-better-auth.session_token` (httpOnly, Secure, SameSite=Lax, 7-day max-age)
- **Token data**: Session ID (20 bytes random) + HMAC-SHA256 signature
- **User data**: Fetched server-side via session ID (not self-contained in token)
- **Multi-session**: Allowed — no invalidation on new login
- **oRPC studySet.get**: Use `page.evaluate(async () => { const r = await fetch('/rpc/studySet.get', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({json: {id: 'sts_...'}}) }); return await r.json(); })`
- **`get-session` returns**: `{session: {expiresAt, token, createdAt, ipAddress, userAgent, userId, id}, user: {name, email, emailVerified, role, banned, lastLoginMethod}}`
- **emailVerified**: Always true (set in auth config hook)

## Rate Limiting Details

| Endpoint         | Max | Window |
| ---------------- | --- | ------ |
| `/sign-in/email` | 15  | 300s   |
| `/sign-up/email` | 15  | 300s   |
| Default (global) | 100 | 60s    |
| Other auth paths | 9   | 600s   |

- Rate limited response: 429 `{"message":"Too many requests."}`, `x-retry-after` header present
- Rate limiting is **per-endpoint** (not IP-wide): sign-in can be blocked while sign-up still works
- Counter does not reset quickly

## ownerId Exposure in Search

`POST /rpc/studySetSearch/search` returns `ownerId` in every result — allows mapping study sets to user IDs.

## Session Token in API Response

`GET /api/auth/get-session` and `/api/auth/list-sessions` return the raw session `token` value in JSON body. Cookie is httpOnly but same token accessible via API.

## User Data in 404 Pages

SvelteKit error pages embed full user object in HTML source on 404 responses.

## No 500 Errors / No Timing Oracle

All edge-case inputs return clean 400/401/404. studySet.get timing indistinguishable between 200 and 404 (~51ms vs ~50ms).

## SvelteKit `__data.json` Endpoint

Every SvelteKit page exposes `__data.json` suffix with serialized page data:

- Auth pages: `oauthProviders`, user data
- Protected pages after auth: full user objects (name, email, role, id, timestamps)
- `/subs/plans/__data.json` → subscription plan pricing and features (public)
- `/home/__data.json` → redirect when unauth, user data when auth

## Email Enumeration via Duplicate Registration

`POST /api/auth/sign-up/email` with existing email returns **422**:

```json
{
  "message": "User already exists. Use another email.",
  "code": "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"
}
```

## oRPC Schema Leakage

Validation errors on oRPC endpoints leak full valibot schema including regex patterns, constraints, and field names. Test with: `POST /rpc/studySet/get` with `{"json":{"id":"sts_bad"}}`.

## Discovered Better Auth Endpoints

- `/api/auth/list-sessions` (GET, auth required)
- `/api/auth/list-accounts` (GET, auth required)
- `/api/auth/verify-email` (GET, no auth, 400 — expects `query.token`)
- `/api/auth/admin/list-users` (GET, admin only) — 403 for non-admin

## Discovered Admin Procedures (403 confirmation)

- `plan.admin.grantPlan`
- `studySet.admin.cleanupVisits`
- Session data includes `impersonatedBy` field

## API Key Plugin — Broken Authentication

`apiKey({})` in `config.ts` is missing `enableSessionForAPIKeys: true`. Keys can be created but CANNOT authenticate any request. API key flow is dead code.

Available endpoints (all require session cookie):

- `POST /api/auth/api-key/create` — creates key, returns value once
- `GET /api/auth/api-key/list` — returns keys (value omitted)
- `GET /api/auth/api-key/get?id=` — returns single key (value omitted)
- `POST /api/auth/api-key/update` — `{keyId}`
- `POST /api/auth/api-key/delete` — `{keyId}`

## CRITICAL: Password Change Does NOT Invalidate Sessions

`POST /api/auth/change-password` returns 200 but ALL existing sessions remain valid. Stolen cookie survives password change. An attacker who has a cookie can change the password and still keep access.

## Session Revocation Endpoints (Better Auth)

- `POST /api/auth/revoke-sessions` — revokes ALL sessions
- `POST /api/auth/revoke-other-sessions` — revokes all except current
- `POST /api/auth/revoke-session` — requires `{token}` in body

## Session Token Structure

`cookie = sessionId.hmacSignature`

- `sessionId`: 20-byte random (base64url → ~27 chars)
- `hmacSignature`: HMAC-SHA256(sessionId, secret) (base64 encoded)
- API response returns only `sessionId` (not full cookie)
- HMAC prevents tampering (tampered → 401/Unauthorized)
- Session duration: 7 days (no refresh, no Remember Me)
- Logout properly invalidates server-side
- No concurrent session limit

## Session Cookie Attributes

- `__Secure-better-auth.session_token`: httpOnly=true, Secure=true, SameSite=Lax, domain=stagging.sinnau.com, max-age=7d
- `better-auth.last_used_login_method`: httpOnly=false (JS accessible), Secure=true, SameSite=Lax, max-age=30d

## CSRF — Better Auth Works Correctly

`trustedOrigins: () => []` in production returns `[]` (no trusted origins). Cross-origin POST to Better Auth returns 403 "Invalid origin". Verified working.

## CSRF — oRPC Has NO Protection (CRITICAL)

All `/rpc/*` state-changing operations accept any Origin header. Currently ONLY SameSite=Lax on session cookie prevents cross-origin attacks. If SameSite is ever weakened (subdomain compromise, browser bug, etc.), all oRPC endpoints are exploitable with zero additional defense.

## SQL Injection — No Vulnerabilities Found

Three layers of defense:

1. Valibot validation — min_length, max_length, control character filter, strict ID regexes
2. `sanitizeFts5Query()` — wraps search input in FTS5 phrase `"..."` (so operators treated as literal)
3. Drizzle parameterization — `sql` tagged template converts `${...}` to `?` placeholders

## XSS — No Vulnerabilities Found

All user-generated content auto-escaped by Svelte template expressions (`{variable}`). No `{@html}` usage. No reflected XSS. No DOM-based XSS. No mXSS. No header reflection. No file upload endpoints. No Svelte template injection. Stored XSS payloads accepted by APIs but NOT executable — any future `{@html}` or `innerHTML` change would create instant XSS.

## oRPC Origin Check Missing

File: `src/lib/server/api/base.ts` — `publicProcedure` has no Origin validation. File: `src/routes/rpc/[...rest]/+server.ts` — handler accepts any request.

## oRPC Call Helper

```typescript
async function rpcCall(page, path, input) {
  return await page.evaluate(
    async ({ path, input }) => {
      const r = await fetch(`/rpc/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: input }),
      });
      return { status: r.status, body: await r.json() };
    },
    { path, input }
  );
}
```

## oRPC Path Examples

- `studySet.get` — `{"json": {"id": "sts_..."}}`
- `studySet.create` — `{"json": {"title": "...", "description": "...", "visibility": "PUBLIC"}}`
- `studySet.update` — `{"json": {"id": "sts_...", "title": "..."}}`
- `studySet.delete` — `{"json": {"id": "sts_..."}}`
- `studySet.list` — `{"json": {}}`
- `chapter.list` — `{"json": {"studySetId": "sts_..."}}`
- `flashcard.list` — `{"json": {"studySetId": "sts_..."}}`
- `flashcard.create` — `{"json": {"studySetId": "sts_...", "chapterId": "chp_...", "front": "...", "back": "..."}}`
- `flashcardSession.session.getOrCreate` — `{"json": {"studySetId": "sts_..."}}`

## oRPC Protocol

- **URL pattern**: `POST /rpc/<procedure_path>` with `{"json": <input_data>}`
- **Path separator**: `/` not `.` (e.g., `studySet/get`, `chapter/list`, `studySet.admin/cleanupVisits`)
- **Responses**: oRPC wraps in specific format — check `.json` property
- **Procedure tiers**: `publicProcedure` (no auth), `authorizedProcedure` (requires session), `adminProcedure` (requires admin role)

## Resource Access Control

| Resource  | Read                                                 | Create                  | Update                  | Delete                                |
| --------- | ---------------------------------------------------- | ----------------------- | ----------------------- | ------------------------------------- |
| StudySet  | Visible to owner + public users; private → NOT_FOUND | Owner only              | Owner check → FORBIDDEN | Owner check → NOT_FOUND (soft delete) |
| Chapter   | Via studySet visibility                              | Owner check             | Owner check             | Owner check                           |
| Flashcard | Via studySet visibility                              | Owner check             | Owner check             | Owner check                           |
| Quiz      | Via studySet visibility                              | Owner check             | Owner check             | Owner check                           |
| Session   | User's own sessions only                             | Via studySet visibility | N/A                     | N/A                                   |

## Better Auth Endpoint Discovery

```bash
for path in sign-in/email sign-up/email get-session sign-out list-accounts change-password update-user change-email forget-password revoke-sessions admin/list-users verify-email reset-password; do
  echo -n "/api/auth/$path: "
  curl -s -o /dev/null -w "HTTP %{http_code}\n" "https://stagging.sinnau.com/api/auth/$path"
done
```

## NOTES_MD: oRPC Call Helper

Use `page.evaluate()` with fetch for oRPC calls. Path uses `/` separator, not `.`:

```typescript
async function rpcCall(page, path, input) {
  const r = await page.evaluate(
    async (args) => {
      const [path, input] = args;
      const response = await fetch(`/rpc/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: input }),
      });
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        return { status: response.status, text: text.substring(0, 500) };
      }
    },
    [path, input]
  );
  return r;
}
```

## NOTES_MD: oRPC Path Mapping

Nested routers map to nested paths separated by `/`:

- `studySet.router.create` → `/rpc/studySet/create`
- `studySet.admin.cleanupVisits` → `/rpc/studySet/admin/cleanupVisits`
- `flashcardSession.session.get` → `/rpc/flashcardSession/session/get`
- `flashcardSession.session.getOrCreate` → `/rpc/flashcardSession/session/getOrCreate`
- `flashcardSession.review.submit` → `/rpc/flashcardSession/review/submit`
- `quizSession.list` → `/rpc/quizSession/list`
- `plan.admin.grantPlan` → `/rpc/plan/admin/grantPlan`
- `studySetSearch.search` → `/rpc/studySetSearch/search`
- `studySet.visit.refresh` → `/rpc/studySet/visit/refresh`

## NOTES_MD: Study Set Access Control

- **PUBLIC**: Readable/searchable by any authenticated user; full content (chapters, flashcards, queue) visible
- **PRIVATE**: Invisible to non-owners (returns NOT_FOUND) — not even existence is revealed
- **Update**: Returns FORBIDDEN for non-owners
- **Delete**: Returns NOT_FOUND for non-owners (hides existence)
- **Search**: Only PUBLIC study sets appear in results

## NOTES_MD: Session Access Control

- **Flashcard sessions (fse\_*)**: Strictly user-scoped; non-owners get NOT_FOUND on get/submit/list
- **Quiz sessions (qse\_*)**: Strictly user-scoped; non-owners get NOT_FOUND on get/list/getQuestions/complete/submitAnswer
- **List operations**: Only return the calling user's own sessions

## NOTES_MD: Error Code Inconsistency (Low)

`studySet.update` returns FORBIDDEN; `studySet.delete` returns NOT_FOUND for the same non-owned resource.
This allows an attacker to distinguish "resource exists but not owned" vs "resource doesn't exist" by comparing responses:

- UPDATE on existing non-owned → FORBIDDEN
- UPDATE on non-existent → BAD_REQUEST (ID validation error)
- DELETE on existing non-owned → NOT_FOUND
- DELETE on non-existent → NOT_FOUND (consistent, no leak)

## NOTES_MD: Session Revocation

Session revocation endpoints all work:

- `POST /api/auth/revoke-other-sessions` — revokes all sessions except current
- `POST /api/auth/revoke-sessions` — revokes ALL sessions (current included)
- `POST /api/auth/revoke-session` — revoke specific session (requires `{token}` body)
- After revocation, `get-session` returns `null` and `list-sessions` returns 401
- Session token (ID portion) is exposed in `get-session`/`list-sessions` JSON responses
- No session management UI page exists (404)

## NOTES_MD: Password Change — Session NOT Invalidated

`POST /api/auth/change-password` accepts `{currentPassword, newPassword}` and returns `{token: null, user: {...}}`. After success:

- Existing sessions remain **fully valid** (7-day expiry continues)
- `POST /api/auth/change-email` returns 400 "Change email is disabled"
- This means a stolen session cookie survives password change

## NOTES_MD: Cookie Theft Impact (Simulated)

Stolen `__Secure-better-auth.session_token` cookie replayed from new context:

- `get-session`: 200 → session recognized
- `/rpc/*` oRPC endpoints: 401 → protected
- `/api/auth/sign-out`: 200 → attacker can log victim out (DoS)
- `/api/auth/change-password`, `update-user`, `change-email`: all 401
- SvelteKit pages (`/home`, etc.): redirect to login
- Limitation: cookie is httpOnly, so JS can't steal it; MITM/proxy/phishing required

## NOTES_MD: Session Data Integrity

`POST /api/auth/update-user` only allows:

- `name`: 200 (updatable)
- `role`, `emailVerified`, `banned`, `impersonatedBy`: all 400 "FIELD_NOT_ALLOWED" or "No fields to update"
- `POST /api/auth/update-session`: 400 "No fields to update"
- Sensitive fields are properly protected server-side

## NOTES_MD: CORS / Cross-Origin

- No `Access-Control-Allow-Origin` header on any response
- Cross-origin `fetch` with credentials fails (TypeError: Failed to fetch)
- `SameSite=Lax` on session cookie prevents CSRF via top-level navigations
- oRPC has no Origin validation, but same-origin policy + SameSite blocks external attacks

## NOTES_MD: Deep Session Security Test Script

For re-running or extending session tests:

```javascript
// Uses playwright-core from project node_modules
const {
  chromium,
} = require("/home/kevin/Repositories/2sinnau/node_modules/.pnpm/playwright-core@1.61.1/node_modules/playwright-core");
// Browser path: /home/kevin/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome
```

Key patterns:

- `context.cookies()` to extract session cookie
- `context.addCookies()` to simulate cookie theft
- `page.evaluate()` with `fetch()` for API calls (sends cookies automatically)
- Separate contexts for simulating different users/sessions

## NOTES_MD: API Key Test Call Helper

```typescript
async function apiKeyTest(page, method, path, body?, credentials?) {
  return await page.evaluate(
    async (args) => {
      const [method, path, body, credentials] = args;
      const res = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
        credentials: credentials ?? "include",
      });
      const text = await res.text();
      try {
        return { status: res.status, body: JSON.parse(text) };
      } catch (e) {
        return { status: res.status, text: text.substring(0, 200) };
      }
    },
    [method, path, body, credentials]
  );
}
```

## NOTES_MD: API Key Security Findings (T3.2)

### API Key Endpoints (all under `/api/auth/`)

| Endpoint          | Method | Auth Required | Status            |
| ----------------- | ------ | ------------- | ----------------- |
| `api-key/create`  | POST   | Yes (session) | 200               |
| `api-key/list`    | GET    | Yes (session) | 200               |
| `api-key/get?id=` | GET    | Yes (session) | 200               |
| `api-key/update`  | POST   | Yes (session) | 200               |
| `api-key/delete`  | POST   | Yes (session) | 200               |
| `api-key/verify`  | POST   | —             | 404 (not exposed) |

### Known Parameter Mappings

- **create**: body `{name}` required. Optional: `expiresIn`, `rateLimitMax`, `rateLimitTimeWindow`
- **get**: query `id` (NOT `keyId`)
- **update**: body `{keyId, name}` (`keyId` NOT `id`)
- **delete**: body `{keyId}` (`keyId` NOT `id`)

### Key Security Properties

- List/Get responses omit `key` field (type `Omit<ApiKey, "key">[]`) — no leakage ✅
- Cross-user access blocked (404 `KEY_NOT_FOUND` for any operation on another user's key ID) ✅
- No limit on number of keys per user (tested 20+ without rejection)
- Key value returned only in create response (single exposure)
- Rate limit defaults: `rateLimitMax: 10` per `rateLimitTimeWindow: 86400000ms` (24h) per key

### VULN-01 (Medium): API Key Authentication Disabled

`apiKey({})` in `config.ts` does NOT set `enableSessionForAPIKeys: true`. API keys can be created and managed but cannot be used for authentication:

- `Authorization: Bearer <key>` → not recognized
- `x-api-key: <key>` → not recognized
- `auth.api.getSession({headers})` in `hooks.server.ts` only checks session cookies
- No middleware converts API key → session for oRPC `authorizedProcedure`

To fix: `apiKey({enableSessionForAPIKeys: true})` per [Better Auth docs](https://www.better-auth.com/docs/plugins/api-key/advanced#enable-session-creation-for-api-keys-in-better-auth).

### VULN-02 (Low): No API Key Creation Limit

No server-side limit on number of API keys per user. Tested 20+ consecutive creates without rejection. Requires valid session to exploit.

### VULN-03 (Info): Verify Endpoint Not Exposed

`POST /api-key/verify` returns 404. The `verifyApiKey` function is registered as `createAuthEndpoint.serverOnly()` (not an HTTP endpoint) at `src/routes/verify-api-key.ts`. It's only callable programmatically within the server. If API key auth is enabled in future, this endpoint will need to be exposed for external consumers.

## T3.2 — API Key Plugin Deep-Dive Results

### 1. Verify Endpoint Tests (Empirical)

All verify/validate endpoints return 404:

| Endpoint                          | Method | Status |
| --------------------------------- | ------ | ------ |
| `/api/auth/api-key/verify`        | POST   | 404    |
| `/api/auth/api-key/verify`        | GET    | 404    |
| `/api/auth/api-key/verify?key=`   | GET    | 404    |
| `/api/auth/api-key/verify-key`    | POST   | 404    |
| `/api/auth/api-key/validate?key=` | GET    | 404    |

**Root cause**: `verifyApiKey` in the source (`@better-auth/api-key/dist/index.mjs:1951`) is created with `createAuthEndpoint.serverOnly()`. It's NOT registered as an HTTP-accessible route — only callable programmatically from Node.js server code.

### 2. API Key Authentication Tests (All Fail)

API key authentication is **completely disabled** because `enableSessionForAPIKeys` defaults to `false`:

| Method                              | Endpoint                    | Status Response           |
| ----------------------------------- | --------------------------- | ------------------------- |
| `Authorization: Bearer <key>`       | `GET /api/auth/get-session` | 200 → `null` (no session) |
| `x-api-key: <key>`                  | `GET /api/auth/get-session` | 200 → `null` (no session) |
| Cookie `better-auth-api-key: <key>` | `GET /api/auth/get-session` | 200 → `null` (no session) |
| `Authorization: Bearer <key>`       | `POST /rpc/studySet/list`   | 401                       |

**Root cause** — `findApiKeyAndConfig()` in `@better-auth/api-key/dist/index.mjs:2309`:

```javascript
function findApiKeyAndConfig(ctx) {
  for (const config of configurations) {
    if (!config.enableSessionForAPIKeys) continue; // ← skips all configs
    // ... never reached
  }
  return null;
}
```

The `apiKey({})` in `config.ts` does not set `enableSessionForAPIKeys: true`, so the `before` hook that creates sessions from API keys is never triggered.

### 3. Codebase API Key Usage Analysis

**Auth config** (`src/lib/server/infras/auth/config.ts`):

```typescript
apiKey({}),  // line 22 — no options, all defaults
```

- `enableSessionForAPIKeys` → not set → default `false`
- `apiKeyHeaders` → not set → default `"x-api-key"`
- `rateLimit.enabled` → not set → default `true`
- `rateLimit.timeWindow` → not set → default `86400000ms` (24h)
- `rateLimit.maxRequests` → not set → default `10`
- `keyExpiration.defaultExpiresIn` → not set → default `null` (no expiry)
- `keyExpiration.minExpiresIn` → not set → default `1` day
- `keyExpiration.maxExpiresIn` → not set → default `365` days
- `storage` → not set → default `"database"`
- `disableKeyHashing` → not set → default `false`

**Hooks server** (`src/hooks.server.ts`):

```typescript
// line 30 — only checks session cookies, NO API key middleware
const session = await auth.api.getSession({ headers: event.request.headers });
```

No middleware converts API key → session for oRPC `authorizedProcedure`.

### 4. Rate Limit Tests

Rate limiting on API keys is **implemented in code but has NO effect** because API key auth is disabled. The rate limit logic in `evaluateRateLimit()` (line 1582) only runs during the `before` hook when `enableSessionForAPIKeys` is true — which it isn't.

**Current rate limit defaults**: `maxRequests: 10` per `timeWindow: 86400000ms` (24h) per key.

**Bulk creation demonstrates no rate limit bypass concern**: 25+ keys created without rejection. No creation limit per user.

### 5. Admin Endpoint + API Key Tests

| Endpoint                         | With API Key (no session) | With Session (non-admin)             |
| -------------------------------- | ------------------------- | ------------------------------------ |
| `GET /api/auth/admin/list-users` | 401                       | 403                                  |
| `POST /rpc/plan/admin/grantPlan` | 401                       | 401 (already fails at session layer) |

API keys do NOT bypass admin checks because they can't authenticate at all. When used with a valid session but non-admin role, admin endpoints correctly return 403.

### 6. Expiry Analysis

| Feature                          | Behavior                                                    |
| -------------------------------- | ----------------------------------------------------------- |
| `expiresIn` < 86400 (1 day)      | REJECTED — `EXPIRES_IN_IS_TOO_SMALL` (minExpiresIn = 1 day) |
| `expiresIn: 86400` (1 day)       | ACCEPTED — `expiresAt` set to tomorrow                      |
| No `expiresIn`                   | ACCEPTED — `expiresAt: null` (never expires)                |
| `expiresIn: 31536000` (365 days) | Max allowed (maxExpiresIn = 365)                            |

Expiry enforcement only applies during API key validation — which is disabled. Keys with past `expiresAt` remain in the database until `deleteAllExpiredApiKeys` runs (called on create/get/list/update/delete operations, guarded by a 10s debounce).

### 7. Server-Side API Key Usage (Dash Plugin)

`dash()` plugin at `src/lib/server/infras/auth/config.ts:26`:

```typescript
dash({
  apiKey: process.env.BETTER_AUTH_API_KEY ?? "",
});
```

**This is COMPLETELY SEPARATE** from user API keys. The `@better-auth/infra` dash plugin uses `BETTER_AUTH_API_KEY` for:

- Sentinel password breach detection (line 1222: HMAC hash)
- Events API (lines 3561-3758: HTTP Bearer auth to Better Auth infra)
- SMS sending via Dash (line 8350: `Authorization: Bearer ${apiKey}`)

The dash API key is a **server-to-server credential** between this app and Better Auth's infrastructure. It's NOT related to user API key management. The `.env.example` has it as empty — it's optional.

### 8. Vulnerabilities Found

#### VULN-01 (Medium): API Key Authentication Disabled (CONFIRMED)

`apiKey({})` missing `enableSessionForAPIKeys: true`. Keys can be created but cannot authenticate. Same as subagent 1 finding — now confirmed via empirical testing:

- `Authorization: Bearer <key>` → null session
- `x-api-key: <key>` → null session
- Cookie `better-auth-api-key: <key>` → null session

#### VULN-02 (Low): No API Key Creation Limit (CONFIRMED)

28 keys created by one user without rejection. No server-side cap.

#### VULN-03 (Info): Verify Endpoint Not Exposed (CONFIRMED)

`verifyApiKey` is `serverOnly` — all verify endpoints return 404.

#### VULN-04 (Info): Expired Keys Not Cleaned Promptly

`deleteAllExpiredApiKeys` has a 10-second debounce. Keys that expire between checks remain in DB. No security impact (auth is disabled), but if enabled in future, timing window for expired key reuse exists.

#### VULN-05 (Info): Dash API Key Optional, Falls Back to Empty String

`process.env.BETTER_AUTH_API_KEY ?? ""` — the dash plugin silently degrades when no key is configured. Sentinel skips password breach detection; events API throws `INTERNAL_SERVER_ERROR` if called. Not exploitable — the dash plugin is server-to-server only.

### 9. CRUD Operations (Empirically Verified)

All CRUD operations work correctly with session auth:

| Operation            | Endpoint                        | Status | Notes                             |
| -------------------- | ------------------------------- | ------ | --------------------------------- |
| CREATE               | `POST /api/auth/api-key/create` | 200    | Returns full key value only once  |
| LIST                 | `GET /api/auth/api-key/list`    | 200    | `key` field omitted from response |
| GET                  | `GET /api/auth/api-key/get?id=` | 200    | `key` field omitted from response |
| UPDATE               | `POST /api/auth/api-key/update` | 200    | updates name, enabled, etc.       |
| DELETE               | `POST /api/auth/api-key/delete` | 200    | `{success: true}`                 |
| DELETE (nonexistent) | `POST /api/auth/api-key/delete` | 404    | `KEY_NOT_FOUND`                   |
| CREATE (no auth)     | `POST /api/auth/api-key/create` | 401    | Properly guarded                  |
| LIST (no auth)       | `GET /api/auth/api-key/list`    | 401    | Properly guarded                  |

**Key leaks**: `key` value is ONLY returned in CREATE response. LIST and GET omit the `key` field. Verified: API key `WnKWQl...` not leaked in subsequent list/get responses. ✅

**Cross-user access**: Deleting/getting another user's key ID returns `KEY_NOT_FOUND` (404). Same as finding user ID exposes no information. ✅

### 10. Key Properties (Empirically Verified)

| Property                                    | Default from `apiKey({})` | Verified                            |
| ------------------------------------------- | ------------------------- | ----------------------------------- |
| `enableSessionForAPIKeys`                   | `false`                   | ✅ Auth disabled                    |
| `apiKeyHeaders`                             | `"x-api-key"`             | ✅ Not recognized                   |
| `rateLimit.enabled`                         | `true`                    | ✅ In code, no effect               |
| `rateLimit.maxRequests`                     | `10`                      | ✅ In code                          |
| `rateLimit.timeWindow`                      | `86400000ms` (24h)        | ✅ In code                          |
| `keyExpiration.defaultExpiresIn`            | `null` (no expiry)        | ✅ Verified                         |
| `keyExpiration.minExpiresIn`                | `1` day                   | ✅ 3600s rejected                   |
| `keyExpiration.maxExpiresIn`                | `365` days                | ✅ In code                          |
| `defaultKeyLength`                          | 64 chars                  | ✅ Created keys are 64 chars        |
| `storage`                                   | `"database"`              | ✅ Keys persisted across operations |
| `disableKeyHashing`                         | `false`                   | ✅ Keys are SHA-256 hashed          |
| `startingCharactersConfig.charactersLength` | 6 chars                   | ✅ `start` field is 6 chars         |

## NOTES_MD: API Key Verify Endpoint Source Location

- `@better-auth/api-key/dist/index.mjs:1951` — `verifyApiKey` is `createAuthEndpoint.serverOnly()` (not HTTP-exposed)
- `@better-auth/api-key/dist/index.mjs:2309` — `findApiKeyAndConfig` skips configs where `enableSessionForAPIKeys` is false
- `@better-auth/api-key/dist/index.mjs:2285` — `enableSessionForAPIKeys` defaults to `false`
- `@better-auth/api-key/dist/index.mjs:2260` — default API key header is `x-api-key`
