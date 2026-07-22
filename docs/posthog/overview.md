# PostHog Analytics

## Architecture

```
Browser                          SvelteKit Server
┌─────────────────────┐          ┌──────────────────────┐
│ +layout.ts           │          │ hooks.server.ts       │
│   initPostHog()      │          │   posthogProxyHandle  │
│                      │          │     /ph → eu.posthog  │
│ hooks.client.ts      │          └──────────────────────┘
│   handleError →      │
│   captureException() │
│                      │
│ auth.svelte.ts       │
│   $effect → identify │
│   / reset on logout  │
│                      │
│ analytics/events.ts  │
│   track(event, props)│
│   → posthog.capture  │
└──────────────────────┘
```

- **Reverse proxy**: `/ph/*` routes proxied to `eu.i.posthog.com` (API) and `eu-assets.i.posthog.com` (static/array assets) in `hooks.server.ts`
- **Init**: `posthog.init()` in `+layout.ts` load function, skipped when `PUBLIC_POSTHOG_KEY` is unset
- **Identification**: `posthog.identify(userId, { email, is_admin, name })` via `$effect` in `auth.svelte.ts`; `posthog.reset()` on sign-out
- **Error tracking**: `posthog.captureException(error)` for non-404 client errors in `hooks.client.ts`
- **Configuration**: `person_profiles: identified_only`, `autocapture` with `/ph/.*` ignore list, `api_host: /ph`

## Events

14 custom events defined in `src/lib/analytics/events.ts`. See [events-reference.md](./events-reference.md) for full property catalog.

## Funnels

| Funnel | Steps | Status |
|---|---|---|
| [Acquisition → Activation](./funnel-acquisition-activation.md) | Sign up → first study set or session | Instrumented |
| [AI Generation Pipeline](./funnel-ai-generation.md) | Generate started → completed / failed | Instrumented |
| [Study Session Completion](./funnel-study-session.md) | Session started → completed | Instrumented |
| [Free → Paid Conversion](./funnel-free-to-paid.md) | Checkout started → completed / expired | Instrumented |
| Retention | Return visits / repeat sessions | **Not instrumented** |

## Environment

- Key: `PUBLIC_POSTHOG_KEY` (optional — analytics are disabled when unset or empty)
- All events fire only on the client (`browser` guard or within Svelte `$effect`)
