# Rate Limiter and Referral Domain Questions

This document captures specification questions for the new Rate Limiter and Referral domains.

The recommendations below are proposed defaults for discussion. They are not final specs until reviewed and accepted.

---

## Rate Limiter Domain

### 1. What exactly counts as an AI generation?

#### Description

Should the rate limiter count every AI-backed request, only successful generated outputs, or specific generation types such as flashcards, quizzes, study set summaries, and future AI tools separately?

#### Reasoning

The limit can only be fair and enforceable if every caller knows what consumes quota. Ambiguity here causes inconsistent usage accounting and makes user-facing limit messages hard to explain.

#### Common Approaches

**Approach A: One unit per successful AI generation request**

- Counts a request after the AI provider returns usable output.
- Simple for users to understand.
- Failed provider calls do not consume quota.
- Concurrent calls need reservation or atomic post-success accounting to avoid overshoot.

**Approach B: One unit per attempted AI generation request**

- Counts before calling the AI provider.
- Strongest protection against expensive abuse.
- Users may lose quota for failed generations unless refunded.

**Approach C: Feature-specific units**

- Different actions have different costs, such as one quiz generation versus one flashcard batch generation.
- More accurate for cost control.
- More complex to explain and maintain.

#### Recommendation

Choose **Approach A** for the first version: one unit per successful AI generation request. Keep the unit generic and add feature-specific weights only when provider cost differences become important.

#### Your Answer

custom unit, some generation would cost more unit, but let the generate domain decide it, so we only need method that accept "how much this cost to limit"

---

### 2. Should daily and weekly limits be enforced independently?

#### Description

When a user generates content, should the system require both the current daily window and current weekly window to have remaining quota?

#### Reasoning

The user described two windows: daily and weekly. The spec needs to define whether these are independent caps or whether one is informational.

#### Common Approaches

**Approach A: Enforce both limits**

- A generation is allowed only when daily and weekly quota are both available.
- Prevents heavy daily usage and heavy weekly usage.
- Requires updating two counters per generation.

**Approach B: Enforce only daily, show weekly as analytics**

- Simpler command path.
- Does not protect weekly provider spend.

**Approach C: Enforce only weekly, show daily as analytics**

- Allows flexible usage across the week.
- Does not prevent a user from exhausting the whole week in one day.

#### Recommendation

Choose **Approach A**. Treat daily and weekly as hard caps and update both in the same transaction.

#### Your Answer

Approach A

---

### 3. What are the exact UTC window boundaries?

#### Description

Should the daily window run from `00:00:00` to `23:59:59.999` UTC, and should the weekly window start on Monday or Sunday?

#### Reasoning

The user explicitly wants UTC+0 and the same cycle for all users. Weekly start day still needs to be specified because it affects quota reset timing and analytics grouping.

#### Common Approaches

**Approach A: UTC day and ISO week**

- Daily window starts at `00:00:00.000Z`.
- Weekly window starts Monday at `00:00:00.000Z`.
- Common in technical systems and analytics.

**Approach B: UTC day and Sunday week**

- Matches some consumer calendars.
- Less standard for ISO-style reporting.

**Approach C: Subscription-relative rolling windows**

- Each user has windows based on subscription start date.
- More exact for subscription fairness.
- Explicitly more complex than the desired shared cycle.

#### Recommendation

Choose **Approach A**. Use UTC calendar days and ISO weeks starting Monday. Accept that a monthly subscription can span five weekly reset windows.

#### Your Answer

Approach A

---

### 4. How should plan limits be represented?

#### Description

Should plan limits be hardcoded in the rate limiter domain, environment-configured, or stored in the database?

#### Reasoning

The user requested preconfigured hardcoded plan limits. The spec should define how rigid that hardcoding is and how callers identify a user's plan.

#### Common Approaches

**Approach A: Static TypeScript plan map**

- Example: `FREE`, `PRO`, `PREMIUM` mapped to daily and weekly numbers.
- Very simple and type-safe.
- Requires deployment to change limits.

**Approach B: Environment-configured plan limits**

- Change limits without database migration.
- Still requires deploy or environment update.
- More error-prone than typed constants.

**Approach C: Database-managed plan table**

