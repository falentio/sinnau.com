# Funnel: Free → Paid Conversion

## Steps

1. **`plan checkout started`** — user initiates checkout from plans page
2. **`plan checkout completed`** — Midtrans confirms payment (PAID status)
3. **`plan checkout expired`** — order expires without payment (exit path)

## Events

### Step 1: `plan checkout started`

- **File:** `src/routes/(app)/subs/plans/+page.svelte:67`
- **Trigger:** `client.plan.checkout()` succeeds
- **Properties:** `duration_months` (`1 | 6 | 12`), `order_id`, `plan_key` (`"LITE" | "PLUS" | "PREMIUM"`)

### Step 2: `plan checkout completed`

- **File:** `src/routes/(app)/subs/checkout/[orderId]/+page.svelte` (via `trackPaid()`)
- **Trigger:** Order status becomes `PAID` — detected via polling loop or manual "I've paid" button
- **Properties:** `duration_months`, `gross_amount` (IDR), `order_id`, `plan_key`

Guarded by `hasTrackedPaid` to prevent duplicate events. Fires once per order lifetime.

### Exit Step: `plan checkout expired`

- **File:** `src/routes/(app)/subs/checkout/[orderId]/+page.svelte` (via `trackExpired()`)
- **Trigger:** Order status becomes `EXPIRED` — detected via polling loop
- **Properties:** `duration_months`, `order_id`, `plan_key`

Guarded by `hasTrackedExpired` to prevent duplicate events.

## PostHog Configuration

Create a funnel in PostHog with:

- **Step 1:** `plan checkout started`
- **Step 2:** `plan checkout completed`

To measure expiration rate, compare `plan checkout expired` count against `plan checkout started`.

## Key Metrics

- **Conversion rate:** `plan checkout completed` / `plan checkout started`
- **Expiration rate:** `plan checkout expired` / `plan checkout started`
- **Average gross amount:** Average `gross_amount` on completed checkouts
- **Plan mix:** Breakdown by `plan_key` on started events
- **Duration preference:** Breakdown by `duration_months` on completed events

## Notes

- All events are user-identified via `person_profiles: identified_only` + `posthog.identify()`
- The `retention` funnel listed in the commit message has no dedicated events — the conversion funnel shows whether users return to subscribe, but return-to-study retention is not instrumented
