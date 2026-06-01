# Subscription Service Questions

This document captures discovery questions for a new Subscription service that will own subscription lifecycle rules, connect plan keys to billing, and orchestrate related services.

Source context:

- `src/lib/services/rate-limiter/constants.ts`
- `src/lib/services/rate-limiter/SPECS.md`
- `src/lib/services/rate-limiter/helpers.ts`
- `src/lib/services/midtrans/`
- `src/lib/services/referral/SPECS.md`

Known context:

- Current plan keys are `FREE`, `PRO`, and `PREMIUM`.
- Plan prices are currently hardcoded as `FREE = 0`, `PRO = 30`, and `PREMIUM = 60`.
- Rate Limiter explicitly does not own subscription lifecycle rules, but it needs a current plan lookup.
- `getCurrentRateLimitPlanForUser` currently returns `FREE` as a placeholder.
- Midtrans service can create Snap transactions and query transaction status.
- Referral service can award points for referred-user subscription occurrences, but it does not decide when subscription rewards happen.

---

### 1. What lifecycle states should a subscription have?

#### Why ask this question

The subscription service needs a canonical way to decide whether a user is on `FREE`, `PRO`, or `PREMIUM`. Payment status alone is not enough because a transaction can be pending, settled, expired, refunded, or challenged while the user's subscription can be active, expired, canceled, or downgraded.

#### Common approaches to resolve

**Approach A: Minimal active/inactive state**

- Store only whether a paid subscription is currently active.
- Easier to implement.
- Hides important operational states like pending payment, canceled renewal, expired access, or refund handling.

**Approach B: Explicit lifecycle states**

- Example states: `PENDING_PAYMENT`, `ACTIVE`, `EXPIRED`, `CANCELED`, `PAYMENT_FAILED`, `REFUNDED`.
- Makes transitions and debugging clearer.
- Requires more validation and tests.

**Approach C: Derive everything from payment rows**

- Avoids a separate subscription state column.
- Can become complex because payment records are events, while subscription access is current state.

#### Recommended approach with explanation

Choose **Approach B**. Store explicit subscription lifecycle states and define allowed transitions. This keeps the service understandable, makes webhook/status reconciliation safer, and gives the rate limiter a reliable current-plan source.

#### Answer

Approach B

---

### 2. Should users have one current subscription row or a historical subscription period table?

#### Why ask this question

The service must support current plan lookup, access period checks, payment reconciliation, and future audit/debugging. The persistence model determines whether history is retained and how easy it is to answer "what plan is this user on right now?".

#### Common approaches to resolve

**Approach A: One mutable row per user**

- Simple current-plan lookup.
- Historical changes are overwritten unless separate events exist.

**Approach B: Subscription periods plus current lookup**

- Store each paid access period with `startsAt`, `endsAt`, `planKey`, and status.
- Current plan is derived from the active period at the current time.
- Keeps history and supports repeated monthly purchases.

**Approach C: Event-sourced subscription ledger only**

- Store every transition as an append-only event.
- Very auditable but heavier to query and implement.

#### Recommended approach with explanation

Choose **Approach B**. Store subscription periods as durable history and add indexes for efficient current lookup by `userId`, `status`, and `endsAt`. This fits monthly paid access and avoids losing billing history.

#### Answer

Approach B


---

### 3. What billing period should paid plans grant?

#### Why ask this question

The rate limiter currently uses daily and weekly windows, while the plan copy mentions monthly PDF limits. Subscription needs to define whether a payment grants one month, 30 days, a calendar month, or another period.

#### Common approaches to resolve

**Approach A: Fixed 30-day period from settlement time**

- Easy to compute.
- Does not align perfectly with calendar months.

**Approach B: Calendar month period**

- Easier to explain as monthly billing.
- More edge cases around different month lengths and purchases near month end.

**Approach C: Configurable duration per plan**

- Flexible for future annual plans or promos.
- More fields and validation in the first version.

#### Recommended approach with explanation

Choose **Approach A** for the first version. A settled payment grants 30 days of access from settlement time. It is simple, deterministic, and matches the current hardcoded-plan model.

#### Answer

Fixed 30-day period time from settlement time


---

### 4. How should plan prices be interpreted?

#### Why ask this question

`RATE_LIMIT_PLAN_PRICES` stores `PRO = 30` and `PREMIUM = 60`, but Midtrans expects `gross_amount` as an integer currency amount. The service needs to know whether these values mean rupiah, thousands of rupiah, display-only values, or another unit.

