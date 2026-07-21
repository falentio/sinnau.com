# Affiliate Service Specs

## Domain Boundary

Affiliate is responsible for:

- Affiliate profile creation (claim), slug generation, and profile queries
- Referrer-referred relationships (`AffiliateRelationship`)
- Subscription event tracking for sign-up rewards (`AffiliateSubscriptionEvent`)
- Conversion recording and commission accounting (`AffiliateCommission`)
- Payout processing that marks commissions as paid (`AffiliatePayout`)
- Dashboard summary (earnings, balance, conversion count)
- Public slug resolution for affiliate link sharing

Affiliate is not responsible for:

- User authentication or session management
- Payment disbursement (payouts are recorded, not executed)
- Tax reporting or invoicing
- Points/spend redemption (points are accumulated but not spent within this service)
- Sign-up flow or cookie-based referral tracking (referral cookie is set by middleware, not by the service)
- External payment gateway integration

## Entities

### AffiliateProfile

```typescript
interface AffiliateProfile {
  id: string; // prefixed "aff_" + nanoid
  userId: string; // FK → user.id, unique
  slug: string; // unique, auto-generated from user name
  nameSnapshot: string; // user.name at time of claim, never updated
  points: number; // accumulated points (real), default 0
  version: number; // optimistic lock counter, default 1
  createdAt: Date; // ms timestamp
  updatedAt: Date; // ms timestamp
}
```

### AffiliateRelationship

```typescript
interface AffiliateRelationship {
  id: string; // prefixed "afr_" + nanoid
  referrerUserId: string; // FK → user.id
  referredUserId: string; // FK → user.id, unique
  createdAt: Date; // ms timestamp
}
```

### AffiliateSubscriptionEvent

```typescript
interface AffiliateSubscriptionEvent {
  id: string; // prefixed "afs_" + nanoid
  referrerUserId: string; // FK → user.id
  referredUserId: string; // FK → user.id
  relationshipId: string; // FK → affiliateRelationship.id
  pointsAwarded: number; // awarded points (real)
  sourceType: string; // free-text event source
  idempotencyKey: string; // unique, prevents double-award
  createdAt: Date; // ms timestamp
}
```

### AffiliateCommission

```typescript
interface AffiliateCommission {
  id: string; // prefixed "afc_" + nanoid
  affiliateUserId: string; // FK → user.id
  purchaserUserId: string; // FK → user.id
  purchaseAmount: number; // total purchase (real)
  commissionAmount: number; // earned commission (real)
  transactionId: string; // unique, external idempotency key
  status: "PENDING" | "PAID"; // default "PENDING"
  payoutId: string | null; // FK → affiliatePayout.id
  createdAt: Date; // ms timestamp
}
```

### AffiliatePayout

```typescript
interface AffiliatePayout {
  id: string; // prefixed "afp_" + nanoid
  affiliateUserId: string; // FK → user.id
  amount: number; // full pending balance at payout time
  method: string | null; // e.g. "bank_transfer"
  reference: string | null; // external reference
  note: string | null; // admin note
  processedByAdminId: string; // FK → user.id (admin)
  createdAt: Date; // ms timestamp
}
```

### AffiliateDashboardSummary

```typescript
interface AffiliateDashboardSummary {
  profile: AffiliateProfile | null;
  pendingBalance: number; // totalEarned - totalPaid
  totalEarned: number;
  totalPaid: number;
  conversionCount: number;
}
```

### PendingPayout

```typescript
interface PendingPayout {
  affiliateUserId: string;
  slug: string; // falls back to "unknown" if profile missing
  pendingBalance: number;
  conversionCount: number;
}
```

### PendingPayoutsList

