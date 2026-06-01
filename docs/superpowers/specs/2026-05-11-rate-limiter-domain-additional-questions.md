# Rate Limiter Domain Additional Questions

This document captures second-pass specification questions for the Rate Limiter domain after the first question set was answered.

Source context:

- `docs/superpowers/specs/2026-05-11-rate-limiter-referral-domain-questions.md`

---

### 1. Why does the usage row need `windowStart`?

#### Description

Should each usage row store the exact UTC start timestamp for the daily or weekly quota window, such as `2026-05-11T00:00:00.000Z` for a day or the ISO Monday start for a week?

#### Reasoning

`windowStart` is needed because the same user and same window type will have many historical daily and weekly rows over time. Without `windowStart`, the database can only store one `DAILY` row and one `WEEKLY` row per user forever, which cannot reset quota cleanly or retain history.

It also makes cleanup straightforward: admin cleanup can delete rows where `windowStart` is older than 90 days.

#### Common Approaches

**Approach A: Store `windowStart` on every row**

- Unique key is `(userId, windowType, windowStart)`.
- Each UTC day/week gets its own row.
- Easy to query current usage and delete old windows.
- Works with lazy row creation.

**Approach B: Store only `windowType` and mutate/reset the same row**

- One daily row and one weekly row per user.
- Requires reset logic when the current date changes.
- Loses history unless another table exists.
- Cleanup is not meaningful because rows are reused.

**Approach C: Store `windowStart` and `windowEnd`**

- Explicitly records both boundaries.
- Slightly redundant because `windowEnd` can be derived from `windowType` and `windowStart`.

#### Recommendation

Choose **Approach A**. Store `windowStart` as the canonical UTC bucket identity and derive reset times from `windowType`. Do not store `windowEnd` unless the UI or admin tooling later needs denormalized display data.

#### Your Answer

Approach A

---

### 2. What are the exact hardcoded plan keys and quota numbers?

#### Description

Which current plan keys should the rate limiter recognize, and what are the daily and weekly AI generation unit limits for each plan?

#### Reasoning

The existing answers choose hardcoded TypeScript plan limits and derive limits from the user's current plan. Implementation still needs the concrete plan enum and numbers so validation, tests, and UI status payloads are deterministic.

#### Common Approaches

**Approach A: Define explicit product plan keys only**

- Example: `FREE`, `PRO`, `PREMIUM`.
- Each key has `{ dailyUnits, weeklyUnits }`.
- Unknown plan keys are rejected or mapped explicitly.

**Approach B: Include internal/system plans**

- Adds keys such as `ADMIN`, `TEST`, or `UNLIMITED`.
- Useful for staff or automated testing.
- Can complicate production behavior if not carefully guarded.

**Approach C: Treat missing/unknown plan as free**

- Safer fallback for users without subscription state.
- Can hide integration bugs if a paid plan key is misspelled.

#### Recommendation

Choose **Approach A** plus an explicit fallback rule: missing plan uses `FREE`, but unknown non-empty plan keys return `VALIDATION_FAILED` or a domain error. Define exact daily and weekly unit numbers in the spec before implementation.

#### Your Answer

Approach A

---

### 3. How should the rate limiter derive the user's current plan?

#### Description

Should callers pass the current plan into `consumeGenerationQuota`, or should the rate limiter load the user's current plan from an auth/subscription source?

#### Reasoning

The existing direction says limits come from the current plan and other domains call the rate limiter directly. The boundary still needs to define whether the caller is responsible for providing the plan or whether the rate limiter owns plan lookup.

#### Common Approaches

**Approach A: Caller passes `planKey`**

- Simple rate limiter domain.
- Easy to unit test.
- Callers must consistently pass the correct current plan.

**Approach B: Rate limiter loads plan internally**

- Stronger centralization.
- Couples the rate limiter to subscription/auth infrastructure.
- More setup for tests.

**Approach C: Auth context contains plan**

- Commands read the authenticated user's current plan from session/context.
- Convenient when plan is already available there.
- Risky if session plan can become stale.

#### Recommendation

Choose **Approach A** for the first version. Accept `planKey` in command input or service-level parameters, and keep subscription lookup outside the rate limiter until there is a dedicated subscription domain.

#### Your Answer

Approach B

---

### 4. How should quota cost amounts be validated?

#### Description

What values are allowed for the generation cost amount passed by the AI generation domain?