#### Common approaches to resolve

**Approach A: Treat constants as display prices only**

- Keeps UI copy separate from billing amounts.
- Requires subscription-specific billing constants.

**Approach B: Treat constants as thousands of IDR**

- `30` means `30000` IDR and `60` means `60000` IDR.
- Matches common Indonesian price display.
- Must be explicit to avoid charging the wrong amount.

**Approach C: Replace constants with minor-unit billing amounts**

- Store `PRO = 30000`, `PREMIUM = 60000` directly.
- Less ambiguous for Midtrans.
- UI may need formatting helpers.

#### Recommended approach with explanation

Choose **Approach C** for billing code, even if UI continues to display shortened prices. Subscription should have explicit Midtrans charge amounts in IDR integers, and UI display values should be derived or separately named to avoid accidental undercharging.

#### Answer

Approach B


---

### 5. Should `FREE` be represented as a subscription record?

#### Why ask this question

Every user has free access by default, but storing `FREE` rows for all users can add noise. The choice affects current-plan lookup, database size, and behavior for users without paid history.

#### Common approaches to resolve

**Approach A: No `FREE` rows**

- Missing active paid subscription means `FREE`.
- Simple and avoids unnecessary rows.

**Approach B: Create a `FREE` subscription row for every user**

- Makes every user's plan explicit.
- Adds lifecycle management for a plan that does not need billing.

**Approach C: Store user current plan directly on the user row**

- Very fast lookup.
- Mixes subscription state into auth/user persistence.

#### Recommended approach with explanation

Choose **Approach A**. Treat missing active paid subscription as `FREE`. This matches the current placeholder behavior and keeps paid subscription history focused on billable access.

#### Answer

Approach A


---

### 6. How should upgrades and repeated purchases work while a paid plan is active?

#### Why ask this question

Users may buy `PRO` again before expiry, buy `PREMIUM` while `PRO` is active, or downgrade after a premium period. The service must define whether access extends, replaces, or overlaps existing periods.

#### Common approaches to resolve

**Approach A: Reject paid purchases while any paid subscription is active**

- Simple and avoids overlap.
- Poor user experience for renewals or upgrades.

**Approach B: Same-plan purchases extend the current period; higher-plan purchases replace immediately**

- Handles common renewal and upgrade flows.
- Requires clear rules for unused lower-plan time.

**Approach C: Allow overlapping periods and choose highest active plan**

- Flexible.
- More complex current-plan lookup and edge cases.

#### Recommended approach with explanation

Choose **Approach B**. Same-plan purchases should extend from the later of current `endsAt` or settlement time. Higher-plan purchases should activate immediately and become the current plan. Lower-plan purchases during an active higher plan should either be rejected or scheduled only if scheduling is explicitly needed later.

#### Answer

Approach B


---

### 7. What should happen to rate-limit usage when a plan changes?

#### Why ask this question

Rate Limiter already applies current plan limits immediately. Subscription needs to confirm whether that is the intended business behavior for upgrades, expirations, and downgrades.

#### Common approaches to resolve

**Approach A: Apply new plan immediately without resetting usage**

- Matches the current Rate Limiter spec.
- Simple: usage rows remain unchanged, limits change.

**Approach B: Reset usage on paid upgrade**

- Feels generous to users.
- Requires subscription-to-rate-limiter orchestration and more audit complexity.

**Approach C: Prorate usage across plans**

- Precise but not worth the complexity for hardcoded daily/weekly limits.

#### Recommended approach with explanation

Choose **Approach A**. Subscription should only change the current plan; Rate Limiter should compare existing daily/weekly usage against the new current limits. This preserves the existing rate-limiter design and avoids cross-domain counter mutation.


#### Answer

Approach A


---

### 8. How should Midtrans Snap transaction creation be modeled?

#### Why ask this question

The Midtrans client can create a Snap transaction, but Subscription must decide what gets persisted before redirecting the user and how order IDs are generated for reconciliation.

#### Common approaches to resolve

**Approach A: Create Midtrans transaction first, then persist local order**

- Simple flow.
- Risky if the local write fails after Midtrans succeeds.

**Approach B: Create a local subscription order first, then create Midtrans transaction**

- Local order ID can become Midtrans `order_id`.
- Easier to retry and reconcile.

**Approach C: Do not persist pending orders**

- Minimal persistence.
- Hard to handle abandoned, pending, or webhook-only payment updates.

#### Recommended approach with explanation

