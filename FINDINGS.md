# Security Research Findings — stagging.sinnau.com

---

## T3.3 — Open Redirect ✅

### Summary

**No open redirect vulnerabilities found.** Better Auth validates callbackURL against trusted origins (same-origin only). SvelteKit redirects are hardcoded in `hooks.server.ts`. Login form ignores redirect query params.

### Verified

| Vector                                    | Status                                  |
| ----------------------------------------- | --------------------------------------- |
| Better Auth callbackURL external redirect | ✅ Protected (403 INVALID_CALLBACK_URL) |
| URL parser differential bypass            | ✅ Not exploitable                      |
| Login form redirect params                | ✅ Ignored by server                    |
| SvelteKit hooks redirect                  | ✅ Hardcoded strings                    |
| OAuth callback redirect                   | ✅ Validated                            |
| CRLF / Header injection                   | ✅ Not found                            |

---

## T4.1 — HTTPS & TLS ✅

### Summary

HTTPS configuration is modern (TLSv1.3, HTTP/3, post-quantum key exchange) **except** HSTS header is missing.

| Check               | Status                    |
| ------------------- | ------------------------- |
| HTTP→HTTPS redirect | ✅ 301 permanent redirect |
| HSTS header         | ❌ **Missing**            |
| Mixed content       | ✅ None detected          |
| TLS version         | ✅ TLSv1.3                |
| HTTP/3 (alt-svc)    | ✅ h3 advertised          |

### Recommendations

Add `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` at Cloudflare edge.

---

## T4.2 — Registration Policy ✅

### Findings

| #   | Issue                                  | Severity   | Detail                                                          |
| --- | -------------------------------------- | ---------- | --------------------------------------------------------------- |
| 1   | **Whitespace-only passwords accepted** | **HIGH**   | 8 spaces is a valid password                                    |
| 2   | **No password complexity**             | **HIGH**   | `abcdefgh` accepted — no uppercase, number, or special required |
| 3   | **Password spaces not trimmed**        | **MEDIUM** | `password123` stores spaces; login requires exact match         |
| 4   | **No email verification**              | **MEDIUM** | `emailVerified: true` at sign-up — accounts immediately usable  |
| 5   | **XSS in name stored in DB**           | **LOW**    | Mitigated by Svelte auto-escaping                               |
| 6   | **Email local part up to 256 chars**   | **LOW**    | Accepted per RFC but potential storage concern                  |

### Verified Working

- Case-insensitive email dedup ✅
- Unicode emails rejected ✅
- Rate limiting active (8 req/window) ✅
- Client-side validation for min/max lengths ✅
- Host origin validated for registration ✅

### Recommendations

1. Add password complexity (uppercase, number, min ~10 chars)
2. Reject whitespace-only passwords
3. Trim leading/trailing whitespace from passwords
4. Consider email verification flow
5. Sanitize name field server-side

---

### Summary

API key plugin is **half-implemented**. Keys can be created and managed through CRUD endpoints but cannot authenticate requests because `enableSessionForAPIKeys` is not set.

### Findings

| #   | Issue                                | Severity   | Detail                                                                                                    |
| --- | ------------------------------------ | ---------- | --------------------------------------------------------------------------------------------------------- |
| 1   | **API key authentication disabled**  | **MEDIUM** | `apiKey({})` defaults `enableSessionForAPIKeys: false` — keys created but cannot authenticate any request |
| 2   | **No API key creation limit**        | **LOW**    | 28+ keys created without rejection                                                                        |
| 3   | **Verify endpoint not HTTP-exposed** | **INFO**   | `verifyApiKey` is server-only, not accessible via HTTP                                                    |

### Verified Working

| Property            | Status                                                        |
| ------------------- | ------------------------------------------------------------- |
| Key value leakage   | ✅ Only returned in CREATE response                           |
| Cross-user access   | ✅ Returns `KEY_NOT_FOUND`                                    |
| Key hashing at rest | ✅ SHA-256 hashed before storage                              |
| CRUD auth           | ✅ Requires session (401 without)                             |
| Default security    | ✅ `enableSessionForAPIKeys` being false prevents auth bypass |