- Flexible for admin tooling and experiments.
- More moving parts than needed for the first version.

#### Recommendation

Choose **Approach A**. Use a typed hardcoded map and keep database rows focused on usage, not plan configuration.

#### Your Answer

Approach A

---

### 5. Which plan key should be stored on usage rows?

#### Description

Should rate limit rows store the plan key active when the row was created, or should they only store usage and always compare against the user's current plan at request time?

#### Reasoning

This affects upgrades, downgrades, support debugging, and historical auditability.

#### Common Approaches

**Approach A: Store only usage, derive limit from current plan**

- Upgrades and downgrades take effect immediately.
- Rows are smaller.
- Historical usage rows do not explain which plan was applied at the time.

**Approach B: Store plan key snapshot on each row**

- Better audit trail.
- Makes plan changes explicit per window.
- Requires rules for whether mid-window changes update the row.

**Approach C: Store effective limit numbers on each row**

- Most auditable.
- If plan limits change later, old rows keep old limits.
- Can become confusing if current plan limit differs from stored limit.

#### Recommendation

Choose **Approach B**. Store `planKey` as a snapshot for observability, but compare against the current plan limit when consuming quota unless a future billing spec requires otherwise.

#### Your Answer

Approach A

---

### 6. How should mid-window plan changes behave?

#### Description

If a user upgrades or downgrades during a daily or weekly window, should the remaining quota update immediately or only on the next window?

#### Reasoning

Subscription changes affect quota. Without a rule, the rate limiter will behave inconsistently across callers.

#### Common Approaches

**Approach A: Current plan applies immediately**

- User gets upgraded capacity right away.
- Downgrades can immediately reduce remaining quota.
- Simple to compute from current plan.

**Approach B: Current window keeps old plan limits**

- Stable quota for the rest of the day/week.
- Requires storing effective limits or plan snapshots.

**Approach C: Upgrades apply immediately, downgrades apply next window**

- User-friendly billing behavior.
- More conditional logic.

#### Recommendation

Choose **Approach A** for the first version. It is simple and consistent with deriving limit from the current hardcoded plan map.

#### Your Answer

Approach A

---

### 7. Should usage rows be created lazily or proactively?

#### Description

Should the database create a usage row only when a user first generates in a window, or should rows be pre-created for all users and all windows?

#### Reasoning

The user wants usage stored as rows and queried for the current day or week. Creation timing affects storage volume and command complexity.

#### Common Approaches

**Approach A: Lazy row creation on first consumption**

- Stores rows only for active users.
- No scheduled job required.
- Requires upsert or transactional insert-on-missing logic.

**Approach B: Scheduled row creation**

- Rows always exist before usage.
- Requires cron/scheduled jobs and cleanup rules.

**Approach C: Create rows on user subscription activation**

- Useful if limits are subscription-driven.
- Still misses inactive periods or plan changes unless managed carefully.

#### Recommendation

Choose **Approach A**. Lazily upsert current daily and weekly rows during quota consumption.

#### Your Answer

APproach A

---

### 8. What is the unique key for rate limit usage rows?

#### Description

Which columns uniquely identify a usage counter row?

#### Reasoning

Correct unique constraints are the main protection against duplicate counters for the same user and window.

#### Common Approaches

**Approach A: `(userId, windowType, windowStart)`**

- One row per user per window.
- Limit is derived from current plan.
- Simple and stable.

**Approach B: `(userId, planKey, windowType, windowStart)`**

- Separates counters when plan changes.
- Can allow extra quota after switching plans.

**Approach C: `(userId, featureKey, windowType, windowStart)`**

- Supports separate feature limits.
- More complex than current requirements.

#### Recommendation

Choose **Approach A**. Add `planKey` as metadata if needed, but do not include it in the first unique key.

#### Your Answer

Approach A, but why we need window start, please explain on next file

---

### 9. Should quota consumption be a reservation before generation or a commit after success?

#### Description

Should a caller consume quota before calling the AI provider, or check quota first and increment only after the provider succeeds?

#### Reasoning

This is the central correctness trade-off between cost protection and avoiding quota loss for failed generations.

#### Common Approaches

**Approach A: Check then commit after success**

- No quota lost for failed provider calls.
- Concurrent requests can overshoot unless the final commit is also conditional.