#### Reasoning

The existing answer says generation domains decide how much a generation costs. The rate limiter must still protect itself from invalid amounts such as `0`, negative numbers, decimals, `Infinity`, or extremely large values.

#### Common Approaches

**Approach A: Positive integer units only**

- `amount` must be an integer greater than `0`.
- Simple and predictable.
- Matches usage counters.

**Approach B: Allow decimal units**

- Supports fractional costing.
- Requires more careful arithmetic and display rules.
- Not needed for the current simple limiter.

**Approach C: Allow zero-cost calls**

- Useful for free previews or admin/system calls.
- Can hide caller bugs if used accidentally.

#### Recommendation

Choose **Approach A**. Require `amount` to be a positive safe integer. If some generation should be free, it should skip calling `consumeGenerationQuota` rather than passing `0`.

#### Your Answer

Approach A

---

### 5. Should daily and weekly consumption be atomic together?

#### Description

When consuming quota, should the daily and weekly rows be updated in one transaction so either both counters increment or neither does?

#### Reasoning

The existing direction enforces both daily and weekly limits. If daily increments but weekly fails, the user can lose daily quota without a generation being allowed. If weekly increments but daily fails, weekly usage becomes incorrect.

#### Common Approaches

**Approach A: Single transaction for both rows**

- Upsert/check/update daily and weekly together.
- Rolls back both if either limit would be exceeded.
- Best consistency.

**Approach B: Update daily then weekly without transaction**

- Simpler code.
- Can leave partial consumption after errors.

**Approach C: Store daily and weekly counters in one row**

- Makes atomicity simpler for the current two counters.
- Less flexible and awkward for historical daily/weekly windows.

#### Recommendation

Choose **Approach A**. `consumeGenerationQuota` should atomically consume both daily and weekly quota or return `RATE_LIMIT_EXCEEDED` without changing either row.

#### Your Answer

Approach A, but we would use d1 + drizzle

---

### 6. Should refunds be atomic across daily and weekly rows?

#### Description

When generation fails after quota has already been consumed, should refund decrement both daily and weekly counters in one transaction?

#### Reasoning

The existing answer requires immediate consume before generation and refund on failure. Refund must mirror consume; otherwise one window can remain charged while the other is restored.

#### Common Approaches

**Approach A: Atomic refund of both rows**

- Decrements daily and weekly together.
- Prevents mismatched usage.
- Requires guards so counters cannot go below zero.

**Approach B: Best-effort refund**

- Simpler.
- Can leave incorrect usage after partial failure.

**Approach C: No separate refund command; caller handles it manually**

- Smallest rate limiter API.
- Duplicates quota logic outside the domain.

#### Recommendation

Choose **Approach A**. Add a rate limiter command such as `refundGenerationQuota(userId, planKey, amount)` that restores both current-window counters atomically and never allows negative usage.

#### Your Answer

Approach A

---

### 7. How should refund idempotency be handled?

#### Description

If a generation failure handler retries, should repeated refund calls be safe, or can they decrement quota multiple times?

#### Reasoning

Refunds happen in error paths, where retries and duplicate handling are common. Without idempotency, a duplicate refund can give users extra quota by reducing usage below the correct amount.

#### Common Approaches

**Approach A: Caller guarantees refund is called once**

- Minimal implementation.
- Risky if the caller retries after timeout or partial failure.

**Approach B: Add a `consumptionId` returned by consume and required by refund**

- Refund can be applied once per consumed operation.
- Strongest correctness.
- Requires a small operation/ledger table or metadata field.

**Approach C: Clamp counters at zero**

- Prevents negative values.
- Does not prevent duplicate refunds from reducing legitimate usage.

#### Recommendation

Choose **Approach B** if implementation can tolerate one small usage-operation record. If the first version must stay extremely small, choose **Approach A** but document that refund must be called at most once in the same generation control flow.

#### Your Answer

Approach A

---

### 8. Should consumption create an operation record or only update aggregate counters?

#### Description

Should the rate limiter store only aggregate usage rows, or also store per-generation consumption/refund records?

#### Reasoning

Aggregate rows are enough to enforce limits, but refund idempotency and support debugging are easier with operation records. The current requirement says usage rows, so an operation table should only be added if it solves a concrete first-version problem.

#### Common Approaches

**Approach A: Aggregate usage rows only**

- Minimal schema.
- Fast status queries.
- Refund idempotency is caller-owned.

