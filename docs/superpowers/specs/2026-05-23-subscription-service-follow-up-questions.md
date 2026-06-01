# Subscription Service Follow-Up Questions

This document captures additional follow-up questions after `docs/superpowers/specs/2026-05-23-subscription-service-questions.md` was answered through question 36.

These questions focus on remaining details that can affect schema design, command contracts, payment safety, user experience, and implementation scope.

Source context:

- `docs/superpowers/specs/2026-05-23-subscription-service-questions.md`
- `src/lib/services/rate-limiter/constants.ts`
- `src/lib/services/rate-limiter/SPECS.md`
- `src/lib/services/midtrans/`
- `src/lib/services/referral/SPECS.md`

Known answered direction from the first question file:

- Use explicit lifecycle states.
- Store paid access as historical subscription periods.
- A paid order grants a fixed 30-day period.
- `FREE` is implicit when no active paid period exists.
- Create a local order before creating a Midtrans Snap transaction.
- Activate only on Midtrans `settlement`.
- Use webhooks plus owner/admin reconciliation.
- Use local order ID for idempotency.
- Award referral points for every successful paid order.
- Keep plan config hardcoded for the first version.
- Use `subscription_order` and `subscription_period` tables.
- Use local order statuses plus selected Midtrans fields.
- Pending orders expire locally after 1 hour.
- Verify Midtrans webhook signature.
- Process webhooks synchronously.
- Validate provider gross amount against local order amount.
- Use local processing time for subscription `startsAt`.
- Choose the highest tier when active periods overlap.
- Reject lower-plan purchases while a higher plan is active.
- Do not implement user cancellation for the first version.
- Treat the first version as one-time monthly access, not recurring billing.
- Add repository tests plus command tests with mocked integrations.

---

### 1. What exact columns should `subscription_order` store?

#### Why ask this question

The first question file chooses separate order and period tables, but the exact fields still need to be decided before writing schemas and repository tests. Missing fields can force migrations immediately after implementation.

#### Common approaches to resolve

**Approach A: Minimal order columns**

- Store `id`, `userId`, `planKey`, `amount`, `status`, `snapToken`, `redirectUrl`, `createdAt`, and `updatedAt`.
- Fast to build.
- May be weak for payment support and reconciliation.

**Approach B: Order columns plus selected Midtrans reconciliation fields**

- Adds `midtransTransactionId`, `midtransOrderId`, `paymentType`, `grossAmount`, `transactionStatus`, `fraudStatus`, `statusCode`, `statusMessage`, `paidAt`, `expiresAt`, and `lastSyncedAt`.
- Supports debugging and reconciliation without storing full raw payloads.

**Approach C: Store full provider payload JSON in the order row**

- Maximum details.
- Adds privacy/storage concerns and makes the row less structured.

#### Recommended approach with explanation

Choose **Approach B**. Keep structured local fields plus selected Midtrans fields. Avoid full raw payload storage for the first version, but preserve enough provider metadata for support and idempotent reconciliation.

#### Answer

Approach B



---

### 2. What exact columns should `subscription_period` store?

#### Why ask this question

Current-plan lookup, history, refund behavior, cleanup, and overlap handling all depend on the period schema. The service needs enough information to link each access period to the payment that created it.

#### Common approaches to resolve

**Approach A: Minimal period columns**

- Store `id`, `userId`, `planKey`, `status`, `startsAt`, `endsAt`, `createdAt`, and `updatedAt`.
- Simple current-plan lookup.
- Weaker traceability to the payment order.

**Approach B: Period columns with order linkage**

- Adds `orderId`, optional `refundedAt`, optional `expiredAt`, and optional `replacedByPeriodId`.
- Clear traceability and future admin support.

**Approach C: Store current access and payment history only on orders**

- Avoids a separate period table.
- Reintroduces order/access coupling that the first file already avoided.

#### Recommended approach with explanation

Choose **Approach B**. `subscription_period` should reference the order that granted access and keep lifecycle timestamps needed for cleanup and support.

#### Answer

Approach B, without replacedByPeriodId


---

### 3. Should IDs use project-specific prefixes?

#### Why ask this question

Other project work references prefixed ID validation. Subscription IDs will appear in order IDs, logs, webhooks, and support flows. Choosing ID format early avoids inconsistent public/internal identifiers.

#### Common approaches to resolve

**Approach A: Use raw UUIDs**