**Approach B: Reserve before provider call, refund on failure**

- Strongly limits provider spend.
- Requires reservation status and refund behavior.

**Approach C: Atomic consume before provider call without refund**

- Simplest protection.
- Poor user experience when provider or validation fails.

#### Recommendation

Choose **Approach B** if provider cost protection is critical. Otherwise choose **Approach A** with an atomic conditional increment after success. For the first spec, prefer **Approach A** because the domain stays small and user-facing behavior is clearer.

#### Your Answer

Approach C

---

### 10. How should concurrent generation requests be handled?

#### Description

If a user sends multiple AI generation requests at the same time, should only requests within remaining quota succeed?

#### Reasoning

Rate limiting is unsafe if checks and increments are separate non-atomic operations. Concurrent requests can pass the check and exceed the cap.

#### Common Approaches

**Approach A: Atomic conditional update**

- Update the counter only when `used + requested <= limit`.
- Reliable and compact.
- Requires database support for conditional update and affected-row checking.

**Approach B: Transaction with row lock**

- Read row, lock it, update if allowed.
- Clear semantics in databases with row locks.
- Depends on database behavior and may be heavier.

**Approach C: Application-level mutex**

- Simple in a single process.
- Unsafe in serverless or horizontally scaled deployments.

#### Recommendation

Choose **Approach A**. Use a database-level conditional update/upsert and never rely on process-local locking.

#### Your Answer

We will only have simple method that:

- immidieatly consume before we proceed the ai generation
- we will refund if generation fails

---

### 11. What command procedures should the rate limiter expose?

#### Description

Which procedures will other domains call to check, consume, and inspect quota?

#### Reasoning

The rate limiter should provide a small boundary so AI generation domains do not duplicate quota logic.

#### Common Approaches

**Approach A: Separate check and consume commands**

- `getGenerationLimitStatus(userId)` and `consumeGenerationQuota(userId, amount)`.
- Easy for UI to show status.
- Callers must not treat check as authorization without consume.

**Approach B: Single guarded consume command**

- `consumeGenerationQuota` returns status and either consumes or rejects.
- Strong command boundary.
- UI still needs a read query for display.

**Approach C: Reservation lifecycle**

- `reserve`, `commit`, `refund`.
- Best for provider cost protection.
- More complex for first version.

#### Recommendation

Choose **Approach A** for now, with clear docs that only `consumeGenerationQuota` enforces quota. Add reservation commands later only if required.

#### Your Answer

Approach A but
consumeGenerationQuota is also consume + check

---

### 12. What should over-limit responses include?

#### Description

When quota is exceeded, what data should be returned to the caller and user interface?

#### Reasoning

Good error payloads let the UI explain whether the user hit the daily limit, weekly limit, or both, and when quota resets.

#### Common Approaches

**Approach A: Minimal error code only**

- Example: `RATE_LIMIT_EXCEEDED`.
- Easy to implement.
- Poor user feedback.

**Approach B: Error code plus current limit status**

- Includes daily and weekly used, limit, remaining, and reset time.
- Better UI and support debugging.
- Slightly larger response.

**Approach C: Separate error codes per window**

- Example: `DAILY_LIMIT_EXCEEDED`, `WEEKLY_LIMIT_EXCEEDED`.
- Simple branching.
- Awkward when both are exceeded.

#### Recommendation

Choose **Approach B**. Use one code, `RATE_LIMIT_EXCEEDED`, and include daily and weekly status in the payload.

#### Your Answer

Approach B

---

### 13. How long should rate limit rows be retained?

#### Description

Should historical daily and weekly usage rows be kept forever, deleted after a retention period, or aggregated elsewhere?

#### Reasoning

Rate limit rows are operational data. Retention affects database size, support/debugging, and analytics possibilities.

#### Common Approaches

**Approach A: Keep all rows initially**

- Simplest first version.
- Useful for debugging early behavior.
- Needs cleanup once volume grows.

**Approach B: Retain for a fixed period**

- Example: keep 90 days.
- Controls storage.
- Requires cleanup job.

**Approach C: Move old rows to analytics storage**

- Better long-term reporting.
- More architecture than needed now.

#### Recommendation

