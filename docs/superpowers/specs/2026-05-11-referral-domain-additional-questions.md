# Referral Domain Additional Questions

This document captures second-pass specification questions for the Referral domain after the first question set was answered.

Source context:

- `docs/superpowers/specs/2026-05-11-rate-limiter-referral-domain-questions.md`

Referral analytics as a separate service/domain is intentionally out of scope.

---

### 1. What should happen if lazy profile creation cannot derive a usable slug from username?

#### Description

When `getOrCreateReferralProfile(userId)` lazily creates a profile, what should it do if the username is missing, empty after sanitization, too short, or contains only unsupported characters?

#### Reasoning

The referral slug defaults from username, but lazy creation may run in contexts where username data is incomplete or sanitizes to an unusable value. The command needs deterministic behavior so profile creation does not fail unexpectedly for valid users.

#### Common Approaches

**Approach A: Require a valid username and fail otherwise**

- Keeps slugs always username-derived.
- Forces callers to ensure username exists first.
- Can block referral profile creation for edge-case accounts.

**Approach B: Use sanitized username when possible, otherwise generate random slug**

- Keeps common cases readable.
- Handles missing or unusable usernames safely.
- Random fallback is less recognizable.

**Approach C: Delay profile creation until username is fixed**

- Avoids random slugs.
- Adds UI/account dependency to referral profile access.
- More friction for a storage-only domain.

#### Recommendation

Choose **Approach B**. Use sanitized username as the base when it produces a valid slug; otherwise generate a short random slug with the same uniqueness checks.

#### Your Answer

Approach A

---

### 2. What exact slug normalization rules should referral use?

#### Description

Should referral slugs be lowercase-only, ASCII-only, hyphen-separated, trimmed, and case-insensitive on lookup?

#### Reasoning

Existing shared slug utilities already lowercase and remove unsupported characters. Referral URLs should be predictable and should not create separate profiles for case variants like `Kevin`, `kevin`, and `KEVIN`.

#### Common Approaches

**Approach A: Reuse the shared slug rules exactly**

- Consistent with existing study set/chapter slug behavior.
- Lower implementation cost.
- May inherit quirks such as limited cleanup of repeated hyphens.

**Approach B: Create stricter referral-specific rules**

- Can enforce cleaner public referral URLs.
- Adds another slug implementation to maintain.
- More testing needed.

**Approach C: Store original username slug and normalize only for lookup**

- Preserves more of the username shape.
- More confusing URL behavior.
- Higher collision risk.

#### Recommendation

Choose **Approach A** for the first version. Store lowercase sanitized slugs and resolve slugs case-insensitively by normalizing input before lookup.

#### Your Answer

Approach A


---

### 3. How many slug collision retries should profile creation attempt?

#### Description

When the username-derived slug conflicts and entropy is appended, how many times should the command retry before failing?

#### Reasoning

Entropy should make conflicts rare, but a bounded retry policy prevents an infinite loop and gives callers a clear error path if something is wrong.

#### Common Approaches

**Approach A: Retry a fixed small number of times**

- Simple and safe.
- Easy to test.
- Extremely unlikely to fail in practice with enough entropy.

**Approach B: Retry indefinitely until success**

- Maximizes creation success.
- Risky if the conflict condition is caused by a bug or bad entropy source.

**Approach C: Fail immediately on first conflict**

- Simplest.
- Bad user experience for common usernames.
- Conflicts with the desired entropy-on-conflict behavior.

#### Recommendation

Choose **Approach A**. Retry 5 times with fresh entropy, then return a domain error such as `REFERRAL_SLUG_GENERATION_FAILED`.

#### Your Answer

Approach A

---

### 4. What should the referral relationship row store?

#### Description

Which fields should the extra table for “who referred whom” include?

#### Reasoning

The user wants balance-only points plus an extra table tracking attribution and when the referred user subscribes. The row shape needs to support signup attribution, later subscription updates, and idempotent reward commands without becoming a full analytics service.

#### Common Approaches

**Approach A: Minimal attribution row**

- `id`, `referrerUserId`, `referredUserId`, `createdAt`.
- Very small.
- Does not directly track subscription timing.

**Approach B: Attribution row with subscription summary fields**

- Adds `firstSubscribedAt`, `lastSubscribedAt`, and `subscriptionCount`.
- Supports the requested “when referred user subscribes” use case.
- Still avoids a separate analytics service.