- Simple and consistent with some existing tables.
- Less readable in logs and provider order IDs.

**Approach B: Use prefixed IDs for domain records**

- Example: `subord_...` for orders and `subper_...` for periods.
- Easier to identify records in logs and support.
- Requires validators and generators.

**Approach C: Use UUID primary keys plus separate public order numbers**

- Keeps database IDs generic while exposing friendly identifiers.
- Adds another unique field.

#### Recommended approach with explanation

Choose **Approach B** if the project's prefixed ID helpers are ready; otherwise use **Approach A** and keep the schema easy to migrate later. Do not create a second identifier unless support requirements demand it.

#### Answer

Approach B, use 3 chars prefix


---

### 4. Should Midtrans `order_id` exactly equal local `subscription_order.id`?

#### Why ask this question

The first question file says local order ID should be used for Midtrans `order_id`. The exact format matters because provider order IDs are visible in dashboards, notifications, and reconciliation.

#### Common approaches to resolve

**Approach A: Use local order ID exactly**

- Simplest mapping.
- Webhooks can look up by `order_id` directly.

**Approach B: Prefix local order ID with environment/app context**

- Example: `sinnau-prod-subord_...`.
- Helps avoid dashboard confusion across environments.
- Requires parsing or storing the provider order ID separately.

**Approach C: Generate a separate Midtrans order ID**

- Provider-specific control.
- Adds mapping complexity.

#### Recommended approach with explanation

Choose **Approach B** if sandbox and production can share operational dashboards or logs; otherwise **Approach A** is enough. In either case, store both local `id` and `midtransOrderId` explicitly.

#### Answer

Approach A



---

### 5. Should checkout creation be idempotent from the client perspective?

#### Why ask this question

The first file accepts creating a new order and handling click spam on the frontend. Backend idempotency can still matter for retries, double submissions, network failures, or users opening multiple tabs.

#### Common approaches to resolve

**Approach A: No backend idempotency**

- Every valid request creates a new order.
- Simple but can create duplicate pending payment intents.

**Approach B: Optional client idempotency key**

- Client can retry checkout creation safely with the same key.
- Requires storing and validating idempotency keys per user.

**Approach C: Backend derives idempotency from user, plan, and short time window**

- No client key needed.
- Can surprise users if they intentionally want a fresh checkout.

#### Recommended approach with explanation

Choose **Approach A** for the first version if frontend disables repeat clicks and pending orders expire after 1 hour. Add **Approach B** only if duplicate order creation becomes a real problem.

#### Answer

Approach A

---

### 6. Should users be able to create checkout for their current active plan?

#### Why ask this question

Same-plan purchases were previously described as extending the current period. The service needs an explicit rule for renewal checkout while active.

#### Common approaches to resolve

**Approach A: Allow same-plan renewal anytime**

- Lets users extend access before expiry.
- Can create long stacked periods if users repeat purchases.

**Approach B: Allow renewal only near expiry**

- Example: only when less than 7 days remain.
- Reduces accidental over-purchasing.

**Approach C: Reject same-plan checkout while active**

- Simplest.
- Users can only renew after expiry.

#### Recommended approach with explanation

Choose **Approach A** unless product wants to limit prepaid access. It matches the earlier same-plan extension decision and keeps the first version predictable.

#### Answer

Approach A

---

### 7. Is there a maximum prepaid extension length?

#### Why ask this question

If same-plan renewal is allowed anytime, a user can potentially stack many 30-day periods. The service should decide whether this is allowed or capped.

#### Common approaches to resolve

**Approach A: No cap**

- Simple and allows repeated purchases.
- Could create very long future access by accident.

**Approach B: Cap total active/future access**

- Example: do not allow extension beyond 180 days from now.
- Prevents extreme accidental stacking.

**Approach C: Cap number of pending or paid orders per user**

- Focuses on checkout/order spam rather than access duration.

#### Recommended approach with explanation

Choose **Approach A** for the first version. Add a cap only if product or support sees accidental over-purchasing.

#### Answer

No Cap, approach A

---

### 8. Should pending orders block new checkout for the same plan?

#### Why ask this question

Pending orders expire after 1 hour, but users may accidentally create multiple pending orders within that hour. The service needs to decide whether this is allowed.

#### Common approaches to resolve

**Approach A: Allow multiple pending orders**

- Matches the frontend-click-prevention answer.
- Backend remains simple.

**Approach B: Reject new checkout while a pending order for the same plan exists**