**Approach B: Aggregate rows plus operation records**

- Supports `consumptionId`, refund-once behavior, and audit trails.
- More schema and cleanup work.
- Admin cleanup must delete old operation rows too.

**Approach C: Operation records only, aggregate on read**

- Strong auditability.
- More expensive status queries.
- Overkill for a simple hard limit.

#### Recommendation

Choose **Approach A** for the first version unless refund idempotency is required now. If idempotent refunds are required, use **Approach B** with the same `windowStart` retention cleanup policy.

#### Your Answer

Approach B with same retention cleanup policy

---

### 9. Should quota status queries create missing usage rows?

#### Description

When the UI asks for current quota status and no row exists for the current daily or weekly window, should the query create rows or return derived zero-usage status without writing?

#### Reasoning

The existing answer chooses lazy row creation. It still matters whether read-only status calls cause database writes, especially for users who open the UI but never generate content.

#### Common Approaches

**Approach A: Status query does not create rows**

- Returns `used: 0` for missing windows.
- Keeps reads side-effect free.
- Usage rows are only created by consume/refund/admin actions.

**Approach B: Status query upserts rows**

- Makes future consumes simpler because rows exist.
- Creates data for users who never generate.

**Approach C: Separate `ensureCurrentUsageRows` command**

- Explicit write operation.
- Probably unnecessary for first version.

#### Recommendation

Choose **Approach A**. `getGenerationLimitStatus` should be read-only and synthesize zero usage when rows are missing.

#### Your Answer

Approach A

---

### 10. What should happen if the requested amount exceeds the daily or weekly limit by itself?

#### Description

If a single generation costs more units than the user's daily or weekly plan limit, should it always fail, partially consume available quota, or be allowed by special case?

#### Reasoning

Generation domains can pass variable costs. A high-cost generation may exceed the plan limit even when the user has used nothing. The command must define this clearly.

#### Common Approaches

**Approach A: Fail with `RATE_LIMIT_EXCEEDED`**

- Simple hard limit behavior.
- No partial consumption.
- Caller can show that the generation cost exceeds the user's plan.

**Approach B: Allow if current usage is zero**

- Lets expensive one-off generations happen.
- Violates the hard daily/weekly cap.

**Approach C: Partially consume remaining quota**

- Bad fit for generation because the operation either runs or does not.
- Makes refunds and UI confusing.

#### Recommendation

Choose **Approach A**. If `amount > dailyLimit` or `amount > weeklyLimit`, reject without changing usage and include status plus requested amount in the error payload.

#### Your Answer

Approach A

---

### 11. Who is authorized to run the admin cleanup command?

#### Description

What authorization rule should protect the manual admin cleanup method for deleting rows older than 90 days?

#### Reasoning

The existing answer asks for a manual admin cleanup method. Since this deletes operational records, it must not be callable by normal authenticated users or AI generation callers.

#### Common Approaches

**Approach A: Require an admin role/permission**

- Clean and explicit.
- Depends on an existing or upcoming admin authorization source.

**Approach B: Keep cleanup as a server-only internal function**

- Not exposed as a user-facing command.
- Can be called from scripts, admin routes, or maintenance code.
- Simpler if admin roles are not implemented yet.

**Approach C: Expose without auth because it only deletes old rows**

- Unsafe.
- Can cause accidental or abusive data deletion.

#### Recommendation

Choose **Approach B** for the first version. Implement cleanup as a server-only service/repository method, and only wrap it in an admin command after the project has a clear admin authorization pattern.

#### Your Answer

Approach A

---

### 12. What should the admin cleanup command return?

#### Description

After deleting usage rows older than 90 days, what result should the cleanup method provide?

#### Reasoning

Manual maintenance commands need enough feedback for logs and support. Returning nothing makes it harder to confirm whether cleanup ran or how much data was affected.

#### Common Approaches

**Approach A: Return deleted row count**

- Simple and useful for logs.
- Easy to test.

**Approach B: Return counts grouped by window type**

- More informative: daily rows deleted versus weekly rows deleted.
- Slightly more query/result complexity.

**Approach C: Return deleted rows**

- Useful for auditing.
- Potentially large and unnecessary.

#### Recommendation

Choose **Approach A**. Return `{ success: true, deletedCount }`. Add grouped counts later only if maintenance logs need them.

#### Your Answer

Approach A