Choose **Approach A** for the initial implementation and document a future cleanup policy. If quota volume grows quickly, switch to **Approach B**.

#### Your Answer

Approach A
we need method for admin to manually clean up >90days rows

---

### 14. What time source should the domain use?

#### Description

Should commands call `Date.now()` directly or accept an injectable clock/current timestamp?

#### Reasoning

UTC window logic is easy to get wrong and hard to test if time cannot be controlled.

#### Common Approaches

**Approach A: Use `Date.now()` directly**

- Minimal code.
- Harder to test edge cases at midnight and week boundaries.

**Approach B: Inject or pass `now` into domain functions**

- Testable boundary calculations.
- Slightly more plumbing.

**Approach C: Database server time only**

- Centralizes time.
- Harder to unit test and less portable.

#### Recommendation

Choose **Approach B**. Use a default system clock in production and pass fixed timestamps in tests.

#### Your Answer

Approach A

---

## Referral Domain

### 15. What is the exact boundary of the referral domain?

#### Description

Should this domain only store referral profiles, referral links, referral relationships, and point balances, or should it also decide when to award points?

#### Reasoning

The user said the domain is responsible to store, not act, and other domains will perform actions later. The boundary must prevent business side effects from leaking into this domain too early.

#### Common Approaches

**Approach A: Storage and command procedures only**

- Stores referral profile, slug, relationships, and points.
- Other domains call explicit commands when signup/subscription/reward events happen.
- Keeps behavior simple and reusable.

**Approach B: Referral domain owns reward policy**

- Referral domain decides when and how many points to award.
- More cohesive for referrals.
- Couples this domain to subscription and product rules.

**Approach C: Event-driven referral processor**

- Other domains publish events and referral consumes them.
- Decoupled long term.
- More infrastructure than needed for first version.

#### Recommendation

Choose **Approach A**. Provide command procedures that store state changes safely, but keep reward decisions outside the domain until the action spec is ready.

#### Your Answer

Approach A

---

### 16. What entities should the referral domain own?

#### Description

Should there be one referral profile per user, a separate referral relationship row per referred user, and a separate point ledger row for point changes?

#### Reasoning

The data model must support unique referral slugs, race-safe point updates, and future auditability.

#### Common Approaches

**Approach A: Single referral profile row only**

- Stores `userId`, `slug`, `points`, and `version`.
- Very simple.
- Cannot audit why points changed without extra tables.

**Approach B: Profile plus referral relationship rows**

- Stores one profile per referrer and one row per referred user.
- Tracks who was referred by whom.
- Points still need either direct balance updates or a ledger.

**Approach C: Profile plus relationships plus point ledger**

- Profile stores current balance and version.
- Relationship rows store attribution.
- Ledger rows store every point change.
- More tables, but safer for audit and idempotency.

#### Recommendation

Choose **Approach C** if points are user-visible or valuable. If the first implementation truly only needs slug storage, start with **Approach B** and add the point ledger before awarding real points.

#### Your Answer

Approach A
we need extra table for history of "who referred by whom", "when referred user subs"

---

### 17. When should a referral profile be created?

#### Description

Should the referral profile be created automatically when a user signs up, lazily when they open referral UI, or manually when a command is called?

#### Reasoning

Slug defaults to username, so creation timing affects whether username is available and whether every user has a referral link.

#### Common Approaches

**Approach A: Create on user signup**

- Every user has a referral slug immediately.
- Requires referral domain to be called from signup flow.

**Approach B: Lazy create on first referral access**

- Only active referrers get rows.
- UI and link resolution need create-or-read behavior.

**Approach C: Admin or explicit user action**

- Full control over who has links.
- Friction for users.

#### Recommendation

Choose **Approach B** for simplicity and storage efficiency, unless the product requires every user to have a link immediately after signup.

#### Your Answer

Approach B

---

### 18. How should default referral slugs be generated from username?

#### Description

If the slug defaults to username, should it use the username exactly, a sanitized lowercase version, or username plus entropy?

#### Reasoning

Referral URLs need stable, safe, unique slugs. Usernames can contain characters that are not URL-friendly or can collide after normalization.

#### Common Approaches

**Approach A: Use username exactly**