**Approach C: Attribution row plus detailed lifecycle status**

- Tracks signup, subscription, reward, cancellation, and more statuses.
- More expressive.
- Starts to encode subscription/reward policy inside referral.

#### Recommendation

Choose **Approach B**. Store attribution plus simple subscription summary fields, while keeping the actual decision to award points in the calling subscription/reward flow.

#### Your Answer

Approach A

---

### 5. How should repeated referred-user subscriptions be recorded?

#### Description

If a referred user subscribes multiple times and the referrer should gain points each time, should the referral domain store each subscription occurrence or only update counters on the relationship row?

#### Reasoning

The user explicitly said a referrer can gain points every time the referred user subscribes. A simple relationship row can track counts, but idempotency needs a durable way to recognize already-processed subscription events.

#### Common Approaches

**Approach A: Only increment `subscriptionCount` on the relationship**

- Very simple.
- Cannot safely deduplicate retries unless handled elsewhere.
- Harder to answer which subscription event caused a point change.

**Approach B: Store one referred subscription event row per source subscription event**

- Enables idempotency with unique `sourceSubscriptionId` or `idempotencyKey`.
- Keeps point balance separate from audit-heavy point ledger.
- Adds one small table.

**Approach C: Store a full point ledger for every subscription**

- Most auditable.
- Conflicts with the current balance-only points direction.

#### Recommendation

Choose **Approach B**. Add a compact referred-subscription event table keyed by source subscription event/idempotency key, and update the relationship summary plus point balance in the same command.

#### Your Answer

Approach B
---

### 6. What idempotency key shape should point-affecting commands require?

#### Description

For commands that add referral points, what should callers provide to make retries safe?

#### Reasoning

The existing direction requires idempotent point-affecting commands but avoids a full point ledger. The domain still needs a durable unique key per external action so the same subscription event cannot award points twice.

#### Common Approaches

**Approach A: Single opaque `idempotencyKey` string**

- Flexible for all callers.
- Simple unique constraint.
- Less structured for support/debugging.

**Approach B: Structured source fields**

- Example: `sourceType` plus `sourceId`.
- Easier to inspect and constrain.
- Slightly more schema and validation.

**Approach C: Caller-owned idempotency only**

- Keeps referral storage smaller.
- Unsafe for retries and timeouts.

#### Recommendation

Choose **Approach B**. Use `sourceType` and `sourceId` with a unique constraint, such as `SUBSCRIPTION_PAYMENT` plus the subscription/payment event ID.

#### Your Answer

Approach A

---

### 7. Should point-affecting commands support negative adjustments?

#### Description

Should referral points only ever increase, or should the domain allow negative point adjustments for reversals, refunds, corrections, or admin fixes?

#### Reasoning

The current direction is balance-only points. If negative values are allowed, the domain needs minimum-balance rules and clearer error handling. If not, reversals must be handled later by a different command/spec.

#### Common Approaches

**Approach A: Positive point additions only**

- Smallest and safest first version.
- Matches referral subscription rewards.
- No refund/correction support yet.

**Approach B: Allow positive and negative adjustments**

- Supports corrections and reversals.
- Requires rules for whether balance can go below zero.
- More validation and testing.

**Approach C: Separate commands for award and adjustment**

- Clear intent.
- Slightly more API surface.
- Useful once admin/reversal flows exist.

#### Recommendation

Choose **Approach A** for the first version. Only allow positive point additions from idempotent source actions; defer reversals/admin corrections until there is a concrete reward policy.

#### Your Answer

Approach C

---

### 8. How should anonymous referral link clicks be tracked?

#### Description

If simple anonymous link-click tracking is included, should it increment a counter on the referral profile, store individual click rows, or be omitted initially?

#### Reasoning

The user allowed possible simple anonymous link-click tracking without unique visitors and without a separate analytics domain. The implementation should avoid visitor identity, cookies, fingerprinting, and analytics-service scope creep.

#### Common Approaches

**Approach A: Single aggregate click counter on referral profile**

- Very simple.
- No visitor identity or event table.
- Cannot inspect click timing.

**Approach B: Daily aggregate click rows per referral profile**

- Still simple.
- Supports basic trend/debugging by day.
- Requires date bucket logic and cleanup decisions.

**Approach C: Individual anonymous click rows**

