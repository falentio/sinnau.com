# Affiliate Seed Service Specs

## Domain Boundary

Affiliate Seed is dev-only, isolated from prod affiliate flows. Responsible for creating stub pending payout records for dev/testing.

Affiliate Seed is responsible for:

- Dev-gated seeding of pending commissions (affiliate_commission PENDING) for an existing affiliate
- Creating ephemeral purchaser users (seed.dev.local) to satisfy FK

Affiliate Seed is not responsible for:

- Creating affiliate profiles or payout accounts (strict: affiliate must already exist)
- Creating plan orders/payments (avoids circular dependency with plan service)
- Payout execution or reconciliation

## Field Rules

- affiliateUserId is required, must have existing affiliate_profile, else AFFILIATE_NO_PROFILE
- count is optional 1..20, default 3
- purchaseAmount is random 100k..300k, commissionAmount = round(purchaseAmount * 0.35)
- transactionId is dev-seed-<nanoid>, unique, on duplicate insert returns null and is not counted

## Authorization

- Dev only: throws FORBIDDEN if dev flag false
- Admin only: requires admin role, else FORBIDDEN/UNAUTHORIZED

## Persistence

- Creates user rows (email <uuid>@seed.dev.local) + affiliate_commission PENDING rows
- No order/payment rows, so findInvalidCommissions will not flag them (innerJoin misses)