- Prevents duplicate payable invoices.
- User may need a way to resume or expire the existing checkout.

**Approach C: Return the existing pending order**

- Smooth UX.
- Requires trusting Snap token/redirect URL lifetime for the pending window.

#### Recommended approach with explanation

Choose **Approach B** if duplicate payment links are a concern. Otherwise choose **Approach A** and rely on the 1-hour expiry plus frontend prevention.

#### Answer

Approach A

---

### 9. What should happen if an expired local pending order later settles at Midtrans?

#### Why ask this question

Local pending expiry is 1 hour, but provider/payment timing can be delayed. The service needs a safe rule for late successful payments.

#### Common approaches to resolve

**Approach A: Reject late settlement if local order is expired**

- Keeps local expiry strict.
- Risky because user paid but receives no access.

**Approach B: Activate access if Midtrans reports valid settlement and amount matches**

- Honors successful payment.
- Local expiry only controls UI/pending state, not final reconciliation.

**Approach C: Require admin review for late settlement**

- Conservative.
- Creates support burden.

#### Recommended approach with explanation

Choose **Approach B**. Local expiry should stop showing/reusing stale checkout, but a valid provider settlement with matching amount should still grant access idempotently.

#### Answer

Approach B, we also need to set snap expiration to 1 hour



---

### 10. Should successful order processing be transactional with period creation?

#### Why ask this question

When payment settles, the service updates the order and creates or extends a period. If those changes are not atomic, users can end up with a paid order but no access period.

#### Common approaches to resolve

**Approach A: Single database transaction**

- Updates order and creates/updates period atomically.
- Best consistency.

**Approach B: Update order first, then create period outside transaction**

- Simpler control flow.
- Can leave partially processed payments.

**Approach C: Use retry repair job for partial failures**

- Useful as a safety net.
- Should not replace the main transaction.

#### Recommended approach with explanation

Choose **Approach A**. Payment activation should atomically update order state and create the access period. Add reconciliation later as a repair mechanism, not the primary consistency strategy.

#### Answer

Approach B

---

### 11. Should referral point awarding be inside the same transaction as subscription activation?

#### Why ask this question

Subscription activation and referral rewards touch different domain tables. Putting both in one transaction may be possible if they use the same database, but it also couples domains more tightly.

#### Common approaches to resolve

**Approach A: Award referral points in the same transaction**

- Strong consistency.
- Couples subscription activation to referral repository behavior.

**Approach B: Activate subscription first, then call referral idempotently**

- Keeps subscription access from depending on referral side effect success.
- Needs retry or manual repair if referral awarding fails.

**Approach C: Store an outbox event for referral processing**

- Most robust for cross-domain side effects.
- More infrastructure and implementation work.

#### Recommended approach with explanation

Choose **Approach B** for the first version. Subscription access should not fail because referral point awarding fails. Use the stable idempotency key so retrying the referral side effect is safe.

#### Answer

Approach B

---

### 12. Should there be a stored marker that referral reward was processed?

#### Why ask this question

If referral awarding happens after subscription activation, the service needs to know whether the side effect succeeded or needs retry/support review.

#### Common approaches to resolve

**Approach A: Do not store a marker**

- Rely on Referral idempotency table.
- Harder to see from Subscription whether reward processing happened.

**Approach B: Store `referralRewardStatus` on `subscription_order`**

- Example: `NOT_APPLICABLE`, `PENDING`, `AWARDED`, `FAILED`.
- Easier support and retry logic.

**Approach C: Store a general side-effect table**

- Flexible for future side effects.
- More complexity.

#### Recommended approach with explanation

Choose **Approach B** if referral rewards are part of first-version scope. It gives Subscription visibility into whether a paid order's referral side effect completed.

#### Answer

Approach B



---

### 13. What should happen if referral reward processing fails after subscription activation?

#### Why ask this question

The user should likely keep paid access even if referral awarding fails. The remaining question is how the system records and recovers the failed side effect.

#### Common approaches to resolve

**Approach A: Log only**

- Simple.
- Failed referral rewards can be missed.

**Approach B: Mark reward failed and expose admin retry**

- Keeps paid access active.
- Allows later repair.

**Approach C: Roll back subscription activation**

- Keeps side effects consistent.
- Bad user experience and wrong priority for paid access.

#### Recommended approach with explanation

Choose **Approach B**. Paid access remains active; referral reward status is marked failed and can be retried idempotently by admin tooling or a future repair command.

