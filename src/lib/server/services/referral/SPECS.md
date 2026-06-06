# Referral Service Specs

Source specs:

- `docs/superpowers/specs/2026-05-11-rate-limiter-referral-domain-questions.md`
- `docs/superpowers/specs/2026-05-11-referral-domain-additional-questions.md`

## Domain Boundary

Referral stores referral profiles, referral attribution, and referral points.

Referral is responsible for:

- lazily creating a referral profile for a user
- generating and resolving stable referral slugs
- storing the current referral point balance
- storing who referred whom
- storing referred-user subscription occurrences for idempotent point awards
- applying optimistic locking to referral profile mutations
- exposing command/query procedures for other domains to call directly

Referral is not responsible for:

- deciding when a user should earn referral points
- owning subscription or billing lifecycle rules
- analytics service/domain behavior
- tracking anonymous visitors, invalid slug visits, or click counts
- custom referral slug editing
- fraud scoring, leaderboards, campaigns, or admin dashboards

## Entities

```typescript
interface ReferralProfile {
  id: UUID;
  userId: UUID;
  slug: string;
  points: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ReferralRelationship {
  id: UUID;
  referrerUserId: UUID;
  referredUserId: UUID;
  createdAt: Date;
}

interface ReferralSubscriptionEvent {
  id: UUID;
  relationshipId: UUID;
  referrerUserId: UUID;
  referredUserId: UUID;
  idempotencyKey: string;
  pointsAwarded: number;
  createdAt: Date;
}
```

## Field Rules

- `id` values are server-generated; clients never provide IDs.
- `userId`, `referrerUserId`, and `referredUserId` reference Better Auth `user.id`.
- `slug` defaults from the user's username.
- A missing, empty, or unusable username prevents lazy profile creation and returns `VALIDATION_FAILED`.
- `points` stores the current balance only; no point ledger is stored.
- `points` starts at `0` and cannot be negative.
- `version` starts at `1` and increments on every referral profile mutation.
- Relationship rows store attribution only, not lifecycle status.
- Subscription event rows store each referred subscription occurrence that awards points.
- `idempotencyKey` is an opaque caller-provided string unique across point-affecting commands.
- Timestamps are stored as Date values using timestamp milliseconds in Drizzle.

## Slug Rules

- Generate the slug from `user.username` when the referral profile is first created.
- Reuse the shared slug normalization rules: transliterate to ASCII, lowercase, replace whitespace with hyphens, and remove unsupported characters.
- Valid stored slugs use lowercase alphanumeric characters and hyphens only.
- Slug lookup normalizes input before querying.
- Slug uniqueness is case-insensitive because slugs are normalized before storage and lookup.
- If the normalized username slug conflicts, append random entropy and retry.
- Retry slug generation up to 5 times, then return `REFERRAL_SLUG_GENERATION_FAILED`.
- Referral slugs do not change when usernames change.
- Users cannot customize referral slugs in the first version.

## Relationship And Reward Rules

- Referral relationships are created only after the referred user has an identity.
- Anonymous referral link clicks are not tracked.
- Invalid referral slug visits are not tracked.
- Self-referral is rejected.
- A referred user can have only one referrer relationship.
- A referrer can refer many users.
- A referrer can earn points every time a referred user subscribes.
- Each referred-user subscription occurrence is stored in `ReferralSubscriptionEvent` for idempotency.
- Positive point awards and negative point adjustments use separate commands.
- Negative adjustment support exists for future reversals/admin corrections, but reward policy remains outside this domain.

## Optimistic Locking

- `ReferralProfile.version` protects profile mutations, including point balance changes.
- Commands that update the profile require `expectedVersion`.
- Mutations update with a condition equivalent to `id = profileId AND version = expectedVersion`.
- Successful mutations increment `version` by 1.
- Version conflicts return `REFERRAL_VERSION_CONFLICT` with the current version when available.
- Commands do not retry optimistic locking conflicts internally.

## Authorization

- User-facing profile queries and creation require authentication.
- `userId` is inferred from auth context and is never client-provided for `GetMyReferralProfile`.
- Cross-domain commands may pass explicit referrer/referred user IDs because they are server-side orchestration calls.
- Normal users cannot create relationships or award points directly unless routed through trusted server procedures.
- Deleted users cascade-delete referral profiles, relationships, and subscription events through foreign keys.

## Commands

### GetOrCreateReferralProfile

```typescript
interface GetOrCreateReferralProfileCommand {}
```

- Requires authentication.
- Returns the authenticated user's existing referral profile when present.
- Lazily creates a profile when missing.
- Requires the authenticated user to have a usable username.
- Generates a stable slug from the username.
- Returns `{ success: true, data: ReferralProfile }`.

### RecordReferralRelationship

```typescript
interface RecordReferralRelationshipCommand {
  referrerUserId: UUID;
  referredUserId: UUID;
}
```

- Server-side command for auth/signup orchestration.
- Rejects self-referral.
- Creates one relationship from referrer to referred user.
- Fails if the referred user already has a relationship.
- Returns `{ success: true, data: ReferralRelationship }`.

### AddReferralPoints

```typescript
interface AddReferralPointsCommand {
  referrerUserId: UUID;
  referredUserId: UUID;
  points: number;
  idempotencyKey: string;
  expectedVersion: number;
}
```

- Server-side command for subscription/reward orchestration.
- Requires an existing relationship from `referrerUserId` to `referredUserId`.
- Requires `points` to be a positive safe integer.
- Requires a non-empty `idempotencyKey`.
- Creates one `ReferralSubscriptionEvent` row for the idempotency key.
- Increments the referrer's current point balance.
- Uses optimistic locking with `expectedVersion`.
- Returns `{ success: true, data: ReferralProfile }`.

