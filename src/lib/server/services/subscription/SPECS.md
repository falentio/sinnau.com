# Subscription Service Specs

Source specs:

- `docs/superpowers/specs/2026-05-23-subscription-service-questions.md`
- `docs/superpowers/specs/2026-05-23-subscription-service-follow-up-questions.md`
- `docs/superpowers/specs/2026-05-23-subscription-duration-discount-questions.md`

## Domain Boundary

Subscription owns paid access lifecycle, checkout orders, payment reconciliation, and current plan lookup.

Subscription is responsible for:

- creating Midtrans Snap checkout orders for authenticated users
- storing local subscription orders and paid access periods
- snapshotting purchase terms on each order
- validating payment updates from Midtrans before granting access
- granting, extending, expiring, refunding, revoking, and manually granting paid access periods
- returning the authenticated user's current subscription status for UI
- exposing a server-only current plan lookup for Rate Limiter and other server domains
- orchestrating referral point awards after successful paid orders
- cleaning up stale pending orders and expired periods through an admin-only command

Subscription is not responsible for:

- enforcing AI generation quota; Rate Limiter owns quota enforcement
- storing rate-limit usage or mutating rate-limit counters on plan changes
- owning payment gateway HTTP details; Midtrans service owns provider API calls
- owning referral profile, relationship, or point persistence
- recurring billing, saved payment methods, or automatic renewal
- coupon codes, promotional codes, referral point redemption, or arbitrary discounts
- subscription analytics dashboards or full admin UI in the first version

## Entities

```typescript
type SubscriptionPlanKey = "FREE" | "PRO" | "PREMIUM";
type SubscriptionPaidPlanKey = Exclude<SubscriptionPlanKey, "FREE">;
type SubscriptionDurationKey = "MONTHLY" | "QUARTERLY" | "SEMI_ANNUAL";

type SubscriptionOrderStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "EXPIRED"
  | "CANCELED"
  | "REFUNDED"
  | "CONFLICT";

type SubscriptionPeriodStatus = "ACTIVE" | "EXPIRED" | "REFUNDED" | "REVOKED";
type ReferralRewardStatus = "NOT_APPLICABLE" | "PENDING" | "AWARDED" | "FAILED";

interface SubscriptionOrder {
  id: PrefixedId<"sbo">;
  userId: string;
  planKey: SubscriptionPaidPlanKey;
  durationKey: SubscriptionDurationKey;
  durationDays: number;
  amount: number;
  status: SubscriptionOrderStatus;
  snapToken?: string;
  redirectUrl?: string;
  midtransOrderId: string;
  midtransTransactionId?: string;
  paymentType?: string;
  grossAmount?: number;
  transactionStatus?: string;
  fraudStatus?: string;
  statusCode?: string;
  statusMessage?: string;
  paidAt?: Date;
  expiresAt: Date;
  lastSyncedAt?: Date;
  referralRewardStatus: ReferralRewardStatus;
  createdAt: Date;
  updatedAt: Date;
}

interface SubscriptionPeriod {
  id: PrefixedId<"sbp">;
  orderId?: PrefixedId<"sbo">;
  userId: string;
  planKey: SubscriptionPaidPlanKey;
  durationKey: SubscriptionDurationKey;
  durationDays: number;
  status: SubscriptionPeriodStatus;
  startsAt: Date;
  endsAt: Date;
  refundedAt?: Date;
  expiredAt?: Date;
  revokedAt?: Date;
  manualGrantReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SubscriptionStatus {
  planKey: SubscriptionPlanKey;
  activePeriod?: SubscriptionPeriod;
  pendingOrder?: Pick<
    SubscriptionOrder,
    "id" | "planKey" | "durationKey" | "amount" | "redirectUrl" | "expiresAt"
  >;
  canCreateCheckout: boolean;
  canRenew: boolean;
  canUpgrade: boolean;
}
```

## Plans And Durations