#### Answer

Approach B

---

### 14. Should partial refunds change subscription access?

#### Why ask this question

The first file resolves full refunds but leaves partial refunds explicit as not automated. Implementation still needs a local status rule when Midtrans reports `partial_refund`.

#### Common approaches to resolve

**Approach A: Treat partial refund like full refund**

- Conservative for revenue protection.
- May revoke too much access.

**Approach B: Record partial refund but keep access active**

- Avoids ambiguous automated downgrades.
- Requires admin/business follow-up if needed.

**Approach C: Prorate remaining access by refund amount**

- Precise but complex and likely unnecessary.

#### Recommended approach with explanation

Choose **Approach B**. Store the partial refund status/amount when available, but do not change access automatically until a concrete business policy exists.

#### Answer

We expect never partial refund, so we ignore partial refund just like never happen

---

### 15. Should chargeback/dispute statuses be modeled separately from refunds?

#### Why ask this question

Payment providers can distinguish refunds from disputes/chargebacks. If Midtrans surfaces such information later, the subscription service may need different access and support behavior.

#### Common approaches to resolve

**Approach A: Model only refund statuses for now**

- Fits currently known Midtrans status handling.
- Keeps first version small.

**Approach B: Add generic `REVOKED` period status**

- Covers refunds, chargebacks, and admin revocation without adding provider-specific statuses.

**Approach C: Add detailed dispute lifecycle statuses now**

- Future-proof.
- Likely over-designed for first version.

#### Recommended approach with explanation

Choose **Approach B**. Keep provider-specific dispute handling out of scope, but include a generic period status that can represent admin/provider-driven revocation if needed.

#### Answer

Approach B


---

### 16. Should admin be able to manually grant or revoke subscription periods?

#### Why ask this question

Support may need to correct payment issues, grant complimentary access, or revoke access after unusual provider events. Manual changes affect auditability and current-plan lookup.

#### Common approaches to resolve

**Approach A: No manual grants/revokes**

- Keeps first version strictly payment-driven.
- Support has fewer repair tools.

**Approach B: Admin grant/revoke commands with reason fields**

- Supports operational repair.
- Requires admin authorization and audit fields.

**Approach C: Direct database edits for rare cases**

- No app code.
- Risky and unaudited.

#### Recommended approach with explanation

Choose **Approach A** for initial launch unless support workflows already require manual correction. If manual correction is needed, choose **Approach B** and require a non-empty reason.

#### Answer

Approach B



---

### 17. Should subscription status include plan feature metadata?

#### Why ask this question

The rate-limiter constants already include features and descriptions. The subscription UI may need to show current benefits, next plan benefits, or checkout details.

#### Common approaches to resolve

**Approach A: Return only plan key and period data**

- Keeps Subscription focused on lifecycle state.
- UI imports display constants separately.

**Approach B: Return plan display metadata in Subscription status**

- Convenient for UI.
- Couples Subscription query response to marketing copy.

**Approach C: Create a separate plan catalog helper shared by UI and services**

- Centralizes metadata.
- Adds another boundary to design.

#### Recommended approach with explanation

Choose **Approach A** for service commands. Keep lifecycle queries focused on state, and let UI read plan display metadata from existing plan constants or a future catalog helper.

#### Answer

Approach A

---

### 18. Should subscription checkout validate user email or customer details?

#### Why ask this question

Midtrans Snap can receive customer details. Better Auth user data may or may not include verified email/name. Checkout behavior should be clear for incomplete profiles.

#### Common approaches to resolve

**Approach A: Require verified email before checkout**

- Cleaner payment records and support contact.
- Blocks users with incomplete auth state.

**Approach B: Send available customer details only**

- More permissive.
- Midtrans order may have less customer context.

**Approach C: Ask for billing details during checkout**

- More complete data.
- Adds UI/forms and validation scope.

#### Recommended approach with explanation

Choose **Approach B** for the first version. Use authenticated user fields when available and let Midtrans handle payment method details. Require verified email only if product/support needs it.

#### Answer

Approach B


---

### 19. Should plan checkout be available to unauthenticated users?

#### Why ask this question

Subscription access is tied to a user ID, and Rate Limiter reads the authenticated user's current plan. Starting checkout without auth creates attribution and fulfillment problems.

#### Common approaches to resolve

**Approach A: Require authentication before checkout**