### Recommendations

1. Either enable API key authentication: `apiKey({enableSessionForAPIKeys: true})` + add middleware in `hooks.server.ts` to check `Authorization: Bearer` header
2. Or remove the plugin entirely if not needed (cleaner than dead code)
3. Add a per-user API key creation limit if the feature is enabled
4. Document the intended API key flow in SPECS.md

---

### Summary

Session security is generally solid (HMAC validation, proper logout invalidation, secure cookie attributes) **except** for a critical gap: password changes don't invalidate existing sessions.

### Findings

| #   | Issue                                           | Severity   | Detail                                                                                                                      |
| --- | ----------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Password change doesn't invalidate sessions** | **HIGH**   | `POST /api/auth/change-password` returns 200 but all existing sessions remain valid. Stolen cookie survives password change |
| 2   | **No concurrent session limit**                 | **MEDIUM** | Unlimited concurrent sessions allowed by default                                                                            |
| 3   | **Stolen cookie enables victim sign-out**       | **MEDIUM** | Attacker can call `POST /api/auth/sign-out` to log out the real user                                                        |
| 4   | **Session token (ID only) leaked in API body**  | **LOW**    | `get-session` and `list-sessions` return session ID (no HMAC)                                                               |
| 5   | **Long-lived sessions (7 days)**                | **LOW**    | No refresh, no Remember Me option. 7-day window for stolen cookies                                                          |
| 6   | **Concurrent sign-up TOCTOU race**              | **LOW**    | Same email → one succeeds, others get 422                                                                                   |

### Verified Working

| Test                       | Result                                            |
| -------------------------- | ------------------------------------------------- |
| Session fixation           | ✅ No pre-auth session                            |
| Token tampering            | ✅ HMAC-SHA256 validated — 401 on tampered tokens |
| Logout invalidation        | ✅ Server-side invalidation, cookie cleared       |
| Session fingerprinting     | ✅ Data collected (ipAddress, userAgent)          |
| Cookie attributes          | ✅ httpOnly, Secure, SameSite=Lax                 |
| Cross-origin cookie access | ✅ Blocked (no CORS + SameSite=Lax)               |
| Session data integrity     | ✅ `role`, `emailVerified`, `banned` protected    |
| Race conditions            | ✅ No race issues on session operations           |
| Browser storage            | ✅ No session data in localStorage/sessionStorage |

### Recommendations

1. **Invalidate all existing sessions on password change** — add `revokeOtherSessions: true` or similar to Better Auth change-password handler
2. **Add concurrent session limit** or "revoke other sessions" option on login
3. **Consider shorter session expiry** or add sliding expiration
4. **Add UI for session management** (view/revoke sessions)
5. **Remove session ID from API responses** where not needed

---

### Summary

**No SQL injection vulnerabilities found.** Three-layer defense (Valibot validation → FTS5 phrase sanitizer → Drizzle parameterization) comprehensively prevents SQL injection.

### Defense Layers

| Layer                    | Detail                                                                                                        | Status    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- | --------- |
| Valibot input validation | Strict regex ID formats (`/^sts_[a-z0-9]{2}[a-zA-Z0-9]{16}$/u`), min/max length, enum validation, type checks | ✅ Active |
| FTS5 phrase sanitizer    | `sanitizeFts5Query()` wraps input in `"..."` phrase syntax, escapes embedded quotes                           | ✅ Active |
| Drizzle parameterization | `sql` tagged template converts `${...}` to `?` placeholders                                                   | ✅ Active |

### Test Coverage