Choose **Approach B**. Persist a local pending subscription order first, use its stable ID as Midtrans `order_id`, then store the Snap token and redirect URL returned by Midtrans. This gives webhooks and status checks a reliable local record.

#### Answer

Approach B


---

### 9. Which Midtrans events should activate or reject subscription access?

#### Why ask this question

Midtrans transaction status has several values. Subscription must define which statuses grant access, which are terminal failures, and which remain pending.

#### Common approaches to resolve

**Approach A: Activate only on `settlement`**

- Conservative and easy to reason about.
- Some payment types may have different successful statuses depending on flow.

**Approach B: Activate on `settlement` and accepted `capture`**

- Common Midtrans handling for card capture flows.
- Needs fraud status checks.

**Approach C: Activate immediately after Snap transaction creation**

- Fast UX.
- Unsafe because payment may never complete.

#### Recommended approach with explanation

Choose **Approach B**. Activate on `settlement`, and activate on `capture` only when `fraud_status` is `accept`. Keep `pending` as pending, mark `expire`, `cancel`, and `deny` as failed, and handle `refund` or `partial_refund` explicitly.


#### Answer

Approach A


---

### 10. Should subscription payment updates rely on webhooks, polling, or both?

#### Why ask this question

The Midtrans client currently supports status lookup, but real payment completion is usually asynchronous. The service needs a reliable reconciliation strategy when users close the browser or callbacks fail.

#### Common approaches to resolve

**Approach A: Webhook-only**

- Most reliable for asynchronous payment updates.
- Requires secure notification handling.

**Approach B: User-return polling/status check only**

- Easier to wire from UI.
- Misses payments if the user does not return.

**Approach C: Webhooks plus manual/status reconciliation**

- Webhooks are primary.
- Status lookup is used for user-return refresh, admin repair, or retry after webhook failure.

#### Recommended approach with explanation

Choose **Approach C**. Use Midtrans notifications/webhooks as the primary source of payment updates, and keep `getTransactionStatus` for reconciliation and user-return flows.

#### Answer

Approach C, manual status reconcillation can be called by user that owned transaction or admin 


---

### 11. What idempotency key should subscription use for payment processing and referral rewards?

#### Why ask this question

Payment notifications can be delivered more than once, and Referral requires an idempotency key for subscription point awards. Subscription must define a stable key so repeated processing does not duplicate access periods or referral points.

#### Common approaches to resolve

**Approach A: Use Midtrans `transaction_id`**

- Stable for a payment transaction.
- May not be known before payment completes.

**Approach B: Use local subscription order ID**

- Known before Midtrans transaction creation.
- Stable across webhook, status polling, and referral orchestration.

**Approach C: Generate a separate random idempotency key per side effect**

- Flexible.
- Easier to accidentally generate multiple keys for the same payment.

#### Recommended approach with explanation

Choose **Approach B**. Use the local subscription order ID as the primary idempotency key for order activation. For referral rewards, use a namespaced key like `subscription-order:<orderId>` to keep it explicit and stable.

#### Answer

Approach B


---

### 12. When should referral points be awarded for a subscription?

#### Why ask this question

Referral stores subscription reward events but does not decide when to call them. Subscription is the natural orchestrator for paid subscription settlement.

#### Common approaches to resolve

**Approach A: Award on every successful paid subscription order**

- Matches Referral spec: referrer can earn points every time a referred user subscribes.
- Requires idempotency per order.

**Approach B: Award only on first paid subscription**

- Simpler reward economics.
- Conflicts with the current Referral spec unless that spec is revised.

**Approach C: Award based on plan tier**

- More flexible reward policy.
- Requires defining point values per plan.

#### Recommended approach with explanation

Choose **Approach A** for domain alignment. On first successful activation of each paid order, Subscription should call Referral with a stable idempotency key. If different point values per plan are desired, define them as subscription reward policy constants.


#### Answer

Approach A



---

### 13. How should expired subscriptions be downgraded?

#### Why ask this question

If a paid period ends without renewal, Rate Limiter needs to see `FREE`. The service must decide whether downgrade is derived from time or performed by a scheduled cleanup job.

#### Common approaches to resolve

**Approach A: Derive current plan by querying active periods where `endsAt > now`**

- No scheduled job required for correctness.
- Expired rows may keep `ACTIVE` status unless a cleanup/reconciliation job updates them.

**Approach B: Scheduled job marks expired subscriptions as `EXPIRED`**

- Cleaner state for admin views.
- Correctness depends on the job running on time unless current lookup also checks `endsAt`.

**Approach C: Store current plan and update it on expiry**