- Simplest and safest.
- Paid access can be granted directly to the user.

**Approach B: Allow guest checkout and bind after signup/login**

- Lower checkout friction.
- Much more complex and risky.

**Approach C: Collect email first, then require login before payment**

- Marketing-friendly.
- Adds funnel complexity.

#### Recommended approach with explanation

Choose **Approach A**. Subscription checkout should require authentication because paid access is user-scoped.

#### Answer


Approach A

---

### 20. Should order creation check the current active plan before calling Midtrans?

#### Why ask this question

The service should reject invalid lower-plan purchases and possibly allow upgrades/renewals. Doing that before Midtrans avoids creating payment links that cannot be fulfilled according to business rules.

#### Common approaches to resolve

**Approach A: Validate plan transition before creating local order and Midtrans transaction**

- Avoids invalid payment intents.
- Requires current-plan lookup in checkout command.

**Approach B: Create checkout first, validate on settlement**

- Simpler checkout flow.
- Risky because users can pay for an invalid transition.

**Approach C: Validate only on frontend**

- Better UX.
- Not safe as the only enforcement.

#### Recommended approach with explanation

Choose **Approach A**. Backend checkout creation should enforce plan-transition rules before creating any local or Midtrans order.

#### Answer

Approach A


---

### 21. What should happen if plan rules change between checkout creation and settlement?

#### Why ask this question

A user can create checkout under one set of hardcoded plan rules, then pay later after deployment changes prices, plan availability, or transition rules. Even a 1-hour pending window can cross deployments.

#### Common approaches to resolve

**Approach A: Fulfill based on order snapshot**

- The order stores plan key, amount, and duration at creation time.
- Payment settlement honors the original terms.

**Approach B: Revalidate against current plan constants at settlement**

- Ensures latest rules apply.
- Can reject a payment the user already completed.

**Approach C: Cancel all pending orders on deploy/config change**

- Avoids stale terms.
- Operationally awkward.

#### Recommended approach with explanation

Choose **Approach A**. Store plan, amount, and duration snapshot on the order and fulfill successful matching payment according to that snapshot.

#### Answer

Let me clarify
So plankey may added, never removed.
Even if it removed, it just removed for buying, not removed completely.
It safe to assume no breaking changes would happen on plankey.
Plan limit changes are also already handled by limiter services

---

### 22. Should order rows snapshot plan duration and billing amount?

#### Why ask this question

If the service fulfills based on order snapshot, the order must store enough immutable purchase terms to avoid relying on mutable hardcoded constants during settlement.

#### Common approaches to resolve

**Approach A: Store only `planKey` and look up current constants later**

- Less data.
- Settlement behavior can change after checkout creation.

**Approach B: Store `planKey`, `amount`, `currency`, and `durationDays`**

- Stable purchase terms.
- Slightly more schema surface.

**Approach C: Store full plan snapshot including features/descriptions**

- Complete historical purchase representation.
- Probably unnecessary for first version.

#### Recommended approach with explanation

Choose **Approach B**. Store the immutable terms needed to validate and fulfill payment: plan key, amount, currency, and duration days.

#### Answer

Approach B, without currency 
currency always IDR


---

### 23. Should currency be hardcoded to IDR?

#### Why ask this question

Midtrans amount handling and display depend on currency. The current product context appears Indonesian, but the service should decide whether currency is a constant or a stored order field.

#### Common approaches to resolve

**Approach A: Hardcode IDR in subscription billing constants**

- Simple and matches likely Midtrans setup.
- Less flexible for future multi-currency.

**Approach B: Store currency on every order but only allow IDR**

- Preserves historical purchase terms.
- Allows future validation without schema change.

**Approach C: Full multi-currency support now**

- Flexible.
- Overkill for first version.

#### Recommended approach with explanation

Choose **Approach B**. Store `currency = 'IDR'` on orders and validate that first-version checkout only creates IDR orders.

#### Answer

Approach A

---

### 24. Should subscription expose a server-only `getCurrentPlanForUser` helper or a remote query?

#### Why ask this question

Rate Limiter needs current plan lookup internally, while UI needs subscription status. Exposing the wrong API can leak user IDs or create authorization problems.

#### Common approaches to resolve

**Approach A: Server-only helper accepts `userId`**

- Good for Rate Limiter and internal orchestration.
- Must not be exposed to clients.

**Approach B: Remote query accepts no user ID and uses auth context**

