# Plan Service Specs

Source specs:

- [Define plan domain entities and database schema](https://github.com/falentio/sinnau.com/issues/8)
- [Define plan lifecycle rules](https://github.com/falentio/sinnau.com/issues/9)
- [Define payment gateway abstraction and Midtrans boundary](https://github.com/falentio/sinnau.com/issues/10)
- [Define order creation and checkout API contracts](https://github.com/falentio/sinnau.com/issues/11)
- [Define webhook handling and transaction history semantics](https://github.com/falentio/sinnau.com/issues/12)
- [Define AI-limit service integration for plan benefits](https://github.com/falentio/sinnau.com/issues/13)

## Domain Boundary

Plan owns user entitlements for AI-gated features.

Plan is responsible for:

- defining hardcoded paid tiers (LITE, PLUS, PREMIUM) and their prices/benefits
- creating and tracking purchase orders
- initiating QRIS payments through the existing Midtrans client
- applying plan lifecycle rules on successful payment
- handling Midtrans webhooks to update order and plan state
- exposing the active plan to the AI-limit service

Plan is not responsible for:

- UI/UX purchase flow
- recurring subscriptions or automatic renewal
- supporting multiple payment providers (Midtrans QRIS only)
- deciding which features are AI-gated (AI-limit and feature callers decide that)
- referral points, discounts, or promotions beyond fixed duration discounts

## Entities

```typescript
interface UserPlan {
  id: string; // usp_*
  userId: string; // → user.id
  planKey: "LITE" | "PLUS" | "PREMIUM";
  startedAt: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface Order {
  id: string; // ord_*
  userId: string; // → user.id
  planKey: "LITE" | "PLUS" | "PREMIUM";
  durationMonths: 1 | 6 | 12;
  sku: string; // e.g. "lite-1m", "plus-6m", "premium-12m"
  grossAmount: number; // IDR, whole rupiah
  appliedAt: Date | null; // timestamp of payment confirmation (null while PENDING)
  status: "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";
  expiresAt: Date | null; // pending order expiry
  createdAt: Date;
  updatedAt: Date;
}

interface Payment {
  id: string; // pay_*
  orderId: string; // → order.id
  userId: string; // → user.id
  gateway: "midtrans";
  gatewayTransactionId: string | null;
  gatewayOrderId: string; // same as order.id
  amount: number; // IDR, matches order.grossAmount
  status: "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED" | "REFUNDED";
  payload: string | null; // JSON gateway request/response body
  createdAt: Date;
  updatedAt: Date;
}
```

## Plan Catalog

No database table. Plans are hardcoded constants in `src/lib/schemas/plan.constant.ts`.

| Plan    | Monthly Price (IDR) | Monthly Generate Limit | Benefits                                                                    |
| ------- | ------------------- | ---------------------- | --------------------------------------------------------------------------- |
| LITE    | 30,000              | 60                     | unlimited quiz attempts, FSRS flashcard session, weak chapter spot analysis |
| PLUS    | 50,000              | 120                    | all LITE benefits, 2x generate limit                                        |
| PREMIUM | 100,000             | 360                    | all LITE benefits, 6x generate limit                                        |

### Duration pricing

- 1 month: full monthly price
- 6 months: pay for 5 months
- 12 months: pay for 9 months

Example gross amounts:

| Plan    | 1 month | 6 months | 12 months |
| ------- | ------- | -------- | --------- |
| LITE    | 30,000  | 150,000  | 270,000   |
| PLUS    | 50,000  | 250,000  | 450,000   |
| PREMIUM | 100,000 | 500,000  | 900,000   |

## Field Rules

- `id` values are server-generated using `generateId("usp_")`, `generateId("ord_")`, and `generateId("pay_")`.
- `planKey` is one of `PLAN_KEYS`.
- `durationMonths` is one of `PLAN_DURATIONS`.
- `sku` is derived as `{planKey.toLowerCase()}-{durationMonths}m`.
- `grossAmount` is computed from the plan catalog and duration discount.
- `Order.status` is the domain lifecycle source of truth.
- `Payment.status` mirrors the gateway attempt state; webhook handling does not create new payment rows.
- `expiresAt` on an order is the pending payment expiry (from Midtrans QRIS expiry). `UserPlan.expiresAt` is the entitlement expiry.
- Timestamps are stored as `timestamp_ms`.

## Lifecycle Rules

1. **Same-tier extension.** Buying the same tier while already active extends `expiresAt` from the current expiry date.
2. **Cross-tier upgrade replaces immediately.** Buying a higher tier starts the new plan from the payment-success date and discards remaining time on the old plan.
3. **Downgrade prohibited.** While a higher-tier plan is active, purchasing a lower tier is rejected.
4. **Re-purchase after expiry starts fresh.** After expiry, a new purchase begins from the payment-success date.
5. **No grace period.** The plan is active up to and including `expiresAt`; after that, AI-gated features are unavailable until a new plan is purchased.
6. **Pending/unpaid orders do not affect plan state.** Only successful payment confirmation modifies `UserPlan`.

## Order Status Transitions

| From      | To          | Trigger                                                           |
| --------- | ----------- | ----------------------------------------------------------------- |
| `PENDING` | `PAID`      | Midtrans `capture`/`settlement` webhook                           |
| `PENDING` | `EXPIRED`   | Midtrans `expire` webhook or pending expiry                       |
| `PENDING` | `CANCELLED` | Midtrans `deny`/`cancel`/`failure` webhook                        |
| `PAID`    | `CANCELLED` | Midtrans `deny`/`cancel`/`refund`/`chargeback` webhook (reversal) |

Terminal statuses (`EXPIRED`, `CANCELLED`) accept no further changes.

## Webhook Handling

The plan barrel file wires the listener:

```ts
midtrans.on("webhook:received", (body) => planService.handleWebhook(body));
```

`PlanService.handleWebhook`:

1. Looks up the order by `body.order_id`.
2. Ignores the webhook when the same `transaction_id` has already been processed and the order's current `status` already matches the target derived from `transaction_status`.
3. Validates the status transition against the state machine above.
4. Updates `Order.status` accordingly.
5. On `settlement`, applies the plan lifecycle rule.
6. On reversal/refund/chargeback, recalculates the plan from remaining paid orders.
7. Does not create separate notification rows; gateway payload context lives in the `Payment` row created at checkout.

## Commands

### Checkout

```typescript
interface CheckoutInput {
  planKey: "LITE" | "PLUS" | "PREMIUM";
  durationMonths: 1 | 6 | 12;
}

interface CheckoutOutput {
  orderId: string;
  grossAmount: number;
  currency: "IDR";
  paymentType: "QRIS";
  paymentData: {
    qrString: string;
    actions: Array<{ name: string; method: string; url: string }>;
  };
  expiresAt: string; // ISO 8601
}
```

- Requires authentication.
- Validates the plan/duration combination.
- Rejects the purchase if it would downgrade from an active higher-tier plan.
- Creates an `Order` in `PENDING` status.
- Creates a `Payment` row in `PENDING` status.
- Calls `midtrans.createQris(...)` using the domain `order.id` as Midtrans `order_id`.
- Stores the returned Midtrans `transaction_id` and response payload on the `Payment` row.
- Returns payment instructions to the client.
- No idempotency — each call creates a fresh order.

### HandleWebhook

```typescript
interface HandleWebhookInput {
  // Midtrans WebhookBody shape
}
```

- Server-side only; invoked by the `midtrans.on("webhook:received", ...)` listener.
- Updates order status and plan state per the rules above.

## Queries

### ListPlans

```typescript
interface ListPlansOutput {
  key: "LITE" | "PLUS" | "PREMIUM";
  name: string;
  benefits: string[];
  monthlyPrice: number;
  durations: Array<{
    months: 1 | 6 | 12;
    grossAmount: number;
    discountLabel: string;
  }>;
}
[];
```

- Public query.
- Returns the hardcoded catalog with computed discounted prices.

### ListOrders

```typescript
interface ListOrdersInput {
  page?: number; // default 1
}

interface ListOrdersOutput {
  data: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

- Requires authentication.
- Returns the authenticated user's orders.
- Pagination: 20 per page, no filters.

### GetAiLimitPlanForUser

```typescript
interface GetAiLimitPlanForUserInput {
  userId: string;
}

interface AiLimitPlan {
  planKey: "LITE" | "PLUS" | "PREMIUM";
  daily: number;
  weekly: number;
}
```

- Requires authentication; also callable by authenticated clients over oRPC.
- Server-side query used by the AI-limit service via the `lookupAiLimitPlan` function export.
- Reads the active `UserPlan` row.
- Throws `NO_ACTIVE_PLAN` if no active plan exists.
- Maps monthly limits to daily/weekly limits:
  - `daily = ceil(monthly / 10)`
  - `weekly = ceil(monthly / 4)`

Resulting limits:

| Plan    | Monthly | Daily | Weekly |
| ------- | ------- | ----- | ------ |
| LITE    | 60      | 6     | 15     |
| PLUS    | 120     | 12    | 30     |
| PREMIUM | 360     | 36    | 90     |

## AI-Limit Wiring

The plan barrel file exports a lookup function:

```ts
export const lookupAiLimitPlan = (userId: string) =>
  planService.getAiLimitPlanForUser(userId);
```

`src/lib/server/services/ai-limit/index.ts` imports `lookupAiLimitPlan` from `../plan/index.ts` and passes it to `AiLimitService`, replacing the current `defaultLookupPlan`.

## Authorization

- `checkout`, `listOrder`, and `getAiLimitPlanForUser` require authentication.
- `listPlans` is public.
- `handleWebhook` is server-side only; signature verification is performed by `MidtransClient` before the event reaches the plan domain.

## Persistence

- `user_plan` table: `id`, `userId`, `planKey`, `startedAt`, `expiresAt`, `createdAt`, `updatedAt`.
  - Unique on `userId`.
  - Index on `(userId, expiresAt)`.
- `order` table: `id`, `userId`, `planKey`, `durationMonths`, `sku`, `grossAmount`, `appliedAt`, `status`, `expiresAt`, `createdAt`, `updatedAt`.
  - Index on `userId`.
  - Index on `(status, expiresAt)`.
- `payment` table: `id`, `orderId`, `userId`, `gateway`, `gatewayTransactionId`, `gatewayOrderId`, `amount`, `status`, `payload`, `createdAt`, `updatedAt`.
  - Unique on `(gateway, gatewayTransactionId)`.
  - Index on `orderId`.
  - Index on `userId`.
- All `userId` columns reference `user.id` with `onDelete: "cascade"`.
- `payment.orderId` references `order.id` with `onDelete: "cascade"`.

## Validation

- `planKey`: picklist from `PLAN_KEYS`.
- `durationMonths`: picklist from `PLAN_DURATIONS`.
- `page`: positive integer, default 1.
- Use `queryParamIntegerSchema` (accepts HTTP query strings via `v.union([v.string(), v.number()])` + transform) where applicable.

## Errors

- `UNAUTHORIZED`: missing auth.
- `VALIDATION_FAILED`: invalid plan key, duration, or request payload.
- `DOWNGRADE_NOT_ALLOWED`: user has an active higher-tier plan.
- `NO_ACTIVE_PLAN`: AI-limit lookup called for a user with no active plan.
- `NOT_FOUND`: order or payment not found.
- `PAYMENT_GATEWAY_ERROR`: Midtrans API returned an error during checkout.

## Deferred / Out Of Scope

- UI/UX purchase flow.
- Admin-configurable plan catalog.
- Recurring payments / subscriptions.
- Non-Midtrans payment providers.
- Refund/chargeback policy beyond revoking the plan change (e.g., pro-rata, support workflow).
- Audit/log retention rules.
- Referral points or additional discounts.