| Area                  | Payloads                                                       | Result                                         |
| --------------------- | -------------------------------------------------------------- | ---------------------------------------------- |
| FTS5 search query     | 30+ payloads (SQLi, FTS5 syntax, fuzz, unicode)                | ✅ All handled safely                          |
| Limit parameter       | 10 payloads (float, negative, SQLi, string)                    | ✅ Silently ignored (oRPC strips extra fields) |
| oRPC endpoint IDs     | SQLi in `studySet.get`, `chapter.list`, `flashcard.list`       | ✅ 400 — strict regex                          |
| oRPC string fields    | SQLi in `studySet.create` title, `flashcard.create` front/back | ✅ Stored as literal text (parameterized)      |
| Better Auth           | SQLi in email/name                                             | ✅ 400 email validation / stored safely        |
| Second-order SQLi     | SQLi payload in user name → re-used in later queries           | ✅ No unsafe interpolation                     |
| Data type injection   | Object/array/null for scalar fields                            | ✅ 400 validation errors                       |
| Time-based blind SQLi | Timing comparison across payloads                              | ✅ No timing oracle (~48-54ms)                 |
| Error-based SQLi      | $500 error trigger, SQLite error leaks                         | ✅ No 500s, no SQL errors leaked               |

### Recommendations

1. Maintain current defense layers (validation + parameterization + sanitization)
2. Consider adding `limit` as a validated input field instead of silently ignoring it

---

### Summary

**No XSS vulnerabilities found.** The app is well-protected by SvelteKit's auto-escaping. All user-generated content (study set titles, descriptions, flashcard content, quiz questions, user names) is stored unsanitized but rendered via safe template expressions.

### Findings

| Vector                                      | Vulnerable? | Detail                                       |
| ------------------------------------------- | ----------- | -------------------------------------------- |
| Stored XSS (study set, flashcards, quizzes) | ❌ No       | Auto-escaped by Svelte `{variable}`          |
| Stored XSS (user name)                      | ❌ No       | Auto-escaped on all pages                    |
| Reflected XSS (URL params)                  | ❌ No       | URL params not rendered in HTML              |
| Reflected XSS (headers)                     | ❌ No       | Headers not reflected in response body       |
| mXSS                                        | ❌ No       | No `{@html}` re-processing                   |
| Svelte template injection                   | ❌ No       | `{{2+2}}` rendered as literal text           |
| DOM-based XSS                               | ❌ No       | No `innerHTML`, `eval()`, `document.write()` |
| File upload XSS                             | ❌ No       | No file upload endpoints                     |
| SSR `__data.json`                           | ❌ No       | JSON-escaped (Unicode escape sequences)      |

### Warning

All XSS payloads are accepted and stored by APIs without sanitization. **Any future code change that introduces `{@html}` or `innerHTML` on user-supplied data would create an instant exploitable XSS vulnerability.**

### Recommendations

1. Add CSP header for defense-in-depth (even though no XSS found)
2. Consider input sanitization for stored content (defense-in-depth)
3. Maintain the "no `{@html}`" policy in code reviews

---

### Summary

Better Auth CSRF works correctly (Origin/Referer validation). **oRPC has zero CSRF protection** — mitigated only by SameSite=Lax on the session cookie. No practical browser-based CSRF exploitation currently possible, but the architectural gap is significant.

### Findings

| #   | Issue                                    | Severity   | Detail                                                                                                           |
| --- | ---------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------- |
| 1   | **oRPC has no CSRF protection**          | **HIGH**   | All `/rpc/*` state-changing endpoints accept any Origin/Referer. No Origin validation middleware exists          |
| 2   | **SameSite=Lax is sole protection**      | **MEDIUM** | If SameSite is weakened (subdomain compromise, browser bug, `SameSite=None`), all oRPC endpoints are exploitable |
| 3   | **Top-level GET info disclosure**        | **LOW**    | Attacker can `window.open()` authenticated pages — user data returned via SameSite=Lax GET                       |
| 4   | **`trustedOrigins: () => []` style**     | **INFO**   | Works correctly in production (returns empty array), but confusing pattern                                       |
| 5   | **No oRPC Origin validation middleware** | **INFO**   | `base.ts:publicProcedure` has no Origin check; `+server.ts` accepts any request                                  |