- Good for UI.
- Not ideal for internal cross-domain lookup by explicit user ID.

**Approach C: One remote query accepts user ID**

- Flexible.
- Unsafe unless carefully admin-gated.

#### Recommended approach with explanation

Choose **Approach A** plus **Approach B**. Provide a server-only helper for internal services and an auth-scoped UI query that never accepts client-provided `userId`.

#### Answer

Approach A plus Approach B

---

### 25. Should `getCurrentPlanForUser` create or update expired rows?

#### Why ask this question

Rate Limiter may call current-plan lookup frequently. If lookup mutates database state, quota checks can become slower and less predictable.

#### Common approaches to resolve

**Approach A: Pure read only**

- Returns highest active non-expired plan or `FREE`.
- Does not mark old rows expired.

**Approach B: Read and mark expired rows during lookup**

- Keeps data tidy opportunistically.
- Adds writes to a hot path.

**Approach C: Cache current plan on user row**

- Fast reads.
- Risk of stale plan state.

#### Recommended approach with explanation

Choose **Approach A**. Current-plan lookup should be a pure read; admin cleanup handles expiry state hygiene separately.

#### Answer

Approach A


---

### 26. Should subscription status be cached in the session?

#### Why ask this question

Caching plan state in auth/session can make UI and rate-limit lookup faster, but paid access changes asynchronously via webhooks.

#### Common approaches to resolve

**Approach A: Do not cache plan in session**

- Always query subscription state when needed.
- Avoids stale paid/free status.

**Approach B: Cache plan in session and refresh on login**

- Faster UI.
- Can be stale after payment settlement or expiry.

**Approach C: Cache with short TTL**

- Balances speed and freshness.
- Adds cache invalidation complexity.

#### Recommended approach with explanation

Choose **Approach A** for correctness. Avoid session-cached plan state until there is a measured performance issue.

#### Answer

Approach A

---

### 27. Should checkout response include only `redirectUrl` or also the Snap token?

#### Why ask this question

Midtrans Snap can be integrated via redirect URL or client-side Snap token. The response shape influences frontend implementation and security exposure.

#### Common approaches to resolve

**Approach A: Return only `redirectUrl`**

- Simple redirect-based checkout.
- Keeps frontend integration smaller.

**Approach B: Return both `token` and `redirectUrl`**

- Supports embedded Snap or redirect.
- Exposes more provider detail to the client.

**Approach C: Return local order ID only and let route redirect server-side**

- Hides provider response.
- Adds route/controller complexity.

#### Recommended approach with explanation

Choose **Approach A** if the UI will use Midtrans hosted redirect. Store the token internally for support/reconciliation but do not expose it unless embedded Snap is needed.

#### Answer

approach B

---

### 28. What callback URLs should be sent to Midtrans?

#### Why ask this question

The Midtrans schema supports `callbacks.finish` and `callbacks.error`. Correct callback URLs improve user return behavior after payment completion or failure.

#### Common approaches to resolve

**Approach A: No custom callbacks**

- Relies on Midtrans defaults/dashboard settings.
- Less control over user return flow.

**Approach B: Use fixed app routes for finish/error**

- Example: `/subscription/return` and `/subscription/error`.
- Predictable UI behavior.

**Approach C: Include order-specific callback URLs**

- Easier to load exact order after return.
- Must avoid leaking sensitive data and handle URL construction carefully.

#### Recommended approach with explanation

Choose **Approach C** if route design exists; otherwise **Approach B** is enough. The return route should refresh the user's own order status rather than trusting URL parameters.

#### Answer

Approach A

---

### 29. Should the webhook route return success for duplicate notifications?

#### Why ask this question

Payment providers commonly retry notifications. Duplicate successful notifications should not create duplicate periods or referral rewards, but the provider should receive a response that stops unnecessary retries.

#### Common approaches to resolve

**Approach A: Return success after idempotent no-op**

- Stops retries for already-processed notifications.
- Requires detecting processed orders safely.

**Approach B: Return conflict for duplicates**

- Semantically explicit.
- May cause provider retries or noisy logs.

**Approach C: Ignore duplicates without response control**

- Risky and unclear.

#### Recommended approach with explanation

Choose **Approach A**. Duplicate valid notifications should be processed as idempotent no-ops and return a successful HTTP response.

#### Answer

Approach A


---

### 30. Should unknown Midtrans statuses fail closed or be stored as pending?

#### Why ask this question