```typescript
interface PendingPayoutsList {
  data: PendingPayout[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

## Field Rules

| Field                                 | Rule                                                                                                                                                       |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                  | Server-generated via `generateId(prefix)`. Never client-provided. Prefixes: `aff_`, `afc_`, `afp_`, `afr_`, `afs_`. Validated by `createPrefixedIdSchema`. |
| `slug`                                | Lowercase alphanumeric + hyphens only. Regex: `/^[a-z0-9-]+$/u`. Min 1, max 255 characters. Unique at DB level.                                            |
| `points`                              | Real number, default 0. Updated by `updateProfileBalance` with optimistic locking.                                                                         |
| `version`                             | Integer, default 1. Incremented on every `updateProfileBalance` call via SQL `version + 1`.                                                                |
| `commissionAmount` / `purchaseAmount` | Number, must be >= 0 (`moneySchema`).                                                                                                                      |
| `amount` (payout)                     | Set to full `pendingBalance` at payout time; never client-specified.                                                                                       |
| `transactionId`                       | Required, unique at DB level. Idempotency key for conversions.                                                                                             |
| `status`                              | Picklist: `"PENDING"` or `"PAID"`. Defaults to `"PENDING"`.                                                                                                |
| `nameSnapshot`                        | Snapshot of `user.name` at profile claim time. Never updated.                                                                                              |
| `createdAt` / `updatedAt`             | Unix timestamps in milliseconds, server-defaulted.                                                                                                         |

## Slug Rules

- Generated from `user.name` via `generateSlug` in `src/lib/server/infras/slug.ts`.
- NFKD normalize + strip diacritics (`\p{M}`) for transliteration.
- Sanitize: lowercase, replace whitespace with hyphens, remove non-`[a-z0-9-]`, collapse/h trim hyphens.
- If sanitized base >= 5 characters: `{base}-{entropy}` (e.g. `test-user-ab12cd34`).
- If sanitized base < 5 characters: `{entropy}` only (full 12-char nanoid entropy).
- Entropy length: `max(8, min(12, 12 - base.length))`.
- Entropy source: `tsNanoid` (timestamp-prefixed nanoid).
- On collision: retry up to 5 times with new entropy each attempt.
- After exhaustion: throws `SlugConflictError` which is re-thrown as `AFFILIATE_SLUG_CONFLICT`.
- Slug is set at creation time and never updated.
- Slug uniqueness check is case-sensitive at DB level; slugs are always lowercase.

## Optimistic Locking

- `AffiliateProfile` has a `version` column (integer, default 1).
- `updateProfileBalance(profileId, points, expectedVersion)` increments version atomically:
  ```
  SET version = version + 1, points = :points, updatedAt = :now
  WHERE id = :profileId AND version = :expectedVersion
  ```
- If `expectedVersion` does not match the current row version, no rows are updated and the method returns `null`.
- The caller (service layer) is responsible for retrying the read-update cycle on `null` return.
- Currently `updateProfileBalance` exists on the repository interface but is not wired to a service command.

## Authorization

| Method                   | Guard          | Procedure             | Error Code                  |
| ------------------------ | -------------- | --------------------- | --------------------------- |
| `claim`                  | `requireUser`  | `authorizedProcedure` | `UNAUTHORIZED`              |
| `getMyProfile`           | `requireUser`  | `authorizedProcedure` | `UNAUTHORIZED`, `NOT_FOUND` |
| `getDashboardSummary`    | `requireUser`  | `authorizedProcedure` | `UNAUTHORIZED`              |
| `resolveSlug`            | none           | `publicProcedure`     | —                           |
| `recordConversion`       | `requireAdmin` | `adminProcedure`      | `FORBIDDEN`                 |
| `recordPayout`           | `requireAdmin` | `adminProcedure`      | `FORBIDDEN`                 |
| `recordRelationship`     | `requireAdmin` | `adminProcedure`      | `FORBIDDEN`                 |
| `getRelationshipForUser` | `requireAdmin` | `adminProcedure`      | `FORBIDDEN`                 |
| `listPendingPayouts`     | `requireAdmin` | `adminProcedure`      | `FORBIDDEN`                 |

- `requireUser`: throws `UNAUTHORIZED` if `userId` is `null`, `undefined`, or `""`.
- `requireAdmin`: throws `UNAUTHORIZED` if not authenticated; throws `FORBIDDEN` if user role is not `"admin"`.

## Commands

### claim

```
claim({}) → AffiliateProfile
```

- Idempotent get-or-create. Returns existing profile if one exists for the current user.
- Requires authenticated user.
- Looks up `user.name` from DB to generate the slug.
- Generates slug via `generateSlug(user.name)`.
- Inserts `AffiliateProfile` with `nameSnapshot` set to `user.name`.
- Errors: `UNAUTHORIZED`, `NOT_FOUND` (user not found), `AFFILIATE_SLUG_CONFLICT` (slug generation exhausted).

### recordConversion

```
recordConversion({ commissionAmount, purchaseAmount, purchaserUserId, transactionId }) → { commission: AffiliateCommission | null, created: boolean }
```

- Admin-only.
- Looks up `user.affiliatedBy` for the purchaser to find the referrer.
- Returns `{ commission: null, created: false }` if the purchaser has no referrer.
- Throws `AFFILIATE_SELF_REFERRAL` on self-referral (purchaser is their own referrer).
- Checks `transactionId` for idempotency — returns existing commission with `created: false` if duplicate.
- Inserts commission with `status: "PENDING"`.
- Errors: `AFFILIATE_SELF_REFERRAL`.

### recordPayout

```
recordPayout({ affiliateUserId, method?, note?, reference? }) → AffiliatePayout
```

- Admin-only.
- Fetches dashboard summary for the affiliate.
- Amount is always the full `pendingBalance` — never client-specified.
- Inserts payout row, then marks all pending commissions for that user as `"PAID"` with the payout's ID.
- Errors: `UNAUTHORIZED`, `FORBIDDEN`, `AFFILIATE_NO_PENDING_BALANCE` (balance ≤ 0), `INTERNAL_SERVER_ERROR` (insert returned null).

### recordRelationship

```
recordRelationship({ referrerUserId, referredUserId }) → AffiliateRelationship
```

- Admin-only.
- Creates a referral relationship between two users.
- Prevents self-referral.
- Prevents duplicate relationships (one referred user cannot have multiple referrers).
- Errors: `AFFILIATE_SELF_REFERRAL`, `AFFILIATE_RELATIONSHIP_ALREADY_EXISTS`.

## Queries

### getMyProfile

```
getMyProfile({}) → AffiliateProfile
```

- Returns the calling user's affiliate profile.
- Errors: `UNAUTHORIZED`, `NOT_FOUND` (no profile exists).

### getDashboardSummary

```
getDashboardSummary({}) → AffiliateDashboardSummary
```

- Returns earnings breakdown for the calling user.
- `pendingBalance` = `totalEarned - totalPaid`.
- Errors: `UNAUTHORIZED`.

### resolveSlug

```
resolveSlug({ slug }) → { userId: string }
```

- Public (no auth required).
- Sanitizes the input slug before querying.
- Resolves an affiliate slug to the owner's `userId`.
- Errors: `NOT_FOUND` (slug does not match any profile).

### getRelationshipForUser

```
getRelationshipForUser({ referredUserId }) → AffiliateRelationship
```

- Admin-only.
- Returns the relationship for a given referred user.
- Errors: `NOT_FOUND` (no relationship exists for that user).

### listPendingPayouts

```
listPendingPayouts({ page?, limit? }) → PendingPayoutsList
```

- Admin-only.
- Lists affiliates with pending commissions, grouped by user, with aggregated balance and conversion count.
- Defaults: `page = 1`, `limit = 10`.
- `limit` range: 1–100.
- Excludes affiliates whose pending balance was already fully paid.
- Pagination includes `total` based on distinct affiliates with pending commissions.
- Errors: `UNAUTHORIZED`, `FORBIDDEN`.

## Persistence

### Table: `affiliate_profile`

| Column          | Type         | Constraints                                      |
| --------------- | ------------ | ------------------------------------------------ |
| `id`            | text         | PK                                               |
| `user_id`       | text         | NOT NULL, UNIQUE, FK → user.id ON DELETE CASCADE |
| `slug`          | text         | NOT NULL, UNIQUE                                 |
| `name_snapshot` | text         | NOT NULL                                         |
| `points`        | real         | NOT NULL, DEFAULT 0                              |
| `version`       | integer      | NOT NULL, DEFAULT 1                              |
| `created_at`    | integer (ms) | NOT NULL, DEFAULT now                            |
| `updated_at`    | integer (ms) | NOT NULL, DEFAULT now, ON UPDATE                 |

### Table: `affiliate_relationship`

| Column             | Type         | Constraints                                      |
| ------------------ | ------------ | ------------------------------------------------ |
| `id`               | text         | PK                                               |
| `referrer_user_id` | text         | NOT NULL, FK → user.id ON DELETE CASCADE         |
| `referred_user_id` | text         | NOT NULL, UNIQUE, FK → user.id ON DELETE CASCADE |
| `created_at`       | integer (ms) | NOT NULL, DEFAULT now                            |

### Table: `affiliate_subscription_event`

| Column             | Type         | Constraints                                                |
| ------------------ | ------------ | ---------------------------------------------------------- |
| `id`               | text         | PK                                                         |
| `referrer_user_id` | text         | NOT NULL, FK → user.id ON DELETE CASCADE                   |
| `referred_user_id` | text         | NOT NULL, FK → user.id ON DELETE CASCADE                   |
| `relationship_id`  | text         | NOT NULL, FK → affiliate_relationship.id ON DELETE CASCADE |
| `points_awarded`   | real         | NOT NULL                                                   |
| `source_type`      | text         | NOT NULL                                                   |
| `idempotency_key`  | text         | NOT NULL, UNIQUE                                           |
| `created_at`       | integer (ms) | NOT NULL, DEFAULT now                                      |

### Table: `affiliate_commission`

| Column              | Type         | Constraints                                             |
| ------------------- | ------------ | ------------------------------------------------------- |
| `id`                | text         | PK                                                      |
| `affiliate_user_id` | text         | NOT NULL, FK → user.id ON DELETE CASCADE                |
| `purchaser_user_id` | text         | NOT NULL, FK → user.id ON DELETE CASCADE                |
| `purchase_amount`   | real         | NOT NULL                                                |
| `commission_amount` | real         | NOT NULL                                                |
| `transaction_id`    | text         | NOT NULL, UNIQUE                                        |
| `status`            | text         | NOT NULL, DEFAULT 'PENDING', CHECK('PENDING' \| 'PAID') |
| `payout_id`         | text         | NULLABLE, FK → affiliate_payout.id ON DELETE SET NULL   |
| `created_at`        | integer (ms) | NOT NULL, DEFAULT now                                   |

### Table: `affiliate_payout`

| Column                  | Type         | Constraints                              |
| ----------------------- | ------------ | ---------------------------------------- |
| `id`                    | text         | PK                                       |
| `affiliate_user_id`     | text         | NOT NULL, FK → user.id ON DELETE CASCADE |
| `amount`                | real         | NOT NULL                                 |
| `method`                | text         | NULLABLE                                 |
| `reference`             | text         | NULLABLE                                 |
| `note`                  | text         | NULLABLE                                 |
| `processed_by_admin_id` | text         | NOT NULL, FK → user.id ON DELETE CASCADE |
| `created_at`            | integer (ms) | NOT NULL, DEFAULT now                    |

### Cascade Behavior

- Deleting a user CASCADE-deletes their profile, relationships, commissions, subscription events, and payouts.
- Deleting a payout SET NULLs the `payoutId` on associated commissions (commissions are preserved but orphaned).
- Deleting a relationship CASCADE-deletes its subscription events.

## Validation

Valibot schemas in `src/lib/schemas/affiliate.ts`:

| Schema                                 | Description                                                            |
| -------------------------------------- | ---------------------------------------------------------------------- |
| `commissionStatusSchema`               | Picklist of `["PENDING", "PAID"]`                                      |
| `affiliateProfileIdSchema`             | Prefixed ID: `aff_{2 lowercase}{16 alphanumeric}`                      |
| `affiliateCommissionIdSchema`          | Prefixed ID: `afc_{2 lowercase}{16 alphanumeric}`                      |
| `affiliatePayoutIdSchema`              | Prefixed ID: `afp_{2 lowercase}{16 alphanumeric}`                      |
| `affiliateRelationshipIdSchema`        | Prefixed ID: `afr_{2 lowercase}{16 alphanumeric}`                      |
| `affiliateSubscriptionEventIdSchema`   | Prefixed ID: `afs_{2 lowercase}{16 alphanumeric}`                      |
| `slugSchema`                           | `string`, min 1, max 255, regex `/^[a-z0-9-]+$/u`                      |
| `moneySchema`                          | `number`, min 0                                                        |
| `recordAffiliateConversionInputSchema` | `{ commissionAmount, purchaseAmount, purchaserUserId, transactionId }` |
| `recordAffiliatePayoutInputSchema`     | `{ affiliateUserId, method?, note?, reference? }`                      |
| `claimAffiliateProfileInputSchema`     | `{}` (no input)                                                        |
| `resolveAffiliateSlugInputSchema`      | `{ slug }`                                                             |
| `getAffiliateDashboardInputSchema`     | `{}` (no input)                                                        |
| `listPendingPayoutsInputSchema`        | `{ page?, limit? }` with integer constraints                           |

Constants in `src/lib/schemas/affiliate.constant.ts`:

| Constant                                 | Value                 |
| ---------------------------------------- | --------------------- |
| `AFFILIATE_ID_PREFIX`                    | `"aff"`               |
| `AFFILIATE_COMMISSION_ID_PREFIX`         | `"afc"`               |
| `AFFILIATE_PAYOUT_ID_PREFIX`             | `"afp"`               |
| `AFFILIATE_RELATIONSHIP_ID_PREFIX`       | `"afr"`               |
| `AFFILIATE_SUBSCRIPTION_EVENT_ID_PREFIX` | `"afs"`               |
| `AFFILIATE_COMMISSION_STATUSES`          | `["PENDING", "PAID"]` |
| `AFFILIATE_COOKIE_NAME`                  | `"affiliate_ref"`     |
| `AFFILIATE_COOKIE_MAX_AGE_SECONDS`       | `2592000` (30 days)   |
| `AFFILIATE_SLUG_MAX_RETRIES`             | `5`                   |

## Errors

| Code                                    | Source                     | Message                                                                                                                    |
| --------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `UNAUTHORIZED`                          | Guard `requireUser`        | `"Authentication is required"`                                                                                             |
| `FORBIDDEN`                             | Guard `requireAdmin`       | `"Admin access required"`                                                                                                  |
| `NOT_FOUND`                             | Service                    | `"Affiliate profile not found"` / `"User not found"` / `"Affiliate link not found"` / `"Affiliate relationship not found"` |
| `AFFILIATE_SLUG_CONFLICT`               | Service                    | `"Failed to generate a unique slug after maximum retries"`                                                                 |
| `AFFILIATE_SELF_REFERRAL`               | Service                    | `"Cannot refer yourself"`                                                                                                  |
| `AFFILIATE_RELATIONSHIP_ALREADY_EXISTS` | Service                    | `"User already has a referrer"`                                                                                            |
| `AFFILIATE_NO_PENDING_BALANCE`          | Service                    | `"No pending balance to payout"`                                                                                           |
| `INTERNAL_SERVER_ERROR`                 | Repository (catch wrapper) | `"Internal server error"`                                                                                                  |

## Testing

Three test files, mirroring the service's three layers:

- **`affiliate.service.test.ts`** — Unit tests against `new AffiliateService(mockRepo, mockGuard)`. Covers every branch and error path for: `claim` (idempotent get-or-create, slug generation, slug conflict, user-not-found), `resolveSlug` (found, not found, sanitization), `recordConversion` (found affiliate, no affiliate, self-referral, duplicate transaction, insert failure), `recordPayout` (full payout flow, note forwarding, zero balance, unauthorized, insert failure), `getDashboardSummary` (found, unauthorized), `listPendingPayouts` (admin flow, custom pagination, unauthorized).

- **`affiliate.guard.test.ts`** — Unit tests against `new AffiliateGuard(mockRepo, mockUserRepo)`. Tests: `requireUser` (valid, null, undefined, empty string), `requireAdmin` (admin role, non-admin role, user not found, null userId).

- **`affiliate.repository.drizzle.test.ts`** — Integration tests against an in-memory SQLite DB via `AffiliateTestEnv`. Tests: `insertProfile` (persistence, duplicate userId returns null, duplicate slug returns null), `findProfileByUserId`, `findProfileBySlug`, `insertConversion` (persistence, duplicate transactionId returns null), `findConversionByTransactionId`, `getDashboardSummary` (earnings breakdown, zero values, null profile), `listPendingPayouts` (grouped results, unknown slug fallback, excluded paid affiliates, pagination), `insertPayout` (persistence), `markCommissionsAsPaid` (marks pending, returns 0 for none, leaves paid untouched), `findAffiliatedByUserId`, `findUserById`, and schema constraints (foreign key rejection, cascade on user deletion).

### Repository methods not yet wired to a service command

- `updateProfileBalance(profileId, points, expectedVersion)` — Repository method exists with optimistic locking, but no service command or router endpoint calls it yet. Available for future points/spend integration.
- `AffiliateSubscriptionEvent` — Table and schema exist but no repository or service methods reference it yet. Available for future subscription sign-up reward tracking.