- More detailed.
- Quickly becomes analytics-like.
- Higher storage volume.

#### Recommendation

Choose **Approach A** unless daily counts are needed immediately. Add `anonymousClickCount` to the referral profile and increment it when a valid slug link is visited.

#### Your Answer

We dont need to analyctic referral

---

### 9. Should invalid slug visits be tracked?

#### Description

When someone visits a referral link with a slug that does not exist, should the domain record anything?

#### Reasoning

Tracking invalid slugs can help detect broken links or abuse, but it adds storage for unauthenticated traffic and can drift toward analytics or security logging.

#### Common Approaches

**Approach A: Do not track invalid slug visits**

- Smallest and safest.
- Avoids storing arbitrary URL input.
- No insight into broken referral links.

**Approach B: Track only a global invalid-click counter**

- Minimal operational signal.
- No per-slug storage.
- Limited usefulness.

**Approach C: Store invalid slug attempts**

- Useful for abuse/debugging.
- More storage and moderation concerns.
- Outside the core referral storage goal.

#### Recommendation

Choose **Approach A**. Resolve valid slugs and optionally increment valid profile clicks; ignore invalid slug visits in the referral domain.

#### Your Answer

We dont need to track/analytics

---

### 10. What should happen to referral data when users are deleted?

#### Description

If a referrer or referred user is deleted, should referral profiles and relationship rows cascade-delete, be retained with nullable user references, or be anonymized?

#### Reasoning

The current schema patterns use user foreign keys with cascade deletes. Referral relationships may be useful historically, but retaining deleted-user relationships adds privacy and referential complexity.

#### Common Approaches

**Approach A: Cascade-delete referral profile and related rows**

- Consistent with existing service patterns.
- Simple and privacy-friendly.
- Loses historical referral attribution.

**Approach B: Retain rows with nullable user references**

- Preserves history.
- More complex queries and constraints.
- Requires anonymization decisions.

**Approach C: Soft-delete referral profiles**

- Keeps data for support.
- Adds filtering and lifecycle complexity.
- Not used by existing service patterns.

#### Recommendation

Choose **Approach A** for the first version. Use cascading foreign keys for referral profile and relationship rows, and revisit retention if referral points become financially meaningful.

#### Your Answer

Approach A

---

### 11. What query procedures should referral expose for reads?

#### Description

Beyond mutation commands, which read procedures should the domain provide for UI and cross-domain callers?

#### Reasoning

The existing service pattern separates commands and queries. Referral needs reads for profile display, link resolution, and relationship lookup without exposing repository access directly.

#### Common Approaches

**Approach A: Minimal read queries**

- `getMyReferralProfile()`.
- `resolveReferralSlug(slug)`.
- `getReferralRelationshipForUser(referredUserId)`.
- Small and aligned with direct command calls.

**Approach B: Add list/history queries now**

- Includes referred users list, subscription history, and point history.
- More useful for UI.
- Broader than storage MVP.

**Approach C: Repository-only reads**

- Least API work.
- Weakens domain boundary.
- Inconsistent with existing service patterns.

#### Recommendation

Choose **Approach A**. Add list/history queries only when there is a concrete referral UI that needs them.

#### Your Answer

Approach A

---

### 12. What referral-specific error codes are needed?

#### Description

Which referral domain errors should be standardized for callers?

#### Reasoning

Existing services use explicit error codes. Referral commands need predictable failures for invalid attribution, slug resolution, idempotency conflicts, and optimistic locking.

#### Common Approaches

**Approach A: Reuse only shared generic errors**

- Smaller error taxonomy.
- Less precise caller handling.
- Harder to distinguish referral integrity failures.

**Approach B: Add focused referral-specific errors**

- Clear behavior for callers.
- Easy to test.
- Slightly expands shared error codes.

**Approach C: Throw raw repository errors**

- Lowest implementation effort.
- Poor UI/support behavior.
- Inconsistent with existing service specs.

#### Recommendation

Choose **Approach B**. Add focused codes such as `REFERRAL_PROFILE_NOT_FOUND`, `REFERRAL_SLUG_NOT_FOUND`, `SELF_REFERRAL_NOT_ALLOWED`, `REFERRAL_ALREADY_EXISTS`, `REFERRAL_IDEMPOTENCY_CONFLICT`, and `REFERRAL_VERSION_CONFLICT`.

#### Your Answer

Approach B