- Fast lookup.
- Requires reliable scheduling to avoid stale paid access.

#### Recommended approach with explanation

Choose **Approach A** for correctness, optionally with **Approach B** for hygiene. Current-plan lookup should always require `status = ACTIVE` and `endsAt > now`; a scheduled cleanup can later mark old rows as `EXPIRED` for clarity.


#### Answer

Approach A, and also add cleanup admin only command



---

### 14. What public commands and queries should Subscription expose?

#### Why ask this question

The service boundary should be clear before implementation. User-facing actions, webhook handlers, and cross-domain lookups need different authorization and validation rules.

#### Common approaches to resolve

**Approach A: Minimal commands only**

- `CreateSubscriptionCheckout` and `GetMySubscriptionStatus`.
- Fastest first version.
- Leaves webhook/status reconciliation underspecified.

**Approach B: Separate user, webhook, and internal commands**

- User commands create checkout and read status.
- Webhook/internal commands process payment updates and expose current plan lookup.
- Clear boundaries and authorization.

**Approach C: Put orchestration in routes instead of service commands**

- Fewer service files.
- Makes business rules harder to test independently.

#### Recommended approach with explanation

Choose **Approach B**. Define explicit commands/queries such as `CreateSubscriptionCheckout`, `ProcessSubscriptionPaymentUpdate`, `RefreshSubscriptionOrderStatus`, `GetMySubscriptionStatus`, and `GetCurrentPlanForUser`. This keeps orchestration testable and lets Rate Limiter replace its placeholder plan lookup cleanly.

#### Answer

Approach B, register webhook at /src/routes/webhook/midtrans/+server.ts

---

### 15. What should happen on refunds or chargebacks?

#### Why ask this question

Midtrans can report `refund` and `partial_refund`. Subscription must decide whether to revoke access, keep access until period end, downgrade immediately, and whether referral points should be reversed.

#### Common approaches to resolve

**Approach A: Immediate revocation on full refund**

- Protects paid features from refunded access.
- Requires clear handling if refund happens near period end.

**Approach B: Keep access until current paid period ends**

- User-friendly.
- May grant paid access after money is returned.

**Approach C: Manual/admin-only refund handling in first version**

- Avoids automating a sensitive policy early.
- Leaves automated payment events without complete behavior.

#### Recommended approach with explanation

Choose **Approach A** for full refunds: mark the paid period as `REFUNDED` and exclude it from current-plan lookup immediately. For partial refunds, do not automate plan changes until the business rule is explicit. Referral reversal can be deferred, but the idempotency model should allow a future adjustment.

#### Answer

Approach A


---

### 16. Should subscription plan configuration remain hardcoded or move to the database?

#### Why ask this question

Rate Limiter currently uses hardcoded plan keys, limits, features, descriptions, and prices. Subscription can either follow that pattern or introduce database-managed products.

#### Common approaches to resolve

**Approach A: Hardcode supported plans in TypeScript**

- Matches current Rate Limiter design.
- Type-safe and simple.
- Requires deploys for price or plan changes.

**Approach B: Store plans in the database**

- Admin-editable and dynamic.
- Adds migration, validation, caching, and consistency work.

**Approach C: Hybrid hardcoded plan keys with database price overrides**

- More flexible than pure hardcoding.
- More complexity than currently needed.

#### Recommended approach with explanation

Choose **Approach A** for the first version. Keep plan keys hardcoded and type-safe, but create subscription-specific billing constants so payment amounts are explicit. Revisit database-managed plans only when product/admin requirements demand it.


#### Answer

Approach A



---

### 17. What tables should Subscription own?

#### Why ask this question

The current decisions mention pending orders and subscription periods, but implementation needs clear persistence ownership. Without deciding the table split, payment state, access periods, and audit history can become mixed into one hard-to-maintain row.

#### Common approaches to resolve

**Approach A: Single `subscription` table**

- Stores order, payment, and access-period data together.
- Simple at first.
- Becomes ambiguous when one user has multiple payments or repeated periods.

**Approach B: Separate order and period tables**

- `subscription_order` stores checkout/payment state.
- `subscription_period` stores granted access windows.
- Clear boundary between payment intent and paid access.

**Approach C: Order, period, and event tables**

- Adds an append-only `subscription_event` audit trail.
- Best observability, but more work for the first version.

#### Recommended approach with explanation

Choose **Approach B** for the first version. Use one table for payment orders and one table for access periods. Add an event table later only if debugging, compliance, or admin history requires it.

