# Affiliate Service Specs

## Domain Boundary

Affiliate is responsible for:

- Affiliate application submission, admin review (accept/reject), and application queries
- Affiliate profile creation (on acceptance), slug generation, and profile queries
- Referrer attribution on the user record (`user.affiliatedBy`), set at signup and correctable by admins
- Subscription event tracking for sign-up rewards (`AffiliateSubscriptionEvent`)
- Conversion recording and commission accounting (`AffiliateCommission`)
- Payout processing that marks commissions as paid (`AffiliatePayout`)
- Payout account management (user submits/updates bank or e-wallet details for payout destination)
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

### AffiliateApplication

```typescript
interface AffiliateApplication {
  id: string; // prefixed "afa_" + nanoid
  userId: string; // FK → user.id
  instagramHandle: string | null; // optional
  tiktokHandle: string | null; // optional
  youtubeHandle: string | null; // optional
  advantage: string; // mandatory, min 10 chars
  status: "PENDING" | "ACCEPTED" | "REJECTED"; // default "PENDING"
  reviewedByAdminId: string | null; // FK → user.id (admin)
  reviewedAt: Date | null; // ms timestamp
  createdAt: Date; // ms timestamp
  updatedAt: Date; // ms timestamp
}
```

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

### AffiliateSubscriptionEvent

```typescript
interface AffiliateSubscriptionEvent {
  id: string; // prefixed "afs_" + nanoid
  referrerUserId: string; // FK → user.id
  referredUserId: string; // FK → user.id
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
  status: "PENDING" | "PAID" | "VOID"; // default "PENDING"
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

### AffiliatePayoutAccount

```typescript
interface AffiliatePayoutAccount {
  id: string; // prefixed "afpa_" + nanoid
  userId: string; // FK → user.id, unique
  method: "GOPAY" | "BANK"; // payout method
  bankName: string | null; // required if BANK, null if GOPAY
  accountNumber: string; // digits only, 5-30 chars
  accountHolderName: string; // min 3, max 255 chars
  whatsappNumber: string; // contact number for admin, 8-20 chars
  createdAt: Date; // ms timestamp
  updatedAt: Date; // ms timestamp
}
```

## Payout Schedule

- Commissions are paid out **weekly, every Friday**.
- A payout requires a minimum pending balance of `AFFILIATE_MINIMUM_PAYOUT_AMOUNT` (Rp50.000).
- This schedule is currently informational copy shown to affiliates (balance card, how-it-works, payout account note); it is not yet enforced by `recordPayout`.

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
  payoutAccount: PayoutAccountInfo | null; // null if not submitted
}
```

### PayoutAccountInfo

