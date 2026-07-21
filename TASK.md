# Security Research Tasks — stagging.sinnau.com

## Tier 1 — Critical

- [x] **T1.1 Security Headers Audit** — Check all response headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- [x] **T1.2 Authentication Security** — Test login flows, session handling, rate limiting, credential policies
- [x] **T1.3 Access Control / IDOR** — Test authorization boundaries between roles (user vs admin), direct object reference
- [x] **T1.4 Information Disclosure** — Check version endpoint, error messages, stack traces, debug info leakage

## Tier 2 — High

- [x] **T2.1 CSRF Protection** — Test CSRF token validation on state-changing requests
- [x] **T2.2 XSS Testing** — Test input sanitization on form fields, URL params
- [x] **T2.3 SQL Injection Testing** — Fuzz API parameters with SQL metacharacters

## Tier 3 — Medium

- [x] **T3.1 Session Security** — Test session fixation, cookie flags (HttpOnly, Secure, SameSite), token tampering
- [x] **T3.2 API Key Plugin** — Test Better Auth `/api/auth/api-key/*` endpoints without auth
- [x] **T3.3 Open Redirect** — Test `callbackURL` / redirect parameters on auth endpoints

## Tier 4 — Low

- [x] **T4.1 HTTPS & TLS** — Verify HTTP → HTTPS redirect, HSTS header
- [x] **T4.2 Registration Policy** — Test email/password constraints, duplicate registration