- Predictable.
- Risky if username contains unsupported URL characters or case variants.

**Approach B: Sanitize username and require uniqueness**

- Clean URLs.
- Collisions must be handled.

**Approach C: Sanitize username and append entropy on conflict**

- Clean and usually recognizable URLs.
- Avoids blocking creation when username-derived slug is taken.

#### Recommendation

Choose **Approach C**. Sanitize with the shared slug rules and append short random entropy only when needed.

#### Your Answer

Approach C

---

### 19. Should referral slugs change when usernames change?

#### Description

If a user changes their username later, should the referral slug update automatically?

#### Reasoning

Changing slugs can break shared referral links. Keeping old slugs can diverge from username.

#### Common Approaches

**Approach A: Slug never changes automatically**

- Existing links keep working.
- Simple and stable.
- Slug may no longer match username.

**Approach B: Slug updates with username**

- Referral link stays aligned with profile identity.
- Breaks existing links unless aliases are stored.

**Approach C: Slug updates and old slug becomes alias**

- Best user experience.
- Requires alias table and conflict rules.

#### Recommendation

Choose **Approach A**. Generate the default slug from username once, then keep it stable.

#### Your Answer

Approach A

---

### 20. Can users customize referral slugs?

#### Description

Should users be allowed to choose or change their referral slug?

#### Reasoning

Custom slugs create validation, uniqueness, abuse, moderation, and link-history requirements.

#### Common Approaches

**Approach A: No custom slug in first version**

- Simpler and safer.
- Username default is enough.

**Approach B: One-time custom slug change**

- Gives users control.
- Requires validation and conflict handling.

**Approach C: Unlimited custom changes with aliases**

- Flexible.
- Highest complexity.

#### Recommendation

Choose **Approach A** for the first version. Add customization only after referral links are actively used.

#### Your Answer

Approach A

---

### 21. What uniqueness constraints should referral data enforce?

#### Description

Which referral rows must be unique at the database level?

#### Reasoning

Uniqueness constraints are the strongest protection against duplicate profiles, duplicate slugs, and double attribution.

#### Common Approaches

**Approach A: Unique profile per user and unique slug**

- Ensures each user has one link.
- Does not prevent duplicate referred-user relationships by itself.

**Approach B: Add unique referred user relationship**

- Each referred user can only be attributed once.
- Prevents double referral credit.

**Approach C: Add idempotency keys to every command**

- Helps external domains retry safely.
- More command plumbing.

#### Recommendation

Use **Approach A** and **Approach B** together: unique `userId`, unique `slug`, and unique `referredUserId` on referral relationship rows. Add idempotency keys when commands are called from unreliable external processes.

#### Your Answer

Approach A
prevent self referrer
refferrer actor would gain point on every refrred user subs continously(example: they subs 2 times, mean referrer actor get 2 times also)

---

### 22. How should optimistic locking be applied?

#### Description

Which rows should have a `version` column, and should mutation commands require an expected version?

#### Reasoning

The user explicitly wants optimistic locking to avoid data races. The spec must define the aggregate that is protected by the version.

#### Common Approaches

**Approach A: Version only on referral profile**

- Protects point balance and profile-level changes.
- Simple for commands like add points or update slug.

**Approach B: Version on profile and relationship rows**

- Protects more mutations.
- More cumbersome for callers.

**Approach C: No expected version, database conditional updates only**

- Can still be safe for atomic increments.
- Does not expose optimistic conflict semantics to callers.

#### Recommendation

Choose **Approach A**. Add `version` to the referral profile and require `expectedVersion` for commands that update balance or mutable profile fields. Use unique constraints for relationship idempotency.

#### Your Answer

Approach A

---

### 23. How should point changes be stored?

#### Description

Should the domain store only a current point balance, only a ledger, or both?

#### Reasoning

Referral points will likely be user-visible and may affect rewards later. Auditability matters once points have value.

#### Common Approaches

**Approach A: Balance only**

- Very simple.
- Hard to audit, repair, or explain point changes.

**Approach B: Ledger only**

- Full audit trail.
- Balance queries require aggregation.

**Approach C: Ledger plus cached balance**

- Fast reads and auditable history.
- Requires transactional writes to keep both consistent.

#### Recommendation

