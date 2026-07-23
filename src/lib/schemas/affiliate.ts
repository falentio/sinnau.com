import * as v from "valibot";

import {
  AFFILIATE_COMMISSION_ID_PREFIX,
  AFFILIATE_COMMISSION_STATUSES,
  AFFILIATE_ID_FIELD_MAX_LENGTH,
  AFFILIATE_ID_PREFIX,
  AFFILIATE_PAYOUT_ID_PREFIX,
  AFFILIATE_SUBSCRIPTION_EVENT_ID_PREFIX,
  AFFILIATE_TEXT_FIELD_MAX_LENGTH,
} from "./affiliate.constant.ts";
import { createPrefixedIdSchema } from "./id-schema.ts";
import { ORDER_STATUSES } from "./plan.constant.ts";

export {
  AFFILIATE_ID_PREFIX,
  AFFILIATE_COMMISSION_ID_PREFIX,
  AFFILIATE_PAYOUT_ID_PREFIX,
  AFFILIATE_SUBSCRIPTION_EVENT_ID_PREFIX,
};

export const commissionStatusSchema = v.picklist(AFFILIATE_COMMISSION_STATUSES);

export const affiliateProfileIdSchema =
  createPrefixedIdSchema(AFFILIATE_ID_PREFIX);

export const affiliateCommissionIdSchema = createPrefixedIdSchema(
  AFFILIATE_COMMISSION_ID_PREFIX
);

export const affiliatePayoutIdSchema = createPrefixedIdSchema(
  AFFILIATE_PAYOUT_ID_PREFIX
);

export const affiliateSubscriptionEventIdSchema = createPrefixedIdSchema(
  AFFILIATE_SUBSCRIPTION_EVENT_ID_PREFIX
);

const slugSchema = v.pipe(
  v.string(),
  v.minLength(1, "Slug diperlukan"),
  v.maxLength(255, "Slug maksimal 255 karakter"),
  v.regex(
    /^[a-z0-9-]+$/u,
    "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung"
  )
);

const moneySchema = v.pipe(v.number(), v.minValue(0));

const boundedIdSchema = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(1),
  v.maxLength(AFFILIATE_ID_FIELD_MAX_LENGTH)
);

const boundedTextSchema = v.pipe(
  v.string(),
  v.trim(),
  v.maxLength(AFFILIATE_TEXT_FIELD_MAX_LENGTH)
);

// --------------------
// Command inputs
// --------------------

export const recordAffiliateConversionInputSchema = v.object({
  commissionAmount: moneySchema,
  purchaseAmount: moneySchema,
  purchaserUserId: boundedIdSchema,
  transactionId: boundedIdSchema,
});

// recordPayout does not accept amount — it always pays full pending balance
export const recordAffiliatePayoutInputSchema = v.object({
  affiliateUserId: boundedIdSchema,
  method: v.optional(boundedTextSchema),
  note: v.optional(boundedTextSchema),
  reference: v.optional(boundedTextSchema),
});

// claimSlug takes no input — slug is auto-generated from user name
export const claimAffiliateProfileInputSchema = v.object({});

// --------------------
// Query inputs
// --------------------

export const resolveAffiliateSlugInputSchema = v.object({
  slug: slugSchema,
});

export const getAffiliateDashboardInputSchema = v.object({});

export const listPendingPayoutsInputSchema = v.object({
  limit: v.optional(
    v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100))
  ),
  page: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
});

export const setAffiliateReferrerInputSchema = v.object({
  referredUserId: boundedIdSchema,
  referrerUserId: v.nullable(boundedIdSchema),
});

export const getMyAffiliateProfileInputSchema = v.object({});

// --------------------
// Output schemas
// --------------------

export const affiliateProfileSchema = v.object({
  createdAt: v.date(),
  id: affiliateProfileIdSchema,
  nameSnapshot: v.string(),
  points: v.number(),
  slug: v.string(),
  updatedAt: v.date(),
  userId: v.string(),
  version: v.number(),
});

export const affiliateCommissionSchema = v.object({
  affiliateUserId: v.string(),
  commissionAmount: v.number(),
  createdAt: v.date(),
  id: affiliateCommissionIdSchema,
  payoutId: v.nullable(v.string()),
  purchaseAmount: v.number(),
  purchaserUserId: v.string(),
  status: commissionStatusSchema,
  transactionId: v.string(),
});

export const affiliatePayoutSchema = v.object({
  affiliateUserId: v.string(),
  amount: v.number(),
  createdAt: v.date(),
  id: affiliatePayoutIdSchema,
  method: v.nullable(v.string()),
  note: v.nullable(v.string()),
  processedByAdminId: v.string(),
  reference: v.nullable(v.string()),
});

export const affiliateSubscriptionEventSchema = v.object({
  createdAt: v.date(),
  id: affiliateSubscriptionEventIdSchema,
  idempotencyKey: v.string(),
  pointsAwarded: v.number(),
  referredUserId: v.string(),
  referrerUserId: v.string(),
  sourceType: v.string(),
});