Provider APIs can introduce or return unexpected statuses. The service needs a safe default that does not accidentally grant access.

#### Common approaches to resolve

**Approach A: Fail closed and do not activate**

- Safest for paid access.
- May require manual reconciliation if provider adds statuses.

**Approach B: Treat unknown as pending**

- Keeps order unresolved.
- Still avoids activation.

**Approach C: Throw and do not update local state**

- Loud failure.
- Can cause repeated webhook failures.

#### Recommended approach with explanation

Choose **Approach B**. Store the raw unknown status, keep local order pending or conflicted, log it, and do not activate access.

#### Answer

Approach B


---

### 31. Should payment status conflicts have a dedicated order status?

#### Why ask this question

Conflicts such as amount mismatch, invalid signature, unknown status, or impossible transition are different from normal failed payments. They often require admin review.

#### Common approaches to resolve

**Approach A: Use `FAILED` for all conflicts**

- Simple.
- Loses the distinction between user payment failure and system/provider conflict.

**Approach B: Add `CONFLICT` or `REVIEW_REQUIRED` order status**

- Makes admin/support handling clearer.
- Adds one more status and transition path.

**Approach C: Keep status unchanged and log conflict**

- Avoids status expansion.
- Conflicts can be missed.

#### Recommended approach with explanation

Choose **Approach B**. Add a local `CONFLICT` or `REVIEW_REQUIRED` order status for cases where the system should not activate access and needs human/admin review.

#### Answer

Approach B


---

### 32. Should the first implementation include admin list/detail views or only service commands?

#### Why ask this question

Several decisions mention admin cleanup, retry, and review. A service can expose commands without building admin UI, but unresolved conflicts may be hard to operate.

#### Common approaches to resolve

**Approach A: Service commands only**

- Keeps scope small.
- Admin actions may need scripts/tests rather than UI.

**Approach B: Minimal admin queries for orders needing review**

- Supports operations without full admin UI.
- Adds authorization and query work.

**Approach C: Full admin dashboard**

- Best operations UX.
- Too large for first implementation.

#### Recommended approach with explanation

Choose **Approach A** for the initial service plan, unless admin operations are required at launch. Add minimal admin queries only when there is a concrete UI or support workflow.

#### Answer

Approach A

---

### 33. Should subscription payment processing store failure reason for user display?

#### Why ask this question

The UI may need to tell users whether payment is pending, expired, denied, or failed. Storing raw provider messages can leak confusing provider language.

#### Common approaches to resolve

**Approach A: Store raw provider status message and show it**

- Easy.
- Can expose technical or inconsistent messages.

**Approach B: Store raw message for support, map to user-safe display status**

- Better UX and diagnostics.
- Requires mapping statuses to display copy.

**Approach C: Do not store failure reason**

- Minimal.
- Poor support/debugging.

#### Recommended approach with explanation

Choose **Approach B**. Store provider message for diagnostics, but UI should display app-owned status labels and messages.

#### Answer

Approach A


---

### 34. Should subscription commands use shared result envelopes or throw on expected failures?

#### Why ask this question

Existing specs often describe `{ success: true, data }` and domain error codes. Subscription should follow a consistent command/query contract before tests are written.

#### Common approaches to resolve

**Approach A: Return typed result envelopes for expected domain failures**

- Easier UI handling and tests.
- More boilerplate.

**Approach B: Throw for all failures**

- Simpler handler code.
- Expected business cases become exceptions.

**Approach C: Mix result envelopes for remote commands and throws internally**

- Practical if project patterns already do this.
- Needs clear boundary rules.

#### Recommended approach with explanation

Choose the existing project service pattern. If no single pattern is enforced, choose **Approach A** for expected subscription/payment failures and reserve throws for unexpected infrastructure errors.

#### Answer

Use existing pattern from other service


---

### 35. Should subscription period dates use UTC only?

#### Why ask this question

Rate Limiter uses UTC windows. Subscription period starts/ends should also avoid timezone ambiguity, especially when deriving current access and displaying expiry.

#### Common approaches to resolve

**Approach A: Store UTC timestamps and display in local timezone**

- Standard and predictable.
- UI handles localization.

**Approach B: Store user-local dates**

- More user-friendly at the storage layer.
- Harder to reason about and query consistently.

**Approach C: Store date-only periods**

- Simpler display.
- Loses exact settlement/start time behavior.

#### Recommended approach with explanation