```typescript
interface PayoutAccountInfo {
  method: "GOPAY" | "BANK";
  bankName: string | null;
  accountNumber: string;
  accountHolderName: string;
  whatsappNumber: string;
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

| Field                                 | Rule                                                                                                                                                                                                |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                  | Server-generated via `generateId(prefix)`. Never client-provided. Prefixes: `aff_`, `afc_`, `afp_`, `afs_`, `afpa_`. Validated by `createPrefixedIdSchema`.                                         |
| `slug`                                | Lowercase alphanumeric + hyphens only. Regex: `/^[a-z0-9-]+$/u`. Min 1, max 255 characters. Unique at DB level.                                                                                     |
| `points`                              | Real number, default 0. Updated by `updateProfileBalance` with optimistic locking.                                                                                                                  |
| `version`                             | Integer, default 1. Incremented on every `updateProfileBalance` call via SQL `version + 1`.                                                                                                         |
| `commissionAmount` / `purchaseAmount` | Number, must be >= 0 (`moneySchema`).                                                                                                                                                               |
| `amount` (payout)                     | Set to full `pendingBalance` at payout time; never client-specified.                                                                                                                                |
| `transactionId`                       | Required, unique at DB level. Idempotency key for conversions.                                                                                                                                      |
| `status`                              | Picklist: `"PENDING"`, `"PAID"`, or `"VOID"`. Defaults to `"PENDING"`. `"VOID"` marks a commission invalidated after the fact (e.g. refunded order); voided commissions are excluded from balances. |
| `nameSnapshot`                        | Snapshot of `user.name` at profile claim time. Never updated.                                                                                                                                       |
| `createdAt` / `updatedAt`             | Unix timestamps in milliseconds, server-defaulted.                                                                                                                                                  |

## Slug Rules

- Generated as a random 8-character nanoid (lowercase alphanumeric) via `nanoid(8).toLowerCase()` from `src/lib/server/utils/nanoid.ts`.
- On collision: retry up to 5 times with a new nanoid each attempt.
- After exhaustion: throws `AFFILIATE_SLUG_CONFLICT`.
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

## Commission Reconciliation

Commissions can drift from reality: an order may be paid without a commission being recorded (lost commission), or a commission may stay `PENDING` after its order is refunded/cancelled (invalid commission). Reconciliation detects and repairs this drift.

- **Detection is read-only** (`reconcileCommissions`); **repair is explicit** (`backfillCommissions`). Nothing auto-heals, and there is no background worker — an admin runs both.
- **Missing commission**: a `PAID` `plan_order` whose purchaser has a non-self referrer (`user.affiliatedBy`) but no commission keyed to the order's `payment.gatewayTransactionId`. The repository returns the raw `purchaseAmount`; the service computes `expectedCommissionAmount = round(purchaseAmount * AFFILIATE_COMMISSION_RATE)`.
- **Invalid commission**: a `PENDING` commission whose matched order is no longer `PAID`. Repair marks it `VOID`.
- **Deliberate non-cases**: a commission with no matching order is left alone (admins can record conversions manually via `recordConversion`); an amount mismatch is not a discrepancy.
- **Payout guard**: `recordPayout` refuses to run while any discrepancy exists, forcing the admin to backfill first. This prevents paying out an incorrect balance.
- Both operations accept an optional `affiliateUserId`; when omitted they run across all affiliates.

## Authorization

| Method                 | Guard          | Procedure             | Error Code                             |
| ---------------------- | -------------- | --------------------- | -------------------------------------- |
| `apply`                | `requireUser`  | `authorizedProcedure` | `UNAUTHORIZED`                         |
| `acceptApplication`    | `requireAdmin` | `adminProcedure`      | `FORBIDDEN`                            |
| `rejectApplication`    | `requireAdmin` | `adminProcedure`      | `FORBIDDEN`                            |
| `getMyApplication`     | `requireUser`  | `authorizedProcedure` | `UNAUTHORIZED`, `NOT_FOUND`            |
| `listApplications`     | `requireAdmin` | `adminProcedure`      | `FORBIDDEN`                            |
| `getMyProfile`         | `requireUser`  | `authorizedProcedure` | `UNAUTHORIZED`, `NOT_FOUND`            |
| `getDashboardSummary`  | `requireUser`  | `authorizedProcedure` | `UNAUTHORIZED`                         |
| `resolveSlug`          | none           | `publicProcedure`     | —                                      |
| `recordConversion`     | `requireAdmin` | `adminProcedure`      | `FORBIDDEN`                            |
| `recordPayout`         | `requireAdmin` | `adminProcedure`      | `FORBIDDEN`                            |
| `reconcileCommissions` | `requireAdmin` | `adminProcedure`      | `FORBIDDEN`                            |
| `backfillCommissions`  | `requireAdmin` | `adminProcedure`      | `FORBIDDEN`                            |
| `setReferrer`          | `requireAdmin` | `adminProcedure`      | `FORBIDDEN`                            |
| `listPendingPayouts`   | `requireAdmin` | `adminProcedure`      | `FORBIDDEN`                            |
| `submitPayoutAccount`  | `requireUser`  | `authorizedProcedure` | `UNAUTHORIZED`, `AFFILIATE_NO_PROFILE` |
| `getMyPayoutAccount`   | `requireUser`  | `authorizedProcedure` | `UNAUTHORIZED`, `NOT_FOUND`            |

- `requireUser`: throws `UNAUTHORIZED` if `userId` is `null`, `undefined`, or `""`.
- `requireAdmin`: throws `UNAUTHORIZED` if not authenticated; throws `FORBIDDEN` if user role is not `"admin"`.

## Commands

### apply

```
apply({ advantage, instagramHandle?, tiktokHandle?, youtubeHandle? }) → AffiliateApplication
```

- Requires authenticated user.
- Throws `AFFILIATE_ALREADY_APPROVED` if the user already has an affiliate profile.
- Throws `AFFILIATE_APPLICATION_PENDING` if the user already has a pending application.
- Inserts an `AffiliateApplication` with `status: "PENDING"`.
- Users may re-apply after rejection (multiple applications per user allowed, but only one PENDING at a time).
- Errors: `UNAUTHORIZED`, `AFFILIATE_ALREADY_APPROVED`, `AFFILIATE_APPLICATION_PENDING`.

### acceptApplication

```
acceptApplication({ applicationId }) → AffiliateProfile
```

- Admin-only.
- Looks up the application by ID; throws `NOT_FOUND` if missing.
- Throws `AFFILIATE_APPLICATION_NOT_PENDING` if the application is not in `PENDING` status.
- Marks the application `ACCEPTED` with the admin's ID and timestamp.
- Creates an `AffiliateProfile` with a generated slug (same slug generation logic as the former `claim`).
- Errors: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `AFFILIATE_APPLICATION_NOT_PENDING`, `AFFILIATE_SLUG_CONFLICT`.

### rejectApplication

```
rejectApplication({ applicationId }) → AffiliateApplication
```

- Admin-only.
- Looks up the application by ID; throws `NOT_FOUND` if missing.
- Throws `AFFILIATE_APPLICATION_NOT_PENDING` if the application is not in `PENDING` status.
- Marks the application `REJECTED` with the admin's ID and timestamp.
- Errors: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `AFFILIATE_APPLICATION_NOT_PENDING`.

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
- **Reconciliation guard:** runs reconciliation first; if any discrepancy exists (missing or invalid commissions), throws `AFFILIATE_RECONCILE_BEFORE_PAYOUT`. The admin must `backfillCommissions` before paying out.
- Payout is **atomic**: a single transaction (`createPayoutForAffiliate`) sums the affiliate's `PENDING` commissions, inserts one payout for that sum, and marks exactly those commissions `"PAID"` with the payout's ID. Amount is the summed pending balance — never client-specified. Concurrent payouts cannot double-spend because the sum and the mark happen in one transaction.
- Errors: `UNAUTHORIZED`, `FORBIDDEN`, `AFFILIATE_RECONCILE_BEFORE_PAYOUT` (discrepancy present), `AFFILIATE_NO_PENDING_BALANCE` (no pending commissions), `INTERNAL_SERVER_ERROR` (insert returned null).

### setReferrer

```
setReferrer({ referredUserId, referrerUserId }) → { userId, affiliatedBy }
```

- Admin-only.
- Sets or clears the referrer attribution (`user.affiliatedBy`) for a given user. This field is the single source of truth for who referred a user; commission recording reads it.
- Pass `referrerUserId: null` to clear an existing attribution.
- Validates the referrer exists when `referrerUserId` is non-null.
- Prevents self-referral.
- Errors: `AFFILIATE_SELF_REFERRAL`, `NOT_FOUND` (referrer or referred user not found).

### backfillCommissions

```
backfillCommissions({ affiliateUserId? }) → { created: number, voided: number }
```

- Admin-only.
- Applies reconciliation fixes: inserts a commission for every missing one (`commissionAmount = round(purchaseAmount * AFFILIATE_COMMISSION_RATE)`, `status: "PENDING"`) and marks every invalid commission `"VOID"`.
- `affiliateUserId` is optional; when omitted, backfills across all affiliates.
- Idempotent: re-running creates/voids nothing once discrepancies are cleared.
- Errors: `UNAUTHORIZED`, `FORBIDDEN`.

### submitPayoutAccount

```
submitPayoutAccount({ method, bankName?, accountNumber, accountHolderName, whatsappNumber }) → AffiliatePayoutAccount
```

- Requires authenticated user with an approved affiliate profile.
- Upserts the user's payout account (creates or updates).
- `bankName` is required when `method` is `"BANK"`, ignored (normalized to `null`) when `"GOPAY"`.
- `accountNumber` must be digits only, 5-30 characters.
- `accountHolderName` must be 3-255 characters after trim.
- `whatsappNumber` is the contact number admins use to reach the affiliate; 8-20 characters, digits/spaces/hyphens with optional leading `+`.
- Errors: `UNAUTHORIZED`, `AFFILIATE_NO_PROFILE`.

## Queries

### getMyApplication

```
getMyApplication({}) → AffiliateApplication
```

- Returns the calling user's most recent affiliate application (any status).
- Errors: `UNAUTHORIZED`, `NOT_FOUND` (no application exists).

### listApplications

```
listApplications({ status?, page?, limit? }) → { data: AffiliateApplication[], pagination }
```

- Admin-only.
- Lists applications, optionally filtered by status (`PENDING`, `ACCEPTED`, `REJECTED`).
- Defaults: `page = 1`, `limit = 10`. `limit` range: 1–100.
- Ordered by `createdAt` descending.
- Errors: `UNAUTHORIZED`, `FORBIDDEN`.

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

### getMyPayoutAccount

```
getMyPayoutAccount({}) → AffiliatePayoutAccount
```

- Returns the calling user's payout account.
- Errors: `UNAUTHORIZED`, `NOT_FOUND` (no payout account exists).

### listPendingPayouts

```
listPendingPayouts({ page?, limit? }) → PendingPayoutsList
```

- Admin-only.
- Lists affiliates with pending commissions, grouped by user, with aggregated balance and conversion count.
- Enriched with the affiliate's payout account info (`payoutAccount`), or `null` if not submitted.
- Defaults: `page = 1`, `limit = 10`.
- `limit` range: 1–100.
- Excludes affiliates whose pending balance was already fully paid.
- Pagination includes `total` based on distinct affiliates with pending commissions.
- Errors: `UNAUTHORIZED`, `FORBIDDEN`.

### reconcileCommissions

```
reconcileCommissions({ affiliateUserId? }) → { invalid: InvalidCommission[], missing: MissingCommission[] }
```

- Admin-only. Read-only report — makes no changes.
- `affiliateUserId` is optional; when omitted, reconciles across all affiliates.
- `missing`: PAID orders belonging to a user with a non-self referrer (`user.affiliatedBy`) that have no matching commission (matched on `payment.gatewayTransactionId == commission.transactionId`). Each entry carries the `expectedCommissionAmount`.
- `invalid`: `PENDING` commissions whose matched order is no longer `PAID` (e.g. refunded or cancelled). Each entry carries the current `orderStatus`.
- Amount mismatches are NOT discrepancies. Commissions with no matching order are NOT reported (protects admin `recordConversion`).
- Errors: `UNAUTHORIZED`, `FORBIDDEN`.

## Persistence

### Table: `affiliate_application`

| Column                 | Type         | Constraints                                                               |
| ---------------------- | ------------ | ------------------------------------------------------------------------- |
| `id`                   | text         | PK                                                                        |
| `user_id`              | text         | NOT NULL, FK → user.id ON DELETE CASCADE                                  |
| `instagram_handle`     | text         | NULLABLE                                                                  |
| `tiktok_handle`        | text         | NULLABLE                                                                  |
| `youtube_handle`       | text         | NULLABLE                                                                  |
| `advantage`            | text         | NOT NULL                                                                  |
| `status`               | text         | NOT NULL, DEFAULT 'PENDING', CHECK('PENDING' \| 'ACCEPTED' \| 'REJECTED') |
| `reviewed_by_admin_id` | text         | NULLABLE, FK → user.id ON DELETE SET NULL                                 |
| `reviewed_at`          | integer (ms) | NULLABLE                                                                  |
| `created_at`           | integer (ms) | NOT NULL, DEFAULT now                                                     |
| `updated_at`           | integer (ms) | NOT NULL, DEFAULT now, ON UPDATE                                          |

Index: `affiliate_application_user_status_idx` on (`user_id`, `status`).

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

### Table: `affiliate_subscription_event`

| Column             | Type         | Constraints                              |
| ------------------ | ------------ | ---------------------------------------- |
| `id`               | text         | PK                                       |
| `referrer_user_id` | text         | NOT NULL, FK → user.id ON DELETE CASCADE |
| `referred_user_id` | text         | NOT NULL, FK → user.id ON DELETE CASCADE |
| `points_awarded`   | real         | NOT NULL                                 |
| `source_type`      | text         | NOT NULL                                 |
| `idempotency_key`  | text         | NOT NULL, UNIQUE                         |
| `created_at`       | integer (ms) | NOT NULL, DEFAULT now                    |

### Table: `affiliate_commission`

| Column              | Type         | Constraints                                                       |
| ------------------- | ------------ | ----------------------------------------------------------------- |
| `id`                | text         | PK                                                                |
| `affiliate_user_id` | text         | NOT NULL, FK → user.id ON DELETE CASCADE                          |
| `purchaser_user_id` | text         | NOT NULL, FK → user.id ON DELETE CASCADE                          |
| `purchase_amount`   | real         | NOT NULL                                                          |
| `commission_amount` | real         | NOT NULL                                                          |
| `transaction_id`    | text         | NOT NULL, UNIQUE                                                  |
| `status`            | text         | NOT NULL, DEFAULT 'PENDING', CHECK('PENDING' \| 'PAID' \| 'VOID') |
| `payout_id`         | text         | NULLABLE, FK → affiliate_payout.id ON DELETE SET NULL             |
| `created_at`        | integer (ms) | NOT NULL, DEFAULT now                                             |

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

### Table: `affiliate_payout_account`

| Column                | Type         | Constraints                                      |
| --------------------- | ------------ | ------------------------------------------------ |
| `id`                  | text         | PK                                               |
| `user_id`             | text         | NOT NULL, UNIQUE, FK → user.id ON DELETE CASCADE |
| `method`              | text         | NOT NULL (TS-level enum: 'GOPAY' \| 'BANK')      |
| `bank_name`           | text         | NULLABLE                                         |
| `account_number`      | text         | NOT NULL                                         |
| `account_holder_name` | text         | NOT NULL                                         |
| `whatsapp_number`     | text         | NOT NULL                                         |
| `created_at`          | integer (ms) | NOT NULL, DEFAULT now                            |
| `updated_at`          | integer (ms) | NOT NULL, DEFAULT now, ON UPDATE                 |

### Cascade Behavior

- Deleting a user CASCADE-deletes their applications, profile, commissions, subscription events, payouts, and payout accounts.
- Deleting a payout SET NULLs the `payoutId` on associated commissions (commissions are preserved but orphaned).
- Deleting an admin SET NULLs the `reviewedByAdminId` on associated applications.

## Validation

Valibot schemas in `src/lib/schemas/affiliate.ts`:

| Schema                                      | Description                                                                                                            |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `commissionStatusSchema`                    | Picklist of `["PENDING", "PAID"]`                                                                                      |
| `applicationStatusSchema`                   | Picklist of `["PENDING", "ACCEPTED", "REJECTED"]`                                                                      |
| `affiliateProfileIdSchema`                  | Prefixed ID: `aff_{2 lowercase}{16 alphanumeric}`                                                                      |
| `affiliateApplicationIdSchema`              | Prefixed ID: `afa_{2 lowercase}{16 alphanumeric}`                                                                      |
| `affiliateCommissionIdSchema`               | Prefixed ID: `afc_{2 lowercase}{16 alphanumeric}`                                                                      |
| `affiliatePayoutIdSchema`                   | Prefixed ID: `afp_{2 lowercase}{16 alphanumeric}`                                                                      |
| `affiliateSubscriptionEventIdSchema`        | Prefixed ID: `afs_{2 lowercase}{16 alphanumeric}`                                                                      |
| `slugSchema`                                | `string`, min 1, max 255, regex `/^[a-z0-9-]+$/u`                                                                      |
| `moneySchema`                               | `number`, min 0                                                                                                        |
| `applyAffiliateInputSchema`                 | `{ advantage (min 10, max 1000), instagramHandle?, tiktokHandle?, youtubeHandle? }`                                    |
| `reviewAffiliateApplicationInputSchema`     | `{ applicationId }`                                                                                                    |
| `listAffiliateApplicationsInputSchema`      | `{ status?, page?, limit? }` with integer constraints                                                                  |
| `affiliateApplicationSchema`                | Full application entity output schema                                                                                  |
| `listAffiliateApplicationsOutputSchema`     | `{ data: AffiliateApplication[], pagination }`                                                                         |
| `recordAffiliateConversionInputSchema`      | `{ commissionAmount, purchaseAmount, purchaserUserId, transactionId }`                                                 |
| `recordAffiliatePayoutInputSchema`          | `{ affiliateUserId, method?, note?, reference? }`                                                                      |
| `setAffiliateReferrerInputSchema`           | `{ referredUserId, referrerUserId (nullable) }`                                                                        |
| `setAffiliateReferrerOutputSchema`          | `{ userId, affiliatedBy (nullable) }`                                                                                  |
| `resolveAffiliateSlugInputSchema`           | `{ slug }`                                                                                                             |
| `getAffiliateDashboardInputSchema`          | `{}` (no input)                                                                                                        |
| `listPendingPayoutsInputSchema`             | `{ page?, limit? }` with integer constraints                                                                           |
| `reconcileAffiliateCommissionsInputSchema`  | `{ affiliateUserId? }`                                                                                                 |
| `reconcileAffiliateCommissionsOutputSchema` | `{ invalid: InvalidCommission[], missing: MissingCommission[] }`                                                       |
| `backfillAffiliateCommissionsInputSchema`   | `{ affiliateUserId? }`                                                                                                 |
| `backfillAffiliateCommissionsOutputSchema`  | `{ created: number, voided: number }`                                                                                  |
| `missingCommissionSchema`                   | `{ affiliateUserId, expectedCommissionAmount, purchaseAmount, purchaserUserId, transactionId }`                        |
| `invalidCommissionSchema`                   | `{ affiliateUserId, commissionAmount, commissionId, orderStatus, purchaserUserId, transactionId }`                     |
| `payoutMethodSchema`                        | Picklist of `["GOPAY", "BANK"]`                                                                                        |
| `affiliatePayoutAccountIdSchema`            | Prefixed ID: `afpa_{2 lowercase}{16 alphanumeric}`                                                                     |
| `submitPayoutAccountInputSchema`            | `{ method, bankName?, accountNumber (digits 5-30), accountHolderName (3-255), whatsappNumber (8-20) }` with BANK check |
| `affiliatePayoutAccountSchema`              | Full payout account entity output schema                                                                               |
| `payoutAccountInfoSchema`                   | `{ method, bankName, accountNumber, accountHolderName, whatsappNumber }` (subset for enriched lists)                   |
| `getMyPayoutAccountInputSchema`             | `{}` (no input)                                                                                                        |

Constants in `src/lib/schemas/affiliate.constant.ts`:

| Constant                                 | Value                                 |
| ---------------------------------------- | ------------------------------------- |
| `AFFILIATE_ID_PREFIX`                    | `"aff"`                               |
| `AFFILIATE_APPLICATION_ID_PREFIX`        | `"afa"`                               |
| `AFFILIATE_COMMISSION_ID_PREFIX`         | `"afc"`                               |
| `AFFILIATE_PAYOUT_ID_PREFIX`             | `"afp"`                               |
| `AFFILIATE_SUBSCRIPTION_EVENT_ID_PREFIX` | `"afs"`                               |
| `AFFILIATE_PAYOUT_ACCOUNT_ID_PREFIX`     | `"afpa"`                              |
| `AFFILIATE_PAYOUT_METHODS`               | `["GOPAY", "BANK"]`                   |
| `AFFILIATE_ACCOUNT_NUMBER_MIN_LENGTH`    | `5`                                   |
| `AFFILIATE_ACCOUNT_NUMBER_MAX_LENGTH`    | `30`                                  |
| `AFFILIATE_BANK_NAME_MAX_LENGTH`         | `100`                                 |
| `AFFILIATE_ACCOUNT_HOLDER_MIN_LENGTH`    | `3`                                   |
| `AFFILIATE_ACCOUNT_HOLDER_MAX_LENGTH`    | `255`                                 |
| `AFFILIATE_WHATSAPP_MIN_LENGTH`          | `8`                                   |
| `AFFILIATE_WHATSAPP_MAX_LENGTH`          | `20`                                  |
| `AFFILIATE_COMMISSION_RATE`              | `0.25`                                |
| `AFFILIATE_MINIMUM_PAYOUT_AMOUNT`        | `50000`                               |
| `AFFILIATE_COMMISSION_STATUSES`          | `["PENDING", "PAID", "VOID"]`         |
| `AFFILIATE_APPLICATION_STATUSES`         | `["PENDING", "ACCEPTED", "REJECTED"]` |
| `AFFILIATE_ADVANTAGE_MIN_LENGTH`         | `10`                                  |
| `AFFILIATE_ADVANTAGE_MAX_LENGTH`         | `1000`                                |
| `AFFILIATE_HANDLE_MAX_LENGTH`            | `255`                                 |
| `AFFILIATE_COOKIE_NAME`                  | `"affiliate_ref"`                     |
| `AFFILIATE_COOKIE_MAX_AGE_SECONDS`       | `2592000` (30 days)                   |
| `AFFILIATE_SLUG_MAX_RETRIES`             | `5`                                   |

## Errors

| Code                                | Source                     | Message                                                                                                                                                                        |
| ----------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `UNAUTHORIZED`                      | Guard `requireUser`        | `"Authentication is required"`                                                                                                                                                 |
| `FORBIDDEN`                         | Guard `requireAdmin`       | `"Admin access required"`                                                                                                                                                      |
| `NOT_FOUND`                         | Service                    | `"Affiliate profile not found"` / `"User not found"` / `"Affiliate link not found"` / `"Referrer not found"` / `"Application not found"` / `"Affiliate application not found"` |
| `AFFILIATE_ALREADY_APPROVED`        | Service                    | `"You already have an affiliate profile"`                                                                                                                                      |
| `AFFILIATE_APPLICATION_PENDING`     | Service                    | `"You already have a pending application"`                                                                                                                                     |
| `AFFILIATE_APPLICATION_NOT_PENDING` | Service                    | `"Application is not pending review"`                                                                                                                                          |
| `AFFILIATE_SLUG_CONFLICT`           | Service                    | `"Failed to generate a unique slug after maximum retries"`                                                                                                                     |
| `AFFILIATE_SELF_REFERRAL`           | Service                    | `"Cannot refer yourself"`                                                                                                                                                      |
| `AFFILIATE_NO_PENDING_BALANCE`      | Service                    | `"No pending balance to payout"`                                                                                                                                               |
| `AFFILIATE_NO_PROFILE`              | Service                    | `"You must have an approved affiliate profile"`                                                                                                                                |
| `AFFILIATE_RECONCILE_BEFORE_PAYOUT` | Service                    | `"Reconcile commissions before paying out this affiliate"`                                                                                                                     |
| `INTERNAL_SERVER_ERROR`             | Repository (catch wrapper) | `"Internal server error"`                                                                                                                                                      |

## Testing

Three test files, mirroring the service's three layers:

- **`affiliate.service.test.ts`** — Unit tests against `new AffiliateService(mockRepo, mockGuard)`. Covers every branch and error path for: `apply` (creates application, already-approved guard, pending-application guard, unauthorized), `acceptApplication` (accepts and creates profile, not-found, not-pending, slug conflict, unauthorized), `rejectApplication` (rejects pending, not-found, not-pending, unauthorized), `getMyApplication` (found, not found, unauthorized), `listApplications` (admin flow, status filter + pagination forwarding, unauthorized), `resolveSlug` (found, not found, sanitization), `recordConversion` (found affiliate, no affiliate, self-referral, duplicate transaction, insert failure), `recordPayout` (atomic payout, reconciliation guard blocks on discrepancy, no pending balance, note forwarding, unauthorized), `reconcileCommissions` (reports missing + invalid, admin-only), `backfillCommissions` (maps missing→inserts and invalid→voids, admin-only), `setReferrer` (set referrer, clear referrer, self-referral, referrer-not-found, user-not-found, unauthorized), `getDashboardSummary` (found, unauthorized), `listPendingPayouts` (admin flow, custom pagination, unauthorized), `submitPayoutAccount` (creates account, normalizes bankName for GOPAY, passes bankName for BANK, no-profile guard, unauthorized), `getMyPayoutAccount` (found, not found, unauthorized).

- **`affiliate.guard.test.ts`** — Unit tests against `new AffiliateGuard(mockRepo, mockUserRepo)`. Tests: `requireUser` (valid, null, undefined, empty string), `requireAdmin` (admin role, non-admin role, user not found, null userId).

- **`affiliate.repository.drizzle.test.ts`** — Integration tests against an in-memory SQLite DB via `AffiliateTestEnv`. Tests: `insertApplication` (persistence, multiple applications per user), `findApplicationById` (found, not found), `findPendingApplicationByUserId` (found, no pending, no applications), `findLatestApplicationByUserId` (returns most recent, no applications), `updateApplicationStatus` (updates status + reviewer info, nonexistent returns null), `listApplications` (all, filtered by status, pagination, empty), `insertProfile` (persistence, duplicate userId returns null, duplicate slug returns null), `findProfileByUserId`, `findProfileBySlug`, `insertConversion` (persistence, duplicate transactionId returns null), `findConversionByTransactionId`, `getDashboardSummary` (earnings breakdown, zero values, null profile), `listPendingPayouts` (grouped results, unknown slug fallback, excluded paid affiliates, pagination, payout account enrichment present/absent), `createPayoutForAffiliate` (atomic sum+insert+mark, returns null on no pending), `findMissingCommissions` (paid orders without a commission, skips self-referral), `findInvalidCommissions` (pending commissions whose order is no longer paid), `backfillCommissions` (inserts missing + voids invalid, idempotent), `findAffiliatedByUserId`, `findUserById`, `updateUserAffiliatedBy` (set, clear, missing user), `findPayoutAccountByUserId` (found, not found), `upsertPayoutAccount` (insert new, update existing), and schema constraints (foreign key rejection, cascade on user deletion).

### Repository methods not yet wired to a service command

- `updateProfileBalance(profileId, points, expectedVersion)` — Repository method exists with optimistic locking, but no service command or router endpoint calls it yet. Available for future points/spend integration.
- `AffiliateSubscriptionEvent` — Table and schema exist but no repository or service methods reference it yet. Available for future subscription sign-up reward tracking.
