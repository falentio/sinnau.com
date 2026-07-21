# Status: plan-service emits domain events, affiliate listens

## Objective

Wire the affiliate service to record a conversion when the plan service processes a successful payment. The plan service should emit domain events via `EventEmitter` instead of having the affiliate listen to Midtrans directly.

## Background

The plan service currently handles Midtrans webhooks in `PlanService.handleWebhook()`. When `transaction_status` is `settlement` or `capture`, it marks the order as `PAID` and recalculates the user's active plan via `deriveAndUpsert()`.

The affiliate service has a `recordConversion()` method but it's currently only exposed as an admin-only oRPC endpoint. It needs to be triggered automatically on payment success.

## Design Decision

The plan service should extend `EventEmitter` and emit a domain event (`"order:paid"`) _after_ the order is confirmed PAID. The affiliate service subscribes to this event independently. This keeps the affiliate decoupled from the payment gateway (Midtrans) and avoids race conditions (event fires after the order is fully processed).

## Changes

### 1. Make PlanService extend EventEmitter

**File:** `src/lib/server/services/plan/plan.service.ts`

- Add imports: `import { EventEmitter } from "node:events";`
- Define the event interface above the class:

```ts
export interface PlanServiceEvents {
  "order:paid": [
    payload: { userId: string; grossAmount: number; transactionId: string },
  ];
}
```

- Change `export class PlanService` to `export class PlanService extends EventEmitter<PlanServiceEvents>`
- In the constructor, call `super()`
- In `handleWebhook()`, after the `deriveAndUpsert` call inside `if (target === "PAID")` (around line 503), add:

```ts
this.emit("order:paid", {
  userId: order.userId,
  grossAmount: order.grossAmount,
  transactionId: body.transaction_id,
});
```

### 2. Add commission rate constant

**File:** `src/lib/schemas/affiliate.constant.ts`

```ts
export const AFFILIATE_COMMISSION_RATE = 0.35;
```

### 3. Add handlePaymentSuccess to AffiliateService

**File:** `src/lib/server/services/affiliate/affiliate.service.ts`

Import the constant at the top:

```ts
import { AFFILIATE_COMMISSION_RATE } from "$lib/schemas/affiliate.constant";
```

Add a new public method (no admin guard — called from event, not from a user-facing endpoint):

```ts
async handlePaymentSuccess(input: {
  purchaserUserId: string;
  purchaseAmount: number;
  transactionId: string;
}): Promise<void> {
  const affiliateUserId = await this.repo.findAffiliatedByUserId(input.purchaserUserId);
  if (!affiliateUserId || affiliateUserId === input.purchaserUserId) return;

  const existing = await this.repo.findConversionByTransactionId(input.transactionId);
  if (existing) return;

  await this.repo.insertConversion({
    affiliateUserId,
    commissionAmount: Math.round(input.purchaseAmount * AFFILIATE_COMMISSION_RATE),
    purchaseAmount: input.purchaseAmount,
    purchaserUserId: input.purchaserUserId,
    transactionId: input.transactionId,
  });
}
```

### 4. Subscribe to planService events in affiliate/index.ts

**File:** `src/lib/server/services/affiliate/index.ts`

```ts
import { planService } from "../plan/index.ts";

planService.on("order:paid", (payload) => {
  void affiliateService.handlePaymentSuccess({
    purchaserUserId: payload.userId,
    purchaseAmount: payload.grossAmount,
    transactionId: payload.transactionId,
  });
});
```

### 5. Write tests

**File:** `src/lib/server/services/plan/plan.service.test.ts`

Add a test for `handleWebhook` that verifies the event is emitted with the correct payload on PAID status.

**File:** `src/lib/server/services/affiliate/affiliate.service.test.ts`

Add tests for `handlePaymentSuccess` covering:

- No referrer → no conversion created
- Self-referral → no conversion created
- Duplicate transactionId → no conversion created
- Happy path → commission inserted with 35% of purchase amount

## Files changed (summary)

| File                                                          | Change                                      |
| ------------------------------------------------------------- | ------------------------------------------- |
| `src/lib/server/services/plan/plan.service.ts`                | Extend EventEmitter, emit `"order:paid"`    |
| `src/lib/schemas/affiliate.constant.ts`                       | Add `AFFILIATE_COMMISSION_RATE`             |
| `src/lib/server/services/affiliate/affiliate.service.ts`      | Add `handlePaymentSuccess()`                |
| `src/lib/server/services/affiliate/index.ts`                  | Subscribe to `planService.on("order:paid")` |
| `src/lib/server/services/plan/plan.service.test.ts`           | Test event emission                         |
| `src/lib/server/services/affiliate/affiliate.service.test.ts` | Test `handlePaymentSuccess`                 |