#### Answer

Approach B

---

### 18. What should the local subscription order statuses be?

#### Why ask this question

Order status is different from subscription period status. A checkout can be created, waiting for payment, paid, expired, failed, or refunded before or after access is granted.

#### Common approaches to resolve

**Approach A: Reuse Midtrans statuses directly**

- Avoids a local translation layer.
- Couples domain behavior to provider-specific names.

**Approach B: Define local order statuses and store raw Midtrans status separately**

- Example local statuses: `PENDING`, `PAID`, `FAILED`, `EXPIRED`, `CANCELED`, `REFUNDED`.
- Keeps business logic provider-independent.
- Still preserves raw provider status for diagnostics.

**Approach C: Store only raw webhook payloads**

- Maximizes raw audit detail.
- Makes current order queries and user UI harder.

#### Recommended approach with explanation

Choose **Approach B**. Store a local order status for domain behavior and store the latest Midtrans `transaction_status`, `fraud_status`, and `status_code` for reconciliation/debugging.

#### Answer

Approach B


---

### 19. Should checkout creation reuse an existing pending order?

#### Why ask this question

Users can click the subscribe button repeatedly. If every click creates a new Midtrans order, the database can fill with duplicate pending orders and the user may see multiple payable invoices.

#### Common approaches to resolve

**Approach A: Always create a new pending order**

- Simple implementation.
- Can create many abandoned orders for the same user and plan.

**Approach B: Reuse an existing pending order for the same user and plan**

- Cleaner user experience.
- Requires knowing when a Snap token or redirect URL is still usable.

**Approach C: Expire old pending orders before creating a new one**

- Avoids multiple active pending orders.
- Requires an explicit pending-order expiry rule.

#### Recommended approach with explanation

Choose **Approach C**. If a user creates a new checkout for a plan, expire or mark superseded any stale pending order for that user/plan before creating a fresh local order and Snap transaction. This avoids relying on Snap token lifetime assumptions.

#### Answer

Approach A, we handle this on frontend to prevent spammy click


---

### 20. How long should pending subscription orders remain valid locally?

#### Why ask this question

Midtrans payment methods can have their own expiry behavior, but the app also needs a local rule for whether a pending checkout should still be shown, reused, or reconciled.

#### Common approaches to resolve

**Approach A: No local expiry**

- Trust Midtrans as source of truth.
- Pending rows can remain pending forever if notifications are missed.

**Approach B: Fixed local expiry window**

- Example: pending orders older than 24 hours are treated as expired unless status refresh says otherwise.
- Simple cleanup and UI behavior.

**Approach C: Expiry varies by payment method**

- More accurate.
- Requires tracking method-specific rules and may be overkill initially.

#### Recommended approach with explanation

Choose **Approach B**. Use a fixed local pending expiry such as 24 hours, and allow status reconciliation to update the order if Midtrans reports a final successful or failed state.

#### Answer

Fixed local expiry window: 1 hours

---

### 21. How should Midtrans webhook authenticity be verified?

#### Why ask this question

The webhook route will update paid access. If requests are not verified, an attacker could forge a payment success and activate a subscription.

#### Common approaches to resolve

**Approach A: Trust webhook body fields**

- Fastest to implement.
- Not acceptable for payment activation.

**Approach B: Verify Midtrans signature key**

- Uses Midtrans-provided signature fields and the server key.
- Prevents forged notifications when implemented correctly.

**Approach C: Ignore webhook body status and always call Midtrans status API**

- Strong reconciliation with provider.
- Adds latency and dependency on an outbound request for every webhook.

#### Recommended approach with explanation

Choose **Approach B**, with **Approach C** available for suspicious or manual reconciliation flows. The webhook handler should verify the signature before mutating any local order or subscription period.

#### Answer

Approach B verify signature


---

### 22. Should webhook processing be synchronous or deferred with `waitUntil`?

#### Why ask this question

Webhook handlers need to respond quickly to Midtrans, but processing can include database writes, subscription activation, and referral side effects. Cloudflare/SvelteKit route behavior affects where long-running work should happen.

#### Common approaches to resolve

**Approach A: Process everything before responding**

- Easier to reason about.
- Slower response and more risk of webhook retry if processing takes too long.

**Approach B: Validate and enqueue/defer processing with `waitUntil`**

- Faster response.
- Requires careful error logging and idempotency because failures happen after response.

**Approach C: Store raw notification first, then process via scheduled worker**

- Most resilient.
- More infrastructure and persistence.