- Plan keys reuse the existing hardcoded product plans: `FREE`, `PRO`, and `PREMIUM`.
- Only `PRO` and `PREMIUM` are valid checkout plan keys.
- `FREE` is implicit; users without an active paid period are on `FREE`.
- Plan display prices may remain shortened for UI, but Subscription billing uses server-owned IDR amounts.
- Initial monthly billing amounts are `PRO = 30_000` IDR and `PREMIUM = 60_000` IDR.
- Currency is always IDR and is not stored on order rows.
- Supported duration keys are `MONTHLY`, `QUARTERLY`, and `SEMI_ANNUAL`.
- `MONTHLY` grants `30` days and uses multiplier `1/1`.
- `QUARTERLY` grants `90` days and charges monthly amount × `3` × `8/9`.
- `SEMI_ANNUAL` grants `180` days and charges monthly amount × `6` × `12/18`.
- Discount multipliers are stored as constants alongside plan billing constants.
- Discounted amounts are floored to IDR integers.
- Duration discounts apply to all paid plans.
- Checkout input accepts `durationKey`, not raw month or day counts.
- `durationKey` and `durationDays` are stored on both orders and periods.
- Period cleanup and current-plan lookup use `startsAt` and `endsAt`, not duration assumptions.

## Pricing Examples

- `PRO` monthly: `30_000`.
- `PRO` quarterly: `floor(30_000 * 3 * 8 / 9) = 80_000`.
- `PRO` semi-annual: `floor(30_000 * 6 * 12 / 18) = 120_000`.
- `PREMIUM` monthly: `60_000`.
- `PREMIUM` quarterly: `floor(60_000 * 3 * 8 / 9) = 160_000`.
- `PREMIUM` semi-annual: `floor(60_000 * 6 * 12 / 18) = 240_000`.

## Lifecycle Rules

- This is one-time paid access, not recurring subscription billing.
- A successful paid order grants one paid access period.
- Subscription periods store UTC timestamps.
- `startsAt` uses local processing time when payment activation is processed.
- Monthly, quarterly, and semi-annual periods last exactly `durationDays` from their computed start.
- Same-plan renewal is allowed anytime and has no prepaid cap.
- Same-plan renewal extends from the later of local processing time or the latest same-plan active/future `endsAt`.
- Higher-plan purchases activate immediately and create a new higher-plan period from local processing time.
- Existing lower-plan periods remain unchanged when a higher-plan period activates.
- Current-plan lookup chooses the most expensive active paid plan when active periods overlap.
- Lower-plan checkout is rejected while a higher paid plan is active, regardless of selected duration.
- Lower-plan scheduled downgrades are not supported.
- User cancellation is not supported in the first version.
- Admin may manually grant and revoke periods.
- Admin manual grants use the same `planKey` and `durationKey` package options as checkout and require a non-empty reason.
- Full refunds mark the order `REFUNDED`, mark the period `REFUNDED`, set `refundedAt`, and exclude it from current-plan lookup.
- Partial refunds are ignored because the product does not expect partial refunds.
- Generic revocation uses period status `REVOKED` for admin/provider-driven access removal.

## Order And Payment Rules

- Checkout requires authentication.
- Checkout is never available for unauthenticated users.
- Checkout must validate the requested plan transition before creating a local order or Midtrans transaction.
- Checkout does not implement backend idempotency in the first version.
- Multiple pending orders are allowed; frontend click prevention handles accidental duplicate clicks.
- Pending local orders expire after `1` hour.
- Snap transactions should also be created with a `1` hour expiry when the Midtrans integration supports it.
- Local order `id` uses a three-character project prefix, `sbo`.
- Local period `id` uses a three-character project prefix, `sbp`.
- Midtrans `order_id` equals the local subscription order ID.
- Store `midtransOrderId` separately even though it matches local `id` initially.
- Order rows snapshot `planKey`, `durationKey`, `durationDays`, and final `amount`.
- Plan keys may be added and removed from checkout availability, but historical plan keys are never removed from domain recognition.
- Provider `gross_amount` must match the local order `amount` before activation.
- Late settlement of a locally expired pending order still grants access if Midtrans reports valid `settlement` and amount matches.
- Successful order processing first updates order state, then creates or extends a period outside a single cross-step transaction for the first version.
- If period creation fails after order update, manual reconciliation/admin repair is required.

