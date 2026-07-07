# AI Limit Service Specs

Source specs:

- Derived from implementation on branch `feat/ai-limit` (`src/lib/server/services/ai-limit/*`).
- Supersedes the prior `rate-limiter` service (SPECS.md removed).

## Domain Boundary

AI Limit tracks and enforces AI generation quota for authenticated users.

AI Limit is responsible for:

- recording per-generation AI usage as append-only logs
- computing current daily and weekly used/remaining units from logs
- atomically consuming quota before AI generation starts
- soft-refunding consumed quota when generation fails
- returning current usage status for UI and calling domains

AI Limit is not responsible for:

- owning subscription/plan state (plan lookup is injected)
- deciding how many units a generation costs
- calling AI providers
- analytics or historical usage reporting

## Entities

```typescript
type AiLimitFeatureKey = string; // e.g. "generate", "summarize"

interface AiUsageLog {
  id: string; // prefixed "aiu"
  ownerId: string;
  featureKey: string;
  amount: number;
  referenceId: string | null;
  refundedAt: Date | null;
  createdAt: Date;
}

interface AiLimitWindow {
  limit: number;
  remaining: number;
  resetsAt: Date;
  used: number;
}

interface AiLimitUsage {
  daily: AiLimitWindow;
  planKey: string;
  weekly: AiLimitWindow;
}

interface AiLimitPlan {
  planKey: string;
  daily: number;
  weekly: number;
}
```

## Plan Limits

- Plan lookup is an injected async function `(userId) => Promise<AiLimitPlan>`.
- Current default returns `{ planKey: "FREE", daily: 5000, weekly: 20000 }`.
- `AI_LIMIT_DEFAULT_DAILY_LIMIT = 5000`, `AI_LIMIT_DEFAULT_WEEKLY_LIMIT = 20000`, `AI_LIMIT_DEFAULT_PLAN_KEY = "FREE"`, `AI_LIMIT_MAX_PER_REQUEST = 10_000_000`.
- Per-request `amount` is capped at `AI_LIMIT_MAX_PER_REQUEST`.
- Plan-keyed limit map (PRO/PREMIUM) is not wired yet; deferred to Subscription integration.

## Window Rules

- All windows use UTC+0.
- Daily windows start at `00:00:00.000Z` and reset at the next UTC day.
- Weekly windows use ISO weeks and start Monday at `00:00:00.000Z`, resetting `+7` days.
- Usage = `SUM(amount)` where `createdAt` in `[windowStart, windowEnd)` and `refundedAt IS NULL`.
- No stored per-window rows; windows are derived from `createdAt`.

## Usage And Cost Rules

- `amount` must be a positive safe integer: min `1`, max `AI_LIMIT_MAX_PER_REQUEST`.
- Generate callers decide cost; zero-cost work should skip consumption.
- A generation is allowed only when both daily and weekly remaining >= `amount`.
- If `amount` alone exceeds a limit, consumption fails fast with `AI_LIMIT_EXCEEDED`.
- Logs are append-only; refunds are soft deletes, never removed from the table.

## Consumption And Refund Rules

- Callers consume immediately before AI generation.
- `consume` checks `(dailyLimit, weeklyLimit)` then runs an atomic transaction:
  sum current daily/weekly (excl. refunded); if adding `amount` exceeds either
  limit, abort (return `EXCEEDED`); else insert a log row and return new totals.
- Idempotency: when `referenceId` is non-null, an existing
  `(ownerId, featureKey, referenceId)` log is returned without incrementing counters.
- On AI failure, callers call `refund(logId)` once.
- Refund sets `refundedAt`; already-refunded logs yield `AI_LIMIT_ALREADY_REFUNDED`.
- Refunded amounts are excluded from future `SUM` usage.

## Authorization

- All commands/queries require authentication; `userId` is inferred from auth context.
- Missing auth throws `UNAUTHORIZED` (guard `requireOwner`).
- Refund operates only on logs owned by the caller; otherwise `FORBIDDEN`.

## Commands

### ConsumeAiLimit

```typescript
interface ConsumeAiLimitInput {
  amount: number;
  featureKey: string;
  referenceId?: string | null;
}
```

> Implemented in service/repo/guard with full unit tests; **not yet exposed as an oRPC command**.

- Requires authentication.
- Hard-cap check: if `amount > dailyLimit || amount > weeklyLimit`, throws `AI_LIMIT_EXCEEDED` with `requestedAmount`, `daily.limit`, `weekly.limit`.
- Atomically checks and consumes both current-window counters.
- Returns `{ logId: string; usage: AiLimitUsage }`.

### RefundAiLimit

```typescript
interface RefundAiLimitInput {
  logId: string;
}
```

> Implemented in service/repo/guard with full unit tests; **not yet exposed as an oRPC command**.

- Requires authentication.
- Refunds only logs owned by the authenticated user (`FORBIDDEN` otherwise).
- Sets `refundedAt`; returns `AI_LIMIT_ALREADY_REFUNDED` when already refunded.
- Returns `{ refundedLogId: string; usage: AiLimitUsage }`.

## Queries

### GetAiLimitUsage

```typescript
interface GetAiLimitUsageInput {}
```

- Exposed as `aiLimitGetUsage` via `authorizedProcedure`.
- Requires authentication.
- Returns daily and weekly status for the current UTC windows.
- Does not create logs; missing usage is `used: 0`.
- Returns `{ success: true, data: AiLimitUsage }`.

## Persistence

- `ai_usage_log` (Drizzle, SQLite/D1) with `id` PK, `owner_id` FK→`user.id` `ON DELETE CASCADE`, `feature_key`, `amount`, `reference_id`, `refunded_at`, `created_at`.
- Index `(owner_id, created_at)`.
- Unique index `(owner_id, feature_key, reference_id)` for reference idempotency (nulls are not coalesced).
- Timestamps stored as `timestamp_ms`.

## Validation (valibot)

- `amount`: `v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(AI_LIMIT_MAX_PER_REQUEST))`.
- `featureKey`: trimmed string, length `1..64`.
- `referenceId`: `nullish`, trimmed string, length `1..256`.
- `logId` / `id`: prefixed-id schema `aiu_*`.

## Errors

- `UNAUTHORIZED`: missing auth.
- `FORBIDDEN`: refund on a log not owned by the caller.
- `AI_LIMIT_EXCEEDED`: `amount` exceeds a limit or window quota exhausted (payload includes `requestedAmount`, `daily.limit`, `weekly.limit` on the hard-cap path).
- `AI_LIMIT_ALREADY_REFUNDED`: refund applied to an already-refunded log.

## Testing

- `ai-limit.service.test.ts`: `getUsage`, `consume`, `refund` branches and error paths.
- `ai-limit.guard.test.ts`: auth/ownership rules.
- `ai-limit.repository.drizzle.test.ts`: real in-memory DB, window `SUM`, idempotent `referenceId`, atomic over-limit, soft-refund exclusion.
- `ai-limit.testing.ts`: mock repo/guard, fixtures, `AiLimitTestEnv`.

## Deferred / Out Of Scope

- Per-plan (PRO/PREMIUM) limit map and Subscription `getCurrentPlanForUser` wiring.
- Exposing `consume`/`refund` as oRPC commands/queries (service + repo ready).
- Admin cleanup of old logs.
- Analytics/historical usage dashboards.