#### Recommended approach with explanation

Choose **Approach A** initially unless processing becomes slow. Keep the mutation idempotent and small. Move to `waitUntil` or stored notification processing only if webhook latency or retries become a concrete problem.

#### Answer

Approach A


---

### 23. What information should be stored from Midtrans responses and notifications?

#### Why ask this question

The service needs enough data for reconciliation, user support, and idempotency without storing unnecessary sensitive payment data.

#### Common approaches to resolve

**Approach A: Store only local status and order ID**

- Minimal data.
- Harder to debug provider issues.

**Approach B: Store selected provider fields**

- Example: `transactionId`, `paymentType`, `grossAmount`, `currency`, `transactionTime`, `settlementTime`, `transactionStatus`, `fraudStatus`, `statusCode`, `statusMessage`.
- Useful for support and reconciliation.
- Avoids storing complete raw payloads by default.

**Approach C: Store full raw Midtrans payloads**

- Maximum audit detail.
- More privacy and storage concerns.

#### Recommended approach with explanation

Choose **Approach B**. Store selected non-sensitive provider fields and avoid full payload storage unless there is a concrete audit requirement.

#### Answer

Approach B

---

### 24. What amount validation should protect payment activation?

#### Why ask this question

Subscription should not activate a `PREMIUM` subscription from a notification or status response whose gross amount does not match the local order. Amount mismatches can indicate stale data, configuration bugs, or tampering.

#### Common approaches to resolve

**Approach A: Trust the local order amount only**

- Simple.
- Does not detect provider amount mismatch.

**Approach B: Require provider gross amount to match local order amount**

- Safer payment reconciliation.
- Requires parsing provider amount strings carefully.

**Approach C: Allow amount mismatch and log only**

- Avoids blocking edge cases.
- Risky for subscription activation.

#### Recommended approach with explanation

Choose **Approach B**. On payment success, compare Midtrans `gross_amount` to the local order amount before activating access. Return or record a payment conflict if the amount does not match.

#### Answer

Approach B


---

### 25. Which timestamp should determine subscription `startsAt`?

#### Why ask this question

The earlier answer says a fixed 30-day period from settlement time, but implementation must decide which source provides that timestamp and what fallback applies if it is absent.

#### Common approaches to resolve

**Approach A: Use local processing time**

- Always available.
- Can differ from actual payment settlement time.

**Approach B: Use Midtrans settlement/transaction time when available**

- Better reflects payment event timing.
- Requires parsing provider timestamps and fallback rules.

**Approach C: Use checkout creation time**

- Simple.
- Charges users for time before payment is completed.

#### Recommended approach with explanation

Choose **Approach B**. Use Midtrans settlement time when available; otherwise use transaction time for successful statuses; otherwise fall back to local processing time. Never use checkout creation time for paid access start.

#### Answer

approach A


---

### 26. How should subscription choose the current plan when multiple active periods overlap?

#### Why ask this question

The recommended upgrade behavior can produce edge cases, especially if a higher plan activates immediately while an older lower-plan period still exists. Current-plan lookup must be deterministic.

#### Common approaches to resolve

**Approach A: Reject all overlap at the database/business layer**

- Simplifies lookup.
- Makes upgrades harder because existing periods need to be ended or canceled first.

**Approach B: Allow overlap and choose highest tier**

- User gets the best active paid plan.
- Requires a plan precedence order.

**Approach C: Choose latest-starting active period**

- Simple ordering.
- Could downgrade a user if a lower plan starts later than a higher plan.

#### Recommended approach with explanation

Choose **Approach B** if overlap is possible. Define plan precedence as `PREMIUM > PRO > FREE` and have current-plan lookup return the highest active paid period where `startsAt <= now < endsAt`.

#### Answer

Approach B


---

### 27. Should lower-plan purchases during an active higher plan be rejected or scheduled?

#### Why ask this question

Question 6 leaves lower-plan purchases during an active higher plan open. This affects checkout UI, order creation validation, and current-plan lookup.

#### Common approaches to resolve

**Approach A: Reject lower-plan checkout while a higher plan is active**

- Simple and avoids accidental downgrade scheduling.
- User must wait until the higher plan expires.

**Approach B: Allow lower-plan purchase and schedule it after higher plan expiry**

- Supports advance renewal at a cheaper tier.
- Requires scheduled periods and more UI explanation.

**Approach C: Allow lower-plan purchase but do not activate until manually reconciled**

- Avoids automated downgrade logic.
- Confusing for users.

#### Recommended approach with explanation