## Midtrans Status Rules

- Webhooks are handled at `src/routes/webhook/midtrans/+server.ts`.
- Webhook signatures must be verified before mutating subscription state.
- Webhook processing is synchronous for the first version.
- Duplicate valid notifications return success after idempotent no-op processing.
- Primary activation status is Midtrans `settlement` only.
- `pending` keeps the order `PENDING`.
- `expire` maps to `EXPIRED`.
- `cancel` maps to `CANCELED`.
- `deny` maps to `FAILED`.
- `refund` maps to `REFUNDED` and revokes paid access from current-plan lookup.
- `partial_refund` is ignored for access changes.
- Unknown provider statuses are stored as raw provider status, keep the order unresolved, log the event, and do not activate access.
- Amount mismatch, impossible transitions, or suspicious status updates mark the order `CONFLICT`.
- Midtrans selected fields are stored for diagnostics; full raw provider payloads are not stored by default.
- Store raw provider status message and expose it where existing service patterns permit.
- No custom callback URLs are sent to Midtrans in the first version.
- Checkout response returns both Snap `token` and `redirectUrl`.

## Referral Reward Rules

- Referral rewards are awarded after successful paid order activation.
- Subscription calls Referral with idempotency key `subscription-order:<orderId>`.
- Referral point value is `floor(chargedAmount * 0.3)` with a maximum of `25_000` points.
- Referral reward is based on charged amount after duration discount.
- Referral reward processing happens after subscription activation and does not roll back paid access.
- `SubscriptionOrder.referralRewardStatus` tracks referral side-effect state.
- Orders without an eligible referral use `NOT_APPLICABLE`.
- Eligible paid orders start referral reward processing as `PENDING`.
- Successful referral award marks reward status `AWARDED`.
- Failed referral award marks reward status `FAILED` and can be retried by an admin/future repair command using the same idempotency key.

## Authorization

- User checkout and subscription status queries require authentication.
- User-facing commands infer `userId` from auth context and never accept client-provided `userId`.
- Users may refresh/reconcile only their own subscription orders.
- Admins may refresh/reconcile any subscription order.
- Webhook processing is authorized by verified Midtrans signature, not user session.
- Admin cleanup requires admin authorization.
- Admin manual grant/revoke requires admin authorization and a non-empty reason.
- Server-only `getCurrentPlanForUser(userId)` is available for internal service use and is not exposed to clients.

## Commands

### CreateSubscriptionCheckout

```typescript
interface CreateSubscriptionCheckoutCommand {
  planKey: "PRO" | "PREMIUM";
  durationKey: "MONTHLY" | "QUARTERLY" | "SEMI_ANNUAL";
}
```

- Requires authentication.
- Rejects `FREE` checkout.
- Validates plan and duration against hardcoded constants.
- Validates plan transition before creating any order.
- Calculates final IDR amount on the server.
- Creates a local `PENDING` order with a 1-hour `expiresAt`.
- Calls Midtrans Snap with local order ID as `order_id` and final amount as `gross_amount`.
- Sends available authenticated user customer details only.
- Does not send custom callback URLs.
- Stores Snap token and redirect URL on the order.
- Returns `{ success: true, data: { orderId; token; redirectUrl; expiresAt } }`.

### ProcessSubscriptionPaymentUpdate

```typescript
interface ProcessSubscriptionPaymentUpdateCommand {
  payload: MidtransTransactionStatusResponse;
}
```

- Server-side command called by the Midtrans webhook route.
- Verifies signature before applying state changes.
- Looks up local order by Midtrans `order_id`.
- Stores selected Midtrans status fields.
- Applies status mapping rules.
- Activates paid access only for valid `settlement` with matching amount.
- Is idempotent for duplicate valid notifications.
- Returns success for duplicate no-op notifications.

### RefreshSubscriptionOrderStatus

```typescript
interface RefreshSubscriptionOrderStatusCommand {
  orderId: PrefixedId<"sbo">;
}
```