Choose **Approach A**. Store all subscription timestamps as UTC instants and let UI localize display.

#### Answer

UTC only approach A


---

### 36. Should subscription expose a cleanup command for pending orders separately from period expiry cleanup?

#### Why ask this question

Pending order cleanup and period expiry cleanup have different timing and safety rules. Combining them can make the command harder to reason about.

#### Common approaches to resolve

**Approach A: One combined cleanup command**

- Simple admin surface.
- Must handle multiple cleanup modes safely.

**Approach B: Separate cleanup commands**

- `CleanupExpiredSubscriptionPeriods` and `CleanupStaleSubscriptionOrders`.
- Clear behavior and tests.

**Approach C: No cleanup commands initially**

- Current lookup can remain correct without cleanup.
- Leaves stale rows indefinitely.

#### Recommended approach with explanation

Choose **Approach A** if the command returns separate counts for orders and periods. Choose **Approach B** if the implementation grows complex.

#### Answer

Approach A


---

### 37. Should plan precedence be encoded as numeric rank or hardcoded comparison helper?

#### Why ask this question

Current-plan lookup must choose `PREMIUM` over `PRO` when periods overlap. The comparison must be deterministic and type-safe.

#### Common approaches to resolve

**Approach A: Hardcoded ordered array**

- Example: `['FREE', 'PRO', 'PREMIUM']`.
- Simple and type-safe.

**Approach B: Numeric rank map**

- Example: `{ FREE: 0, PRO: 1, PREMIUM: 2 }`.
- Easy comparisons and sorting.

**Approach C: Store rank in database**

- Dynamic.
- Unneeded with hardcoded plans.

#### Recommended approach with explanation

Choose **Approach B**. A typed rank map makes highest-plan selection straightforward and keeps the logic near hardcoded plan constants.

#### Answer

Use the price to decide, expensive one will prioritized


---

### 38. Should `PREMIUM` renewal extend only premium periods or all active paid access?

#### Why ask this question

If users have overlapping `PRO` and `PREMIUM` periods, renewal extension rules need to decide which period's `endsAt` becomes the base.

#### Common approaches to resolve

**Approach A: Extend from same-plan active period only**

- `PREMIUM` renewal extends current premium access.
- Simple and plan-specific.

**Approach B: Extend from highest active paid period regardless of plan**

- Keeps continuous paid access but can mix tiers strangely.

**Approach C: Always start from now**

- Simple.
- Can waste remaining active time.

#### Recommended approach with explanation

Choose **Approach A**. Same-plan renewal should extend from the active/future period of the same plan, or from now if none exists.

#### Answer

Approach A

---

### 39. Should upgrade activation create a new period starting now or settlement time?

#### Why ask this question

Question 25 in the first file answered local processing time for startsAt. Upgrade behavior should explicitly follow the same rule so current-plan lookup changes immediately after processing.

#### Common approaches to resolve

**Approach A: Start at local processing time**

- Matches first-file answer.
- Upgrade takes effect as soon as backend processes settlement.

**Approach B: Start at provider transaction time**

- Reflects payment time.
- Conflicts with the chosen local processing time rule.

**Approach C: Start at next lower-plan expiry**

- Avoids overlap.
- Does not provide immediate upgrade.

#### Recommended approach with explanation

Choose **Approach A**. Upgrades should create a new higher-plan period starting at local processing time.

#### Answer

Approach A


---

### 40. Should subscription support promotional or referral discounts in the first version?

#### Why ask this question

Referral points exist, but the current subscription plan does not say whether points can discount purchases. Discounts affect amount validation, order snapshots, and Midtrans gross amount.

#### Common approaches to resolve

**Approach A: No discounts in first version**

- Keeps billing simple.
- Referral points remain reward/accounting only.

**Approach B: Support fixed discount codes**

- Enables promotions.
- Requires coupon validation and amount calculations.

**Approach C: Allow referral points to reduce subscription price**

- Connects referral to monetization.
- Requires point redemption, balance locking, refunds, and abuse handling.

#### Recommended approach with explanation

Choose **Approach A**. Do not support discounts or referral-point redemption in the first subscription implementation.

#### Answer

Approach A


---

## Recommended Next Step

Answer these follow-up questions before converting the Subscription service into a final `SPECS.md` and implementation plan. The highest-impact unanswered areas are table columns, order/period transition rules, duplicate pending order behavior, referral side-effect recovery, and admin repair scope.