Choose **Approach A** for the first version. Reject lower-tier checkout while a higher-tier paid period is active. Add scheduled downgrades only when product requirements explicitly need them.

#### Answer

Approach A

---

### 28. What should happen to the previous lower-plan period when a higher-plan upgrade activates?

#### Why ask this question

If a `PRO` user upgrades to `PREMIUM`, the service must decide whether the existing `PRO` period remains in history, is truncated, or is converted into extra premium time.

#### Common approaches to resolve

**Approach A: Leave the lower-plan period unchanged and choose highest active plan**

- Simple and preserves original purchase history.
- User may have overlapping active periods.

**Approach B: End the lower-plan period at premium activation time**

- Avoids overlap.
- Discards remaining lower-plan access unless explicitly compensated.

**Approach C: Prorate remaining lower-plan value into higher-plan time**

- Economically precise.
- Requires pricing math and more support complexity.

#### Recommended approach with explanation

Choose **Approach A** for the first version. Preserve periods as purchased and let current-plan lookup choose the highest tier. Avoid prorating unless billing policy requires it.

#### Answer

Approach A



---

### 29. What should `GetMySubscriptionStatus` return to the UI?

#### Why ask this question

The UI needs enough information to show current plan, expiry, pending checkout, and possible actions. Returning too much internal payment detail can leak provider complexity.

#### Common approaches to resolve

**Approach A: Return only current plan**

- Minimal and easy to consume.
- Not enough for subscription pages or pending payment messages.

**Approach B: Return current plan, active period, pending order summary, and allowed actions**

- Supports practical UI states.
- Keeps provider details abstracted.

**Approach C: Return raw order and period rows**

- Fast to implement.
- Couples UI to persistence shape.

#### Recommended approach with explanation

Choose **Approach B**. Return a view model with `planKey`, active paid period if any, pending order if any, and allowed actions such as `canUpgrade`, `canRenew`, or `canCreateCheckout`.

#### Answer

Approach B



---

### 30. Should users be allowed to cancel an active subscription?

#### Why ask this question

The current flow sounds like one-time 30-day access rather than auto-renewing billing. If there is no renewal, cancellation may only mean hiding future access, which can confuse product behavior.

#### Common approaches to resolve

**Approach A: No user cancellation in the first version**

- Fits one-time 30-day access.
- Access naturally expires at `endsAt`.

**Approach B: User cancellation ends access immediately**

- Gives users control.
- Can create support issues because the payment was one-time and non-recurring.

**Approach C: User cancellation prevents renewal only**

- Correct for recurring subscriptions.
- Not meaningful if there is no auto-renewal.

#### Recommended approach with explanation

Choose **Approach A** for the first version. Do not implement user cancellation unless subscriptions become recurring. Admin-only revoke/refund handling can cover exceptional cases.

#### Answer

Approach A



---

### 31. Is this a one-time purchase model or a recurring subscription model?

#### Why ask this question

The feature is called Subscription, but Midtrans Snap checkout and the 30-day paid period can represent one-time monthly access. Recurring billing would require different payment tokens, renewal rules, cancellation semantics, and failure handling.

#### Common approaches to resolve

**Approach A: One-time monthly access purchases**

- User pays manually for each 30-day access period.
- Simpler and matches current Snap transaction flow.

**Approach B: True recurring subscription**

- Automatically charges users on renewal.
- Requires recurring billing setup, saved payment methods, renewal failure handling, and cancellation.

**Approach C: Start one-time, design schema names to allow recurring later**

- Keeps first version small.
- Avoids naming everything as if recurring already exists.

#### Recommended approach with explanation

Choose **Approach C** with first-version behavior as **Approach A**. Implement one-time 30-day paid access now, but keep domain language clear: orders grant subscription periods; recurring renewal is out of scope.

#### Answer


Aprroach A


---

### 32. Who can run manual status reconciliation?

#### Why ask this question

The answer to question 10 says reconciliation can be called by the transaction owner or admin. Implementation needs exact authorization behavior and limits.

#### Common approaches to resolve

**Approach A: Owner can refresh only their own orders; admin can refresh any order**

- Clear and safe.
- Requires owner checks and admin checks.

**Approach B: Only admin can refresh**

- Safer operationally.
- Worse UX when a user returns from payment and status is stale.

**Approach C: Anyone with order ID can refresh**

- Easy integration.
- Leaks order existence and allows noisy calls.

#### Recommended approach with explanation

