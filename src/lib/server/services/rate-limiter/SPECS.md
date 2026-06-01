# Rate Limiter Service Specs

Source specs:

- `docs/superpowers/specs/2026-05-11-rate-limiter-referral-domain-questions.md`
- `docs/superpowers/specs/2026-05-11-rate-limiter-domain-additional-questions.md`

## Domain Boundary

Rate Limiter enforces AI generation quota for authenticated users.

Rate Limiter is responsible for:

- storing daily and weekly AI generation usage counters
- enforcing hardcoded plan limits for the current user plan
- atomically consuming quota before AI generation starts
- refunding consumed quota when AI generation fails
- returning current quota status for UI and calling domains
- cleaning up old usage and operation rows through an admin-only command

Rate Limiter is not responsible for:

- deciding how many units a specific AI generation costs
- calling AI providers
- owning subscription state or billing rules beyond reading the current plan
- analytics, reporting, or usage dashboards beyond current quota status
- dynamic database-managed plan configuration

## Entities

```typescript
type RateLimitWindowType = 'DAILY' | 'WEEKLY';
type RateLimitPlanKey = 'FREE' | 'PRO' | 'PREMIUM';

interface RateLimitUsage {
	id: UUID;
	userId: UUID;
	windowType: RateLimitWindowType;
	windowStart: Date;
	usedUnits: number;
	createdAt: Date;
	updatedAt: Date;
}

interface RateLimitOperation {
	id: UUID;
	userId: UUID;
	dailyUsageId: UUID;
	weeklyUsageId: UUID;
	amount: number;
	status: 'CONSUMED' | 'REFUNDED';
	createdAt: Date;
	refundedAt?: Date;
}

interface RateLimitWindowStatus {
	windowType: RateLimitWindowType;
	windowStart: Date;
	resetAt: Date;
	used: number;
	limit: number;
	remaining: number;
}

interface RateLimitStatus {
	planKey: RateLimitPlanKey;
	daily: RateLimitWindowStatus;
	weekly: RateLimitWindowStatus;
}
```

## Plan Limits

- Plan limits are hardcoded in TypeScript as a typed map.
- Supported plan keys are `FREE`, `PRO`, and `PREMIUM`.
- Each plan defines `dailyUnits` and `weeklyUnits`.
- Initial limits are `FREE = { dailyUnits: 1_000, weeklyUnits: 1_000 }`, `PRO = { dailyUnits: 5_000, weeklyUnits: 20_000 }`, and `PREMIUM = { dailyUnits: 9_000, weeklyUnits: 60_000 }`.
- Usage rows do not store `planKey`; limits are derived from the user's current plan at command time.
- Mid-window plan changes apply immediately because status and consumption compare current usage against the current plan.
- Unknown non-empty plan keys return `VALIDATION_FAILED`.

## Window Rules

- All windows use UTC+0.
- Daily windows start at `00:00:00.000Z` and reset at the next UTC day.
- Weekly windows use ISO weeks and start Monday at `00:00:00.000Z`.
- All users share the same daily and weekly reset cycles.
- A one-month subscription can span five weekly reset windows; this is accepted.
- `windowStart` is required because each user has one row per window type per UTC window.
- The unique usage key is `(userId, windowType, windowStart)`.
- `windowEnd` is not stored; reset time is derived from `windowType` and `windowStart`.
- Commands use `Date.now()` / `new Date()` directly for production time.

## Usage And Cost Rules

- Calling domains decide how many units a generation costs.
- `amount` must be a positive safe integer greater than `0`.
- Zero-cost work should skip Rate Limiter instead of passing `0`.
- A generation is allowed only when both daily and weekly quota have enough remaining units.
- If `amount` exceeds the daily or weekly plan limit by itself, consumption fails with `RATE_LIMIT_EXCEEDED` and no rows are changed.
- Usage rows are created lazily when quota is first consumed in a window.
- Quota status queries do not create usage rows; they synthesize `used: 0` when no row exists.
- Current usage rows are retained indefinitely until admin cleanup removes old rows.

## Consumption And Refund Rules

- Callers consume quota immediately before starting AI generation.
- `consumeGenerationQuota` performs check and consume together.
- Daily and weekly usage must be consumed atomically in a D1/Drizzle transaction.
- If either window would exceed its limit, neither window is incremented.
- Successful consumption creates a `RateLimitOperation` row with `status: 'CONSUMED'`.
- If AI generation fails, callers must call `refundGenerationQuota` once.
- Refund decrements daily and weekly counters atomically and marks the operation `REFUNDED`.
- Refund must never make either counter negative.
- Refund idempotency is caller-owned for the first version; callers must not call refund more than once for the same failed generation.
- Operation rows exist for audit/debugging and follow the same cleanup retention policy as usage rows.

