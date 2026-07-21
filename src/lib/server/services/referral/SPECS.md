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
- exposing query procedures for user-facing calls (`GetOrCreateReferralProfile`, `ResolveReferralSlug`)
- exposing plain service methods for cross-domain server-side orchestration (`RecordReferralRelationship`, `AddReferralPoints`, `AdjustReferralPoints`)

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
  id: string;
  userId: string;
  slug: string;
  points: number;
  version: number;
  createdAt: number;
  updatedAt: number;
}

interface ReferralRelationship {
  id: string;
  referrerUserId: string;
  referredUserId: string;
  createdAt: number;
}

interface ReferralSubscriptionEvent {
  id: string;
  relationshipId: string;
  referrerUserId: string;
  referredUserId: string;
  idempotencyKey: string;
  pointsAwarded: number;
  createdAt: number;
}
```

## Field Rules

- `id` values are server-generated using `generateId(REFERRAL_ID_PREFIX)`; clients never provide IDs.
- Application entity IDs (`id`) use the shared `prefix_nanoid` pattern.
- `userId`, `referrerUserId`, and `referredUserId` reference Better Auth `user.id` (plain `text`).
- `slug` defaults from the user's `name` field (the `username` plugin is not installed yet).
- A missing, empty, or unusable `name` prevents lazy profile creation and returns `VALIDATION_FAILED`.
- `points` stores the current balance only; no point ledger is stored.
- `points` starts at `0` and cannot be negative.
- `version` starts at `1` and increments on every referral profile mutation.
- Relationship rows store attribution only, not lifecycle status.
- Subscription event rows store each referred subscription occurrence that awards points.
- `idempotencyKey` is an opaque caller-provided string unique across point-affecting commands.
- Timestamps are stored as Date values via Drizzle's `mode: 'timestamp_ms'`.

## Slug Rules

- Generate the slug from `user.name` when the referral profile is first created.
- Reuse the shared `sanitize` / `generateSlug` functions from `$lib/server/infras/slug.ts`.
- Valid stored slugs use lowercase alphanumeric characters and hyphens only.
- Slug lookup normalizes input before querying.
- Slug uniqueness is case-insensitive because slugs are normalized before storage and lookup.
- Retry slug generation up to `REFERRAL_SLUG_MAX_RETRIES` times (default: `5`), then return `REFERRAL_SLUG_GENERATION_FAILED`.
- Referral slugs do not change when user names change.
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
- Positive point awards and negative point adjustments use separate service methods.
- Negative adjustment support exists for future reversals/admin corrections, but reward policy remains outside this domain.
- Duplicate idempotency keys return the existing `ReferralSubscriptionEvent` and current profile (idempotent replay).

## Optimistic Locking

- `ReferralProfile.version` protects profile mutations, including point balance changes.
- Commands that update the profile require `expectedVersion`.
- Mutations update with a condition equivalent to `id = profileId AND version = expectedVersion`.
- Successful mutations increment `version` by 1.
- Version conflicts return `REFERRAL_VERSION_CONFLICT` with the current version when available.
- Commands do not retry optimistic locking conflicts internally.

## Authorization

- User-facing profile queries and creation require authentication.
- `userId` is inferred from auth context and is never client-provided for `GetOrCreateReferralProfile`.
- `ResolveReferralSlug` is a public query — no authentication required.
- Cross-domain server methods (`RecordReferralRelationship`, `AddReferralPoints`, `AdjustReferralPoints`) are plain service class methods called directly by other domains. They are not exposed as oRPC procedures.
- Deleted users cascade-delete referral profiles, relationships, and subscription events through foreign keys.

## oRPC Procedures

These are exposed through the referral router and called by clients.

### GetOrCreateReferralProfile

```typescript
interface GetOrCreateReferralProfileInput {}
```

- Requires authentication (`authorizedProcedure`).
- Returns the authenticated user's existing referral profile when present.
- Lazily creates a profile when missing.
- Requires the authenticated user to have a usable `name`.
- Generates a stable slug from the user's `name`.
- Returns `{ success: true, data: ReferralProfile }`.

### ResolveReferralSlug

```typescript
interface ResolveReferralSlugInput {
  slug: string;
}
```

- Public query (`publicProcedure`) — no authentication required.
- Normalizes the input slug before lookup.
- Returns the matching referral profile.
- Returns `REFERRAL_SLUG_NOT_FOUND` when no slug matches.
- Does not track valid or invalid slug visits.
- Returns `{ success: true, data: ReferralProfile }`.

## Service Methods (Cross-Domain)

These are plain methods on `ReferralService`, called directly by sibling domains. They are not oRPC procedures.

### RecordReferralRelationship

```typescript
interface RecordReferralRelationshipInput {
  referrerUserId: string;
  referredUserId: string;
}
```

- Called directly by the auth/signup orchestration domain (e.g. after email verification).
- Rejects self-referral.
- Creates one relationship from referrer to referred user.
- Fails if the referred user already has a relationship.
- Returns `{ success: true, data: ReferralRelationship }`.

### AddReferralPoints

```typescript
interface AddReferralPointsInput {
  referrerUserId: string;
  referredUserId: string;
  points: number;
  idempotencyKey: string;
  expectedVersion: number;
}
```

- Called by the billing/subscription domain when a referred user subscribes.
- Resolves the `relationshipId` from the `referrerUserId` / `referredUserId` pair internally.
- Fails if no relationship exists between the two users.
- Requires `points` to be a positive safe integer.
- Requires a non-empty `idempotencyKey`.
- If the idempotency key already exists, returns the existing `ReferralSubscriptionEvent` and current profile (idempotent replay).
- Otherwise creates one `ReferralSubscriptionEvent` row with the resolved `relationshipId`.
- Increments the referrer's current point balance.
- Uses optimistic locking with `expectedVersion`.
- Returns `{ success: true, data: ReferralProfile }`.

### AdjustReferralPoints

```typescript
interface AdjustReferralPointsInput {
  referrerUserId: string;
  points: number;
  reason: string;
  idempotencyKey: string;
  expectedVersion: number;
}
```

- Called for future reversals or admin corrections.
- Allows positive or negative point adjustments.
- Requires the resulting balance to be greater than or equal to `0`.
- Requires a non-empty reason and idempotency key.
- If the idempotency key already exists, returns the existing event and current profile (idempotent replay).
- Uses optimistic locking with `expectedVersion`.
- Returns `{ success: true, data: ReferralProfile }`.

### GetMyReferralProfile

```typescript
interface GetMyReferralProfileInput {
  userId: string;
}
```

- Service method for sibling domains to retrieve a profile by user ID.
- Does not create a missing profile.
- Returns `REFERRAL_PROFILE_NOT_FOUND` when no profile exists.
- Returns `{ success: true, data: ReferralProfile }`.

## Repository Interface

The repository interface is the source of truth for what the service can ask of persistence. It lives in `referral.repository.ts`.

```typescript
interface ReferralRepository {
  insertProfile(row: InsertReferralProfile): Promise<ReferralProfile>;
  findProfileByUserId(userId: string): Promise<ReferralProfile | null>;
  findProfileBySlug(slug: string): Promise<ReferralProfile | null>;
  updateProfilePoints(
    id: string,
    newPoints: number,
    expectedVersion: number
  ): Promise<ReferralProfile | null>;
  isSlugTaken(candidate: string): Promise<boolean>;
  insertRelationship(
    row: InsertReferralRelationship
  ): Promise<ReferralRelationship>;
  findRelationshipByReferredUserId(
    referredUserId: string
  ): Promise<ReferralRelationship | null>;
  insertSubscriptionEvent(
    row: InsertReferralSubscriptionEvent
  ): Promise<ReferralSubscriptionEvent>;
  findSubscriptionEventByIdempotencyKey(
    idempotencyKey: string
  ): Promise<ReferralSubscriptionEvent | null>;
}
```

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
- Application entity IDs are validated with `v.string()` (the `generateId` prefix pattern has no UUID structure).
- Timestamps use `v.date()` (Drizzle `mode: 'timestamp_ms'` maps to `Date` objects).
- Unknown fields are ignored by request payload schemas.

## Errors

- `VALIDATION_FAILED`: invalid name, slug, user ID, points, idempotency key, expected version, or request payload.
- `UNAUTHORIZED`: missing authenticated user.
- `NOT_FOUND`: generic missing record fallback.
- `REFERRAL_PROFILE_NOT_FOUND`: referral profile does not exist.
- `REFERRAL_SLUG_NOT_FOUND`: referral slug does not resolve to a profile.
- `REFERRAL_RELATIONSHIP_NOT_FOUND`: relationship does not exist for a referred user.
- `REFERRAL_SLUG_GENERATION_FAILED`: slug generation collided after retry exhaustion.
- `SELF_REFERRAL_NOT_ALLOWED`: referrer and referred user are the same user.
- `REFERRAL_ALREADY_EXISTS`: referred user already has a referral relationship.
- `REFERRAL_VERSION_CONFLICT`: expected profile version does not match the current version.
- `REFERRAL_POINTS_CONFLICT`: point adjustment would produce a negative balance.

## Testing

- Unit test the service class with mocked repository.
- Unit test the guard class with mocked repository.
- Integration test the Drizzle repository against the existing D1 test setup.
- Cover lazy profile creation requiring a usable `name`.
- Cover slug normalization, conflict retry, and retry exhaustion.
- Cover stable slugs after name changes.
- Cover self-referral rejection.
- Cover one relationship per referred user.
- Cover repeated referred-user subscription awards with distinct idempotency keys.
- Cover duplicate idempotency key idempotent replay behavior.
- Cover optimistic locking success and conflict.
- Cover positive awards and negative adjustment balance protection.
- Cover `AddReferralPoints` relationship lookup failure.
- Cover cascade delete behavior through repository integration tests.

## Deferred Or Out Of Scope

- Referral analytics service/domain is not supported.
- Anonymous click tracking is not supported.
- Invalid slug visit tracking is not supported.
- Custom referral slugs are not supported.
- Point ledger/history UI is not supported.
- Reward policy and subscription billing behavior are not owned here.
- Fraud scoring, leaderboards, campaigns, and admin dashboards are not supported.