Choose **Approach A**. Authenticated users may refresh only their own subscription orders, and admins may refresh any order. The command should be idempotent and rate-limited if exposed to the UI.

#### Answer

Approach A


---

### 33. What errors should the Subscription service expose?

#### Why ask this question

Existing service specs define domain errors. Subscription needs predictable errors for validation, authorization, payment conflicts, unavailable provider calls, and invalid state transitions.

#### Common approaches to resolve

**Approach A: Throw generic errors**

- Less upfront design.
- Harder for UI and tests to handle expected failures.

**Approach B: Define explicit domain error codes**

- Example: `SUBSCRIPTION_PLAN_NOT_FOUND`, `SUBSCRIPTION_ORDER_NOT_FOUND`, `SUBSCRIPTION_ORDER_CONFLICT`, `SUBSCRIPTION_PAYMENT_AMOUNT_MISMATCH`, `SUBSCRIPTION_INVALID_TRANSITION`, `MIDTRANS_REQUEST_FAILED`.
- Better tests and UI behavior.

**Approach C: Reuse only generic app errors**

- Consistent at app level.
- Loses domain-specific detail.

#### Recommended approach with explanation

Choose **Approach B**. Define explicit Subscription error codes while still mapping shared cases to `VALIDATION_FAILED`, `UNAUTHORIZED`, `FORBIDDEN`, and `NOT_FOUND` where appropriate.

#### Answer

Approach B

---

### 34. What admin cleanup should Subscription provide?

#### Why ask this question

The current answer mentions an admin cleanup command for expired subscriptions. The service also needs to handle abandoned pending orders and old payment records without deleting useful audit data too early.

#### Common approaches to resolve

**Approach A: Mark expired periods only**

- Keeps access state tidy.
- Does not address abandoned pending orders.

**Approach B: Mark expired periods and expire stale pending orders**

- Covers both access and checkout hygiene.
- Does not delete payment history.

**Approach C: Delete old orders and periods**

- Reduces database size.
- Risky for support/audit history.

#### Recommended approach with explanation

Choose **Approach B**. Admin cleanup should mark active periods with `endsAt <= now` as `EXPIRED` and mark old pending orders as `EXPIRED`. Do not delete subscription/payment history in the first version.

#### Answer

Approach B


---

### 35. Should Subscription emit logs for payment and lifecycle transitions?

#### Why ask this question

Payment state bugs are difficult to debug without structured logs. The project has logging conventions rooted at `['sinnau']`.

#### Common approaches to resolve

**Approach A: No dedicated logging**

- Minimal code.
- Harder to diagnose payment issues.

**Approach B: Log important transitions only**

- Log checkout creation, payment status processing, activation, refund, amount mismatch, and invalid transition.
- Good signal without excessive noise.

**Approach C: Log every repository call and response**

- Very detailed.
- Can create noisy logs and risk sensitive data exposure.

#### Recommended approach with explanation

Choose **Approach B**. Use a category such as `['sinnau', 'service', 'subscription']` and avoid logging full payment payloads or secrets.

#### Answer

Approach B


---

### 36. How should tests cover payment lifecycle behavior?

#### Why ask this question

Subscription will coordinate auth, database persistence, Midtrans, Rate Limiter plan lookup, and Referral side effects. Tests need to target the risky transitions and idempotency behavior.

#### Common approaches to resolve

**Approach A: Unit tests only for command handlers**

- Fast and focused.
- May miss repository and transaction behavior.

**Approach B: Repository tests plus command tests with mocked Midtrans/Referral**

- Matches existing project style.
- Covers persistence rules and orchestration behavior.

**Approach C: End-to-end tests against Midtrans sandbox**

- High confidence for provider integration.
- Slower, more brittle, and requires secrets.

#### Recommended approach with explanation

Choose **Approach B**. Add repository tests for orders/periods and command tests for checkout creation, webhook/status processing, idempotent activation, amount mismatch, owner/admin reconciliation, expiry cleanup, and referral side-effect idempotency.

#### Answer

Approach B


---

## Initial Recommended Direction

Build Subscription as the owner of paid access periods, payment order state, and current-plan lookup. Use local pending orders before creating Midtrans Snap transactions, process Midtrans updates idempotently, activate paid periods only after successful payment statuses, and expose `GetCurrentPlanForUser` so Rate Limiter can replace its current `FREE` placeholder.

Keep `FREE` implicit, keep plan keys hardcoded, and avoid mutating rate-limit usage on plan changes. Treat referrals as a downstream side effect triggered once per successful paid order using a stable idempotency key.