Choose **Approach C** if points will be displayed or redeemed. If points are only a future placeholder, defer point storage until the reward action spec exists.

#### Your Answer

Approach A

---

### 24. Should referral commands be idempotent?

#### Description

Should commands like `recordReferralRelationship` or `addReferralPoints` safely handle retries without duplicating rows or points?

#### Reasoning

Other domains will call referral commands. Retries can happen after timeouts, failed responses, or duplicate events.

#### Common Approaches

**Approach A: Rely on unique constraints only**

- Simple for one-time relationship creation.
- Not enough for repeated point-award events with different causes.

**Approach B: Require idempotency key per external action**

- Safest for retries.
- Needs callers to provide stable keys.

**Approach C: Make commands non-idempotent and caller-owned**

- Smallest referral domain.
- High risk of duplicate rewards.

#### Recommendation

Choose **Approach B** for point-affecting commands and **Approach A** for relationship creation. Point ledger rows should include a unique `sourceType` plus `sourceId` or idempotency key.

#### Your Answer

Approach B

---

### 25. What referral relationship states are needed?

#### Description

Should a referred user relationship have statuses such as clicked, signed up, subscribed, rewarded, or should those belong elsewhere?

#### Reasoning

The referral domain stores durable referral relationships. The spec needs to separate confirmed referral relationships from lightweight anonymous link-click tracking, without introducing a separate analytics service.

#### Common Approaches

**Approach A: Relationship only after signup**

- Referral row connects referrer and referred user.
- Anonymous link clicks stay outside referral relationship rows.
- Simple core referral model.

**Approach B: Relationship starts at first visit**

- Captures anonymous leads in referral domain.
- Requires anonymous identity handling in the core domain.

**Approach C: Relationship has lifecycle status**

- Tracks signup/subscription/reward state in one place.
- Can duplicate analytics and subscription state.

#### Recommendation

Choose **Approach A**. Create referral relationships only when a referred user identity exists. If link-click tracking is needed, keep it as a simple referral-owned counter or event, not a separate analytics domain.

#### Your Answer

Approach A
we may track "link click" for anonymous user, without know exactly how much person/visitor

---

### 26. How should invalid referrals be handled?

#### Description

Should the domain reject self-referrals, referrals for users that already have an attribution, and referrals from disabled/deleted users?

#### Reasoning

Even if the domain does not decide rewards, it should protect basic data integrity.

#### Common Approaches

**Approach A: Enforce core integrity rules in referral domain**

- Reject self-referral and duplicate referred user attribution.
- Keeps data clean.

**Approach B: Store everything, let reward logic decide later**

- Maximum flexibility.
- Pollutes data with invalid relationships.

**Approach C: Caller validates all rules**

- Keeps referral domain small.
- Easy for callers to diverge.

#### Recommendation

Choose **Approach A**. Enforce self-referral prevention and one referrer per referred user at the domain boundary.

#### Your Answer

Approach A

---

### 27. What command procedures should referral expose?

#### Description

Which command/query functions should other domains use?

#### Reasoning

The user requested command procedures for other domains, so the spec should name the intended API shape before implementation.

#### Common Approaches

**Approach A: Minimal commands**

- `getOrCreateReferralProfile(userId)`.
- `resolveReferralSlug(slug)`.
- `recordReferralRelationship(referrerUserId, referredUserId)`.
- `addReferralPoints(referrerUserId, points, source, expectedVersion)`.

**Approach B: Event-like commands**

- `recordSignupFromReferral`, `recordSubscriptionFromReferral`, `recordRewardGranted`.
- More semantic.
- Starts to encode action policy.

**Approach C: Repository-only access**

- Other domains manipulate referral rows directly.
- Lowest abstraction.
- Weakest consistency boundary.

#### Recommendation

Choose **Approach A**. It provides a small command boundary without making referral own signup/subscription reward policy.

#### Your Answer

Approach A

---

### 28. What should happen when optimistic locking conflicts occur?

#### Description

If a command updates a referral profile with an outdated `expectedVersion`, should it fail, retry internally, or merge automatically?

#### Reasoning

Conflict handling determines how callers implement retries and user feedback.

#### Common Approaches

**Approach A: Return `VERSION_CONFLICT` and current version**