- Requires authentication.
- Normal users can refresh only their own orders.
- Admin users can refresh any order.
- Calls Midtrans status API using the order ID.
- Reuses the same processing rules as webhook updates.
- Returns the updated order summary.

### CleanupSubscriptionRows

```typescript
interface CleanupSubscriptionRowsCommand {
  now?: Date;
}
```

- Requires admin authorization.
- Marks pending orders with `expiresAt <= now` as `EXPIRED`.
- Marks active periods with `endsAt <= now` as `EXPIRED` and sets `expiredAt`.
- Returns separate counts for expired orders and expired periods.
- Does not delete subscription or payment history in the first version.

### GrantSubscriptionPeriod

```typescript
interface GrantSubscriptionPeriodCommand {
  userId: string;
  planKey: "PRO" | "PREMIUM";
  durationKey: "MONTHLY" | "QUARTERLY" | "SEMI_ANNUAL";
  reason: string;
}
```

- Requires admin authorization.
- Validates non-empty reason.
- Uses the same duration package rules as checkout.
- Creates an `ACTIVE` period with no order ID.
- Starts at local processing time.
- Uses same-plan extension rules when applicable.

### RevokeSubscriptionPeriod

```typescript
interface RevokeSubscriptionPeriodCommand {
  periodId: PrefixedId<"sbp">;
  reason: string;
}
```

- Requires admin authorization.
- Validates non-empty reason.
- Marks the period `REVOKED` and sets `revokedAt`.
- Excludes the period from current-plan lookup immediately.

## Queries

### GetMySubscriptionStatus

```typescript
interface GetMySubscriptionStatusQuery {}
```

- Requires authentication.
- Returns the authenticated user's current plan, active period, pending order summary, and allowed actions.
- Does not return plan feature metadata.
- Does not mutate expired periods or pending orders.

### GetCurrentPlanForUser

```typescript
interface GetCurrentPlanForUserQuery {
  userId: string;
  now?: Date;
}
```

- Server-only helper/query for internal services.
- Not exposed to clients.
- Pure read; does not create or update rows.
- Returns highest active non-expired paid plan by price precedence, or `FREE` if none exists.
- Active means `status = 'ACTIVE'`, `startsAt <= now`, and `endsAt > now`.

## Persistence

- Use standard Drizzle schema definitions backed by D1.
- Add `subscription_order` with `id`, `userId`, `planKey`, `durationKey`, `durationDays`, `amount`, `status`, `snapToken`, `redirectUrl`, `midtransOrderId`, `midtransTransactionId`, `paymentType`, `grossAmount`, `transactionStatus`, `fraudStatus`, `statusCode`, `statusMessage`, `paidAt`, `expiresAt`, `lastSyncedAt`, `referralRewardStatus`, `createdAt`, and `updatedAt`.
- Add `subscription_period` with `id`, `orderId`, `userId`, `planKey`, `durationKey`, `durationDays`, `status`, `startsAt`, `endsAt`, `refundedAt`, `expiredAt`, `revokedAt`, `manualGrantReason`, `createdAt`, and `updatedAt`.
- Reference Better Auth `user.id` with `onDelete: 'cascade'`.
- Reference `subscription_order.id` from `subscription_period.orderId` with `onDelete: 'set null'` or nullable equivalent so paid access history can survive order cleanup if cleanup ever changes.
- Enforce unique `subscription_order.midtransOrderId`.
- Index order `userId`, `status`, `expiresAt`, and `createdAt`.
- Index order `midtransOrderId` for webhook/status lookup.
- Index period `userId`, `status`, `startsAt`, and `endsAt` for current-plan lookup and cleanup.
- Index period `orderId` for payment-to-period traceability.
- Store timestamps as timestamp milliseconds in Drizzle, following existing schema style.

## Validation