### AdjustReferralPoints

```typescript
interface AdjustReferralPointsCommand {
  referrerUserId: UUID;
  points: number;
  reason: string;
  idempotencyKey: string;
  expectedVersion: number;
}
```

- Server-side command for future reversals/admin corrections.
- Allows positive or negative point adjustments.
- Requires the resulting balance to be greater than or equal to `0`.
- Requires a non-empty reason and idempotency key.
- Uses optimistic locking with `expectedVersion`.
- Returns `{ success: true, data: ReferralProfile }`.

## Queries

### GetMyReferralProfile

```typescript
interface GetMyReferralProfileQuery {}
```

- Requires authentication.
- Returns the authenticated user's referral profile.
- Does not create a missing profile.
- Returns `REFERRAL_PROFILE_NOT_FOUND` when no profile exists.
- Returns `{ success: true, data: ReferralProfile }`.

### ResolveReferralSlug

```typescript
interface ResolveReferralSlugQuery {
  slug: string;
}
```

- Normalizes the input slug before lookup.
- Returns the matching referral profile.
- Returns `REFERRAL_SLUG_NOT_FOUND` when no slug matches.
- Does not track valid or invalid slug visits.
- Returns `{ success: true, data: ReferralProfile }`.

### GetReferralRelationshipForUser

```typescript
interface GetReferralRelationshipForUserQuery {
  referredUserId: UUID;
}
```

- Server-side query for trusted orchestration flows.
- Returns the relationship where the provided user is the referred user.
- Returns `REFERRAL_RELATIONSHIP_NOT_FOUND` when no relationship exists.
- Returns `{ success: true, data: ReferralRelationship }`.

## Persistence

- Use standard Drizzle schema definitions.
- Add `referral_profile` with `id`, `userId`, `slug`, `points`, `version`, `createdAt`, and `updatedAt`.
- Add `referral_relationship` with `id`, `referrerUserId`, `referredUserId`, and `createdAt`.
- Add `referral_subscription_event` with `id`, `relationshipId`, `referrerUserId`, `referredUserId`, `idempotencyKey`, `pointsAwarded`, and `createdAt`.
- Reference `user.id` with `onDelete: 'cascade'` for profile and relationship user fields.
- Reference `referral_relationship.id` with `onDelete: 'cascade'` for subscription events.
- Enforce unique `referral_profile.userId`.
- Enforce unique `referral_profile.slug`.
- Enforce unique `referral_relationship.referredUserId`.
- Enforce unique `referral_subscription_event.idempotencyKey`.
- Index `referrerUserId` on relationships and subscription events.
- Index `referredUserId` on subscription events.

## Validation

- Use Valibot schemas with `import * as v from 'valibot'`.
- Use `v.pipe(v.string(), v.trim(), v.nonEmpty())` for user-provided strings.
- Use `v.pipe(v.number(), v.integer(), v.safeInteger(), v.minValue(1))` for positive point awards.
- Use `v.pipe(v.number(), v.integer(), v.safeInteger())` plus a resulting-balance check for adjustments.
- Use `v.pipe(v.number(), v.integer(), v.safeInteger(), v.minValue(1))` for `expectedVersion`.
- Use project ID validator helpers once Referral ID prefixes are added.
- Unknown fields are ignored by request payload schemas unless the existing command pattern changes.

## Errors

- `VALIDATION_FAILED`: invalid username, slug, user ID, points, idempotency key, expected version, or request payload.
- `UNAUTHORIZED`: missing authenticated user.
- `FORBIDDEN`: caller is not allowed to run a server-side referral mutation.
- `NOT_FOUND`: generic missing record fallback.
- `REFERRAL_PROFILE_NOT_FOUND`: referral profile does not exist.
- `REFERRAL_SLUG_NOT_FOUND`: referral slug does not resolve to a profile.
- `REFERRAL_RELATIONSHIP_NOT_FOUND`: relationship does not exist for a referred user.
- `REFERRAL_SLUG_GENERATION_FAILED`: slug generation collided after retry exhaustion.
- `SELF_REFERRAL_NOT_ALLOWED`: referrer and referred user are the same user.
- `REFERRAL_ALREADY_EXISTS`: referred user already has a referral relationship.
- `REFERRAL_IDEMPOTENCY_CONFLICT`: idempotency key was already used for a conflicting operation.
- `REFERRAL_VERSION_CONFLICT`: expected profile version does not match the current version.
- `REFERRAL_POINTS_CONFLICT`: point adjustment would produce a negative balance.

## Testing

- Unit test command/query modules with mocked repositories, auth, and trusted server context.
- Integration test repositories against the existing D1 test setup.
- Cover lazy profile creation requiring a usable username.
- Cover slug normalization, conflict retry, and retry exhaustion.
- Cover stable slugs after username changes.
- Cover self-referral rejection.
- Cover one relationship per referred user.
- Cover repeated referred-user subscription awards with distinct idempotency keys.
- Cover duplicate idempotency key behavior.
- Cover optimistic locking success and conflict.
- Cover positive awards and negative adjustment balance protection.
- Cover cascade delete behavior through repository integration tests.

## Deferred Or Out Of Scope

- Referral analytics service/domain is not supported.
- Anonymous click tracking is not supported.
- Invalid slug visit tracking is not supported.
- Custom referral slugs are not supported.
- Point ledger/history UI is not supported.
- Reward policy and subscription billing behavior are not owned here.
- Fraud scoring, leaderboards, campaigns, and admin dashboards are not supported.