- Clear optimistic locking behavior.
- Caller decides whether to retry.

**Approach B: Retry inside the command**

- Easier for callers.
- Can hide repeated contention and complicate idempotency.

**Approach C: Merge automatically**

- Useful for additive point increments.
- Risky for non-commutative updates such as slug changes.

#### Recommendation

Choose **Approach A** as the default. For point increments, allow safe retry only when an idempotency key is present.

#### Your Answer

Approach A

---

## Cross-Domain Questions

### 29. How should domains communicate without tight coupling?

#### Description

Should AI generation, subscription, auth, and referral-related callers call these services directly, or should they emit events that these domains process?

#### Reasoning

The user wants referral storage now and actions later. Direct calls are faster to implement, but event contracts may be cleaner as the system grows.

#### Common Approaches

**Approach A: Direct command calls**

- Simple and explicit.
- Good for the current codebase style.
- Can create coupling between services.

**Approach B: Internal domain events**

- Decouples producers and consumers.
- Requires event storage/dispatch decisions.

**Approach C: Hybrid**

- Direct commands for synchronous consistency.
- Events for asynchronous side effects.
- More decisions, but scalable.

#### Recommendation

Choose **Approach A**. Keep cross-domain behavior explicit with direct command calls until there is a concrete need for events.

#### Your Answer

Approach A

---

### 30. What shared error codes are needed?

#### Description

Which domain errors should be standardized across these services?

#### Reasoning

Existing service specs use explicit errors. New domains should align with that pattern so callers can handle failures consistently.

#### Common Approaches

**Approach A: Domain-specific codes only**

- Example: `RATE_LIMIT_EXCEEDED`, `REFERRAL_SLUG_CONFLICT`, `VERSION_CONFLICT`.
- Clear for each service.

**Approach B: Shared generic codes only**

- Example: `VALIDATION_FAILED`, `NOT_FOUND`, `FORBIDDEN`.
- Simple but less expressive.

**Approach C: Shared generic codes plus domain-specific codes**

- Consistent baseline with precise domain failures.
- Slightly larger error taxonomy.

#### Recommendation

Choose **Approach C**. Use shared errors for auth/validation/not found and domain codes for quota, slug conflicts, idempotency conflicts, and optimistic locking.

#### Your Answer

Approach C

---

### 31. What testing scenarios must be included in the specs?

#### Description

Which edge cases must be captured before implementation starts?

#### Reasoning

These domains are correctness-sensitive. Rate limits and referral attribution can fail under boundary and race conditions if not tested.

#### Common Approaches

**Approach A: Unit tests only**

- Fast and good for clock/window math and validation.
- Does not prove database constraints and races.

**Approach B: Repository/command tests with database constraints**

- Verifies unique indexes, conditional updates, and optimistic locking.
- More setup.

**Approach C: End-to-end flow tests**

- Verifies real caller behavior.
- Highest cost and most brittle for early domain work.

#### Recommendation

Choose **Approach B** as the baseline, with focused unit tests for time-window calculations. Add end-to-end tests only after UI or subscription flows exist.

#### Your Answer

We will unit test the command/query with mock
we will integration testing the repository
look existing codebase

---

### 32. Which parts are explicitly out of scope for the first implementation?

#### Description

What should be deferred so the first implementation stays small?

#### Reasoning

The requested domains can expand into billing, subscriptions, reporting, fraud detection, admin dashboards, and campaign tooling. The initial specs need boundaries.

#### Common Approaches

**Approach A: Strict MVP scope**

- Rate limiter: hardcoded plan limits, daily/weekly UTC counters, consume/status commands.
- Referral: profile, slug, relationship storage, optimistic locking, safe point storage command.

**Approach B: Include reward policy and subscription integration now**

- More complete referral behavior.
- Conflicts with the user's request to handle actions later.

**Approach C: Include admin tooling and fraud controls now**

- Stronger operational readiness.
- Too broad for first domain specs.

#### Recommendation

Choose **Approach A**. Defer reporting/analytics work, reward policy, subscription billing behavior, fraud scoring, leaderboards, admin dashboards, and custom referral campaigns.

#### Your Answer

Approach A
No separate analytics service/domain.