- Use Valibot schemas with `import * as v from 'valibot'`.
- Use `v.picklist` for plan keys, duration keys, order statuses, period statuses, and referral reward statuses.
- Validate paid checkout plans with `PRO` and `PREMIUM` only.
- Validate `durationDays`, `amount`, and referral points as positive safe integers.
- Validate `reason` as a trimmed non-empty string.
- Validate `orderId` and `periodId` with project prefixed ID helpers once available.
- Unknown fields are ignored by request payload schemas unless the existing command pattern changes.

## Errors

- `VALIDATION_FAILED`: invalid request payload, plan, duration, amount, ID, reason, or provider payload.
- `UNAUTHORIZED`: missing authenticated user for user/admin command.
- `FORBIDDEN`: user cannot access the order/period or caller lacks admin permission.
- `NOT_FOUND`: generic missing record fallback.
- `SUBSCRIPTION_ORDER_NOT_FOUND`: order does not exist.
- `SUBSCRIPTION_PERIOD_NOT_FOUND`: period does not exist.
- `SUBSCRIPTION_PLAN_NOT_AVAILABLE`: plan cannot be purchased.
- `SUBSCRIPTION_DURATION_NOT_AVAILABLE`: duration cannot be purchased.
- `SUBSCRIPTION_INVALID_TRANSITION`: requested plan transition is not allowed.
- `SUBSCRIPTION_PAYMENT_AMOUNT_MISMATCH`: provider gross amount does not match local order amount.
- `SUBSCRIPTION_PAYMENT_SIGNATURE_INVALID`: Midtrans signature verification failed.
- `SUBSCRIPTION_PAYMENT_CONFLICT`: payment update cannot be applied safely.
- `SUBSCRIPTION_REFERRAL_REWARD_FAILED`: referral reward side effect failed after activation.
- `MIDTRANS_REQUEST_FAILED`: Midtrans API call failed.

## Logging

- Use LogTape category `['sinnau', 'service', 'subscription']`.
- Log checkout creation, payment update processing, payment activation, refund, revocation, amount mismatch, invalid signature, unknown provider status, invalid transition, referral reward failure, and cleanup summaries.
- Do not log secrets, full payment payloads, server keys, or auth tokens.

## Testing

- Unit test constants and pricing helpers.
- Cover all paid plan/duration amount combinations.
- Cover duration day counts and floor rounding.
- Unit test command/query modules with mocked repositories, auth, Midtrans, and Referral.
- Integration test repositories against the existing D1 test setup.
- Cover checkout validation for paid plans, invalid `FREE` checkout, invalid duration, and disallowed lower-plan transitions.
- Cover order creation storing purchase snapshots and selected Midtrans fields.
- Cover checkout response returning `token` and `redirectUrl`.
- Cover webhook signature verification success and failure.
- Cover settlement activation with matching amount.
- Cover amount mismatch producing conflict and no access period.
- Cover late settlement after local expiry still activating access when valid.
- Cover duplicate settlement as idempotent no-op.
- Cover same-plan monthly/quarterly/semi-annual extension from latest same-plan end.
- Cover higher-plan activation starting at local processing time and preserving lower-plan period.
- Cover current-plan lookup choosing the most expensive active paid plan.
- Cover expired periods returning `FREE` without writes.
- Cover cleanup marking stale pending orders and expired periods with separate counts.
- Cover full refund excluding period from current plan.
- Cover partial refund ignored for access changes.
- Cover admin grant and revoke authorization, reason validation, and status effects.
- Cover referral reward point calculation as `floor(amount * 0.3)` capped at `25_000`.
- Cover referral reward success, failure marker, and idempotency key.

## Deferred Or Out Of Scope

- Recurring billing and automatic renewal are not supported.
- User cancellation is not supported.
- Scheduled lower-plan downgrades are not supported.
- Backend checkout idempotency is not supported.
- Preventing multiple pending orders is not supported.
- Coupon codes, promotional codes, arbitrary discounts, and referral point redemption are not supported.
- Full admin dashboard/list/detail views are not supported.
- Full raw Midtrans payload storage is not supported by default.
- Dynamic database-managed plan configuration is not supported.
- Multi-currency billing is not supported.
- Custom Midtrans callback URLs are not sent in the first version.