### Verified Working

| Protection                            | Status                                                |
| ------------------------------------- | ----------------------------------------------------- |
| Better Auth Origin/Referer validation | ✅ 403 for cross-origin POST                          |
| SameSite=Lax on session cookie        | ✅ Verified — blocks cross-origin cookie transmission |
| CORS headers                          | ✅ None set — browser blocks JS fetch cross-origin    |
| SvelteKit default CSRF                | ✅ N/A (no form actions on tested routes)             |
| Cookie-less state changes             | ✅ Blocked — 401 UNAUTHORIZED                         |

### Recommendations

1. **Add Origin validation middleware to oRPC** in `src/lib/server/api/base.ts` — validate Origin header against app origin
2. **Consider `SameSite=Strict`** for the session cookie
3. **Add CSRF token layer** for defense-in-depth on state-changing oRPC endpoints
4. **Fix `trustedOrigins` style** for clarity: `trustedOrigins: dev ? ["*://*"] : []`

---

### Summary

Several information disclosure vectors identified. Most are low-to-medium severity. No critical data (passwords, keys, secrets) found exposed.

### Findings

| #   | Issue                                            | Severity   | Detail                                                                                          |
| --- | ------------------------------------------------ | ---------- | ----------------------------------------------------------------------------------------------- |
| 1   | **Email enumeration via duplicate registration** | **HIGH**   | 422 `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL` — allows checking if email is registered            |
| 2   | **oRPC schema leakage**                          | **MEDIUM** | Full valibot validation schemas exposed in 400 errors: regex patterns, field names, constraints |
| 3   | **ownerId exposure in search results**           | **MEDIUM** | `studySetSearch.search` returns `ownerId` in every result — maps users to content               |
| 4   | **Session token in API response body**           | **LOW**    | `get-session` and `list-sessions` return raw token value in JSON                                |
| 5   | **User data in 404 error pages**                 | **LOW**    | Full user object embedded in SvelteKit 404 error HTML                                           |
| 6   | **Subscription plan data via `__data.json`**     | **LOW**    | `/subs/plans/__data.json` exposes all pricing tiers, discounts, features (no auth)              |
| 7   | **Version info disclosure**                      | **LOW**    | `/api/version` returns buildDate, SHA, version (no auth) + custom headers                       |
| 8   | **Admin procedure discovery**                    | **LOW**    | 403 responses confirm existence of `plan/admin/grantPlan`, `studySet/admin/cleanupVisits`       |
| 9   | **Verify email param disclosure**                | **LOW**    | `/api/auth/verify-email` leaks expected query param name `token`                                |
| 10  | **Custom headers leak**                          | **INFO**   | `x-powered-by: Sinnau`, `x-sinnau-sha`, `x-sinnau-version`, `x-ily: ANA`                        |

### Not Vulnerable (Verified)

| Test                            | Result                                                     |
| ------------------------------- | ---------------------------------------------------------- |
| Source map exposure             | All `.map` files 404                                       |
| Hardcoded secrets in JS bundles | None found                                                 |
| 500 error triggering            | All inputs return clean 400/401/404                        |
| Timing oracle                   | studySet.get timing indistinguishable (51ms vs 50ms)       |
| Session/account IDOR            | `list-sessions` and `list-accounts` scoped to calling user |
| SvelteKit client-side data      | `window.__sveltekit` properly cleaned up                   |

### Recommendations