## Authorization

- Quota status and consumption commands require authentication.
- `userId` is inferred from auth context and is never client-provided for user-facing commands.
- Plan lookup is owned by Rate Limiter; callers do not pass `planKey`.
- The admin cleanup command requires an admin role or permission.
- Normal authenticated users and AI generation callers cannot delete usage or operation rows.

## Commands

### ConsumeGenerationQuota

```typescript
interface ConsumeGenerationQuotaCommand {
	amount: number;
}
```

- Requires authentication.
- Loads the authenticated user's current plan internally.
- Validates `amount` as a positive safe integer.
- Lazily creates current daily and weekly usage rows when missing.
- Atomically checks and consumes both current-window counters.
- Creates a `RateLimitOperation` row for the consumed amount.
- Returns `{ success: true, data: { operationId: UUID; status: RateLimitStatus } }`.
- Returns `RATE_LIMIT_EXCEEDED` with status and requested amount when either window lacks quota.

### RefundGenerationQuota

```typescript
interface RefundGenerationQuotaCommand {
	operationId: UUID;
}
```

- Requires authentication.
- Refunds only operations owned by the authenticated user.
- Atomically decrements both related usage rows by the original operation amount.
- Marks the operation as `REFUNDED` and sets `refundedAt`.
- Returns `{ success: true, data: { status: RateLimitStatus } }`.

### CleanupRateLimitRows

```typescript
interface CleanupRateLimitRowsCommand {
	olderThanDays: 90;
}
```

- Requires admin authorization.
- Deletes usage and operation rows older than 90 days.
- Uses `windowStart` for usage row age.
- Uses `createdAt` for operation row age.
- Returns `{ success: true, deletedCount: number }`.

## Queries

### GetGenerationLimitStatus

```typescript
interface GetGenerationLimitStatusQuery {}
```

- Requires authentication.
- Loads the authenticated user's current plan internally.
- Returns daily and weekly status for the current UTC windows.
- Does not create missing usage rows.
- Missing usage rows are returned as `used: 0`.
- Returns `{ success: true, data: RateLimitStatus }`.

## Persistence

- Use standard Drizzle schema definitions backed by D1.
- Add `rate_limit_usage` with `id`, `userId`, `windowType`, `windowStart`, `usedUnits`, `createdAt`, and `updatedAt`.
- Add `rate_limit_operation` with `id`, `userId`, `dailyUsageId`, `weeklyUsageId`, `amount`, `status`, `createdAt`, and `refundedAt`.
- Reference `user.id` with `onDelete: 'cascade'`.
- Enforce usage uniqueness with a database-level unique constraint on `(userId, windowType, windowStart)`.
- Index `userId`, `windowType`, and `windowStart` for current-window lookups and cleanup.
- Index operation `userId`, `status`, and `createdAt` for refund and cleanup.

## Validation

- Use Valibot schemas with `import * as v from 'valibot'`.
- Use `v.picklist` for plan keys, window types, and operation status.
- Use `v.pipe(v.number(), v.integer(), v.safeInteger(), v.minValue(1))` for `amount`.
- Use the project ID validator helpers for command IDs once Rate Limiter ID prefixes are added.
- Unknown fields are ignored by request payload schemas unless the existing command pattern changes.

## Errors

- `VALIDATION_FAILED`: invalid amount, operation ID, cleanup request, current plan, or request payload.
- `UNAUTHORIZED`: missing authenticated user.
- `FORBIDDEN`: authenticated user cannot access or refund the operation, or caller lacks admin cleanup permission.
- `NOT_FOUND`: operation does not exist.
- `RATE_LIMIT_EXCEEDED`: daily or weekly quota would be exceeded; payload includes current status and requested amount.
- `RATE_LIMIT_REFUND_CONFLICT`: operation was already refunded or cannot be refunded safely.

## Testing

- Unit test command/query modules with mocked repositories, auth, and plan lookup.
- Integration test repositories against the existing D1 test setup.
- Cover UTC daily window start/reset calculations.
- Cover ISO Monday weekly window start/reset calculations.
- Cover missing status rows returning zero usage without writes.
- Cover lazy row creation on first consumption.
- Cover atomic daily/weekly consumption success and over-limit failure.
- Cover refund success, double-refund conflict, and non-negative counters.
- Cover cleanup deleting rows older than 90 days and returning `deletedCount`.

## Deferred Or Out Of Scope

- Dynamic plan configuration is not supported.
- Per-feature limits are not stored in this domain.
- Subscription lifecycle rules are not owned here.
- Analytics dashboards and historical usage reporting are not supported.
- Automatic scheduled cleanup is not supported.
- Caller-independent refund idempotency is not supported beyond operation status checks.