export const affiliateDashboardSummarySchema = v.object({
  conversionCount: v.number(),
  pendingBalance: v.number(),
  profile: v.nullable(affiliateProfileSchema),
  totalEarned: v.number(),
  totalPaid: v.number(),
});

export const pendingPayoutSchema = v.object({
  affiliateUserId: v.string(),
  conversionCount: v.number(),
  pendingBalance: v.number(),
  slug: v.string(),
});

export const pendingPayoutsListSchema = v.object({
  data: v.array(pendingPayoutSchema),
  pagination: v.object({
    limit: v.number(),
    page: v.number(),
    total: v.number(),
    totalPages: v.number(),
  }),
});

export const resolveAffiliateSlugOutputSchema = v.object({
  userId: v.string(),
});

export const recordAffiliateConversionOutputSchema = v.object({
  commission: v.nullable(affiliateCommissionSchema),
  created: v.boolean(),
});

export const setAffiliateReferrerOutputSchema = v.object({
  affiliatedBy: v.nullable(v.string()),
  userId: v.string(),
});

// --------------------
// Reconciliation (admin)
// --------------------

export const reconcileAffiliateCommissionsInputSchema = v.object({
  affiliateUserId: v.optional(boundedIdSchema),
});

export const backfillAffiliateCommissionsInputSchema = v.object({
  affiliateUserId: v.optional(boundedIdSchema),
});

export const missingCommissionSchema = v.object({
  affiliateUserId: v.string(),
  expectedCommissionAmount: v.number(),
  purchaseAmount: v.number(),
  purchaserUserId: v.string(),
  transactionId: v.string(),
});

export const invalidCommissionSchema = v.object({
  affiliateUserId: v.string(),
  commissionAmount: v.number(),
  commissionId: v.string(),
  orderStatus: v.picklist(ORDER_STATUSES),
  purchaserUserId: v.string(),
  transactionId: v.string(),
});

export const reconcileAffiliateCommissionsOutputSchema = v.object({
  invalid: v.array(invalidCommissionSchema),
  missing: v.array(missingCommissionSchema),
});

export const backfillAffiliateCommissionsOutputSchema = v.object({
  created: v.number(),
  voided: v.number(),
});

// --------------------
// Inferred types
// --------------------

export type RecordAffiliateConversionInput = v.InferOutput<
  typeof recordAffiliateConversionInputSchema
>;

export type RecordAffiliatePayoutInput = v.InferOutput<
  typeof recordAffiliatePayoutInputSchema
>;

export type ResolveAffiliateSlugInput = v.InferOutput<
  typeof resolveAffiliateSlugInputSchema
>;

export type ListPendingPayoutsInput = v.InferOutput<
  typeof listPendingPayoutsInputSchema
>;

export type AffiliateProfile = v.InferOutput<typeof affiliateProfileSchema>;

export type AffiliateCommission = v.InferOutput<
  typeof affiliateCommissionSchema
>;

export type AffiliatePayout = v.InferOutput<typeof affiliatePayoutSchema>;

export type AffiliateDashboardSummary = v.InferOutput<
  typeof affiliateDashboardSummarySchema
>;

export type PendingPayout = v.InferOutput<typeof pendingPayoutSchema>;

export type PendingPayoutsList = v.InferOutput<typeof pendingPayoutsListSchema>;

export type ResolveAffiliateSlugOutput = v.InferOutput<
  typeof resolveAffiliateSlugOutputSchema
>;

export type RecordAffiliateConversionOutput = v.InferOutput<
  typeof recordAffiliateConversionOutputSchema
>;

export type AffiliateSubscriptionEvent = v.InferOutput<
  typeof affiliateSubscriptionEventSchema
>;

export type SetAffiliateReferrerInput = v.InferOutput<
  typeof setAffiliateReferrerInputSchema
>;

export type SetAffiliateReferrerOutput = v.InferOutput<
  typeof setAffiliateReferrerOutputSchema
>;

export type GetMyAffiliateProfileInput = v.InferOutput<
  typeof getMyAffiliateProfileInputSchema
>;

export type MissingCommission = v.InferOutput<typeof missingCommissionSchema>;

export type InvalidCommission = v.InferOutput<typeof invalidCommissionSchema>;

export type ReconcileAffiliateCommissionsInput = v.InferOutput<
  typeof reconcileAffiliateCommissionsInputSchema
>;

export type ReconcileAffiliateCommissionsOutput = v.InferOutput<
  typeof reconcileAffiliateCommissionsOutputSchema
>;

export type BackfillAffiliateCommissionsInput = v.InferOutput<
  typeof backfillAffiliateCommissionsInputSchema
>;

export type BackfillAffiliateCommissionsOutput = v.InferOutput<
  typeof backfillAffiliateCommissionsOutputSchema
>;