1. Change duplicate registration error: return generic "Registration failed" instead of "User already exists"
2. Remove `ownerId` from search results or restrict to admin-only in API responses
3. Add generic error messages for oRPC validation failures (don't leak schema internals)
4. Remove or rate-limit `/api/version` endpoint
5. Remove custom info headers (`x-powered-by`, `x-sinnau-sha`, `x-sinnau-version`)
6. Add auth check or obfuscate `__data.json` endpoint data
7. Strip user data from 404 error page HTML

---

### Summary

Access control is **strong overall**. The layered guard/service/repository architecture correctly enforces ownership and visibility. No exploitable IDOR vulnerabilities found.

### Findings

| #   | Issue                                    | Severity | Detail                                                                                                                                                                  |
| --- | ---------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Error code inconsistency**             | **LOW**  | `studySet.update` returns `FORBIDDEN` for non-owned resource, `studySet.delete` returns `NOT_FOUND`. Attacker can distinguish "exists but not owned" vs "doesn't exist" |
| 2   | **Missing guard call in ChapterService** | **LOW**  | `ChapterService.getChaptersByStudySet()` bypasses guard layer. Currently compensated by repository SQL visibility filter, but design smell                              |
| 3   | **Cross-user visit tracking**            | **INFO** | `studySet.visit.refresh` works cross-user on PUBLIC study sets — visit counts inflatable                                                                                |
| 4   | **Search metadata exposure**             | **INFO** | Public study set titles, descriptions, slugs, owner IDs exposed via search — by design                                                                                  |

### Test Coverage

| Area                                   | Result                                |
| -------------------------------------- | ------------------------------------- |
| URL-based access (private study sets)  | `NOT_FOUND` ✓                         |
| oRPC query access (private study sets) | `NOT_FOUND` ✓                         |
| oRPC mutation access (non-owned)       | `FORBIDDEN` or `NOT_FOUND` ✓          |
| oRPC admin procedures (non-admin)      | `FORBIDDEN` ✓                         |
| oRPC authorized procedures (no auth)   | `UNAUTHORIZED` ✓                      |
| Public study set visibility            | Accessible to all ✓                   |
| Session IDOR (flashcard + quiz)        | `NOT_FOUND` for non-owners ✓          |
| Search leakage (private study sets)    | Not exposed ✓                         |
| Generate endpoint access control       | `NOT_FOUND` for private ✓             |
| Pagination scoping                     | Properly scoped to user ✓             |
| Role tampering                         | Opaque HMAC tokens — not tamperable ✓ |

### Recommendations

1. Fix error code inconsistency: return `NOT_FOUND` for both `update` and `delete` on non-owned resources
2. Add `guard.assertStudySetVisibleOrNotFound()` call to `ChapterService.getChaptersByStudySet()`
3. Consider rate-limiting the visit tracking endpoint

---

### Summary

7/7 auth areas tested. Authentication is reasonably secure with some config gaps.

### Findings

| #   | Issue                                              | Severity   | Detail                                                                                                                |
| --- | -------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------- |
| 1   | **confirmPassword not enforced server-side**       | **HIGH**   | Direct API call (`/api/auth/sign-up/email`) with mismatched passwords still registers the user                        |
| 2   | **No security headers (CSP, HSTS, XFO, XCTO)**     | **HIGH**   | Same as T1.1 — systemic gap                                                                                           |
| 3   | **Rate limiting lacks Retry-After headers**        | **MEDIUM** | Uses wrong Content-Type (`text/plain` vs `application/json`), missing `X-RateLimit-*` headers                         |
| 4   | **Weak password policy**                           | **LOW**    | 8-character minimum only, no complexity requirements                                                                  |
| 5   | **User enumeration via timing**                    | **LOW**    | ~0.28s avg timing difference between existing user + wrong password vs non-existent user (mitigated by rate limiting) |
| 6   | **`last_used_login_method` cookie lacks httpOnly** | **LOW**    | `better-auth.last_used_login_method` readable by JS                                                                   |
| 7   | **Multi-session allowed**                          | **INFO**   | No session invalidation on new login — design choice                                                                  |
| 8   | **No password reset flow**                         | **INFO**   | `/forget-password` etc. all 404 — no account recovery surface                                                         |
| 9   | **Admin auto-assign via env var**                  | **INFO**   | Admin role set by env vars at signup — safe if env vars are properly scoped to staging                                |

### Positive Findings

| Item                   | Status                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------- |
| Session tokens         | Opaque HMAC-signed (not JWT) — no sensitive data in token                               |
| Error messages         | Identical for "wrong password" vs "non-existent user" — no user enumeration via message |
| Rate limiting          | Effective per-endpoint (15/300s for sign-in, 9/600s for other auth)                     |
| Auth bypass            | `/home` properly redirects 302 → `/login` when not authenticated                        |
| OAuth endpoints        | Properly disabled (404) when not configured                                             |
| Admin endpoints        | `admin/list-users` returns 403 for non-admin users                                      |
| No CRUD attack surface | No change-password, change-email, revoke-sessions endpoints exposed                     |

### Recommendations

1. Add server-side validation for `confirmPassword` matching password
2. Add security headers (CSP, HSTS, XFO, XCTO)
3. Fix rate limit response format (`application/json` instead of `text/plain`)
4. Add `Retry-After` and `X-RateLimit-*` headers to 429 responses
5. Add password complexity requirements (uppercase, number, symbol)
6. Consider adding httpOnly to `last_used_login_method` cookie
7. Implement password reset flow if not intentionally disabled

---

## T1.1 — Security Headers Audit ✅

### Summary

The application **sets no security headers** at the application layer. All observed headers are infrastructure-only (Cloudflare + Fly.io). This is a systemic gap affecting every page and API response.

### Missing Security Headers

| Header                      | Impact                                                    | Severity |
| --------------------------- | --------------------------------------------------------- | -------- |
| `Content-Security-Policy`   | No XSS mitigation; data exfiltration possible             | Critical |
| `Strict-Transport-Security` | SSL stripping on first visit; no HTTPS enforcement signal | High     |
| `X-Frame-Options`           | Page can be iframed — clickjacking risk                   | Medium   |
| `X-Content-Type-Options`    | MIME sniffing risk                                        | Low      |
| `Referrer-Policy`           | Referrer leakage on cross-origin navigation               | Low      |
| `Permissions-Policy`        | Unrestricted API access (camera, mic, etc.)               | Low      |

### Information Disclosure (Custom Headers)

Every response leaks:

- `x-powered-by: Sinnau` — application identity
- `x-sinnau-sha` — exact git commit SHA
- `x-sinnau-version` — full version string

### Information Disclosure (API)

`GET /api/version` (no auth required) returns:

```json
{
  "buildDate": "2026-07-15T16:16:49Z",
  "sha": "5aaae16586e946bbf5f52dc41e1b307b38e39837",
  "version": "staging-5aaae16586e946bbf5f52dc41e1b307b38e39837"
}
```

### Positive Findings

| Item                | Status                                              |
| ------------------- | --------------------------------------------------- |
| CORS headers        | Not set (safe default — same-origin only)           |
| Error pages         | Clean 404, no stack traces or internal paths leaked |
| Cache Control       | Sensitive pages not cached (DYNAMIC)                |
| robots.txt          | Allows all — no secret paths exposed                |
| .env / config files | 404 — not exposed                                   |

### Login Page Structure

- **URL**: `/login` (POST, novalidate)
- **Fields**: `email` (type=email), `password` (type=password)
- **No CSRF token** in form HTML
- **Sign-up**: `/sign-up` (not `/register`) — 200 OK, fields: name, email, password, confirmPassword

### Cookie Security

- No cookies set for unauthenticated users
- Better Auth session cookies appear only after sign-in

### Recommendations

1. Add `Content-Security-Policy` via SvelteKit's `csp` config or `hooks.server.ts`
2. Add `Strict-Transport-Security: max-age=31536000; includeSubDomains`
3. Add `X-Frame-Options: DENY`
4. Add `X-Content-Type-Options: nosniff`
5. Add `Referrer-Policy: strict-origin-when-cross-origin`
6. Add `Permissions-Policy` restricting camera/mic/geolocation
7. Remove or genericize `x-powered-by`, `x-sinnau-sha`, `x-sinnau-version` headers
8. Add auth or rate-limiting to `/api/version`
9. Add `/.well-known/security.txt` for security researcher contact

---
