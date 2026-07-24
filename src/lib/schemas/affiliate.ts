import * as v from "valibot";

import {
  AFFILIATE_ACCOUNT_HOLDER_MAX_LENGTH,
  AFFILIATE_ACCOUNT_HOLDER_MIN_LENGTH,
  AFFILIATE_ACCOUNT_NUMBER_MAX_LENGTH,
  AFFILIATE_ACCOUNT_NUMBER_MIN_LENGTH,
  AFFILIATE_ADVANTAGE_MAX_LENGTH,
  AFFILIATE_ADVANTAGE_MIN_LENGTH,
  AFFILIATE_APPLICATION_ID_PREFIX,
  AFFILIATE_APPLICATION_STATUSES,
  AFFILIATE_BANK_NAME_MAX_LENGTH,
  AFFILIATE_COMMISSION_ID_PREFIX,
  AFFILIATE_COMMISSION_STATUSES,
  AFFILIATE_HANDLE_MAX_LENGTH,
  AFFILIATE_ID_FIELD_MAX_LENGTH,
  AFFILIATE_ID_PREFIX,
  AFFILIATE_PAYOUT_ACCOUNT_ID_PREFIX,
  AFFILIATE_PAYOUT_ID_PREFIX,
  AFFILIATE_PAYOUT_METHODS,
  AFFILIATE_SUBSCRIPTION_EVENT_ID_PREFIX,
  AFFILIATE_TEXT_FIELD_MAX_LENGTH,
  AFFILIATE_WHATSAPP_MAX_LENGTH,
  AFFILIATE_WHATSAPP_MIN_LENGTH,
} from "./affiliate.constant.ts";
import { createPrefixedIdSchema } from "./id-schema.ts";
import { ORDER_STATUSES } from "./plan.constant.ts";

export {
  AFFILIATE_ID_PREFIX,
  AFFILIATE_APPLICATION_ID_PREFIX,
  AFFILIATE_COMMISSION_ID_PREFIX,
  AFFILIATE_PAYOUT_ACCOUNT_ID_PREFIX,
  AFFILIATE_PAYOUT_ID_PREFIX,
  AFFILIATE_SUBSCRIPTION_EVENT_ID_PREFIX,
};

export const commissionStatusSchema = v.picklist(AFFILIATE_COMMISSION_STATUSES);

export const applicationStatusSchema = v.picklist(
  AFFILIATE_APPLICATION_STATUSES
);

export const payoutMethodSchema = v.picklist(AFFILIATE_PAYOUT_METHODS);

export const affiliateApplicationIdSchema = createPrefixedIdSchema(
  AFFILIATE_APPLICATION_ID_PREFIX
);

export const affiliateProfileIdSchema =
  createPrefixedIdSchema(AFFILIATE_ID_PREFIX);

export const affiliateCommissionIdSchema = createPrefixedIdSchema(
  AFFILIATE_COMMISSION_ID_PREFIX
);

export const affiliatePayoutIdSchema = createPrefixedIdSchema(
  AFFILIATE_PAYOUT_ID_PREFIX
);

export const affiliatePayoutAccountIdSchema = createPrefixedIdSchema(
  AFFILIATE_PAYOUT_ACCOUNT_ID_PREFIX
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

const handleSchema = v.pipe(
  v.string(),
  v.trim(),
  v.maxLength(AFFILIATE_HANDLE_MAX_LENGTH)
);

export const applyAffiliateInputSchema = v.object({
  advantage: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(
      AFFILIATE_ADVANTAGE_MIN_LENGTH,
      "Advantage must be at least 10 characters"
    ),
    v.maxLength(
      AFFILIATE_ADVANTAGE_MAX_LENGTH,
      "Advantage must be at most 1000 characters"
    )
  ),
  instagramHandle: v.optional(handleSchema),
  tiktokHandle: v.optional(handleSchema),
  youtubeHandle: v.optional(handleSchema),
});

export const submitPayoutAccountInputSchema = v.pipe(
  v.object({
    accountHolderName: v.pipe(
      v.string(),
      v.trim(),
      v.minLength(
        AFFILIATE_ACCOUNT_HOLDER_MIN_LENGTH,
        "Nama pemilik rekening minimal 3 karakter"
      ),
      v.maxLength(
        AFFILIATE_ACCOUNT_HOLDER_MAX_LENGTH,
        "Nama pemilik rekening maksimal 255 karakter"
      )
    ),
    accountNumber: v.pipe(
      v.string(),
      v.trim(),
      v.regex(/^[0-9]+$/u, "Nomor rekening/gopay hanya boleh berisi angka"),
      v.minLength(
        AFFILIATE_ACCOUNT_NUMBER_MIN_LENGTH,
        "Nomor rekening/gopay minimal 5 digit"
      ),
      v.maxLength(
        AFFILIATE_ACCOUNT_NUMBER_MAX_LENGTH,
        "Nomor rekening/gopay maksimal 30 digit"
      )
    ),
    bankName: v.optional(
      v.pipe(
        v.string(),
        v.trim(),
        v.maxLength(
          AFFILIATE_BANK_NAME_MAX_LENGTH,
          "Nama bank maksimal 100 karakter"
        )
      )
    ),
    method: payoutMethodSchema,
    whatsappNumber: v.pipe(
      v.string(),
      v.trim(),
      v.regex(
        /^\+?[0-9\s-]+$/u,
        "Nomor WhatsApp hanya boleh berisi angka, spasi, tanda hubung, atau diawali +"
      ),
      v.minLength(
        AFFILIATE_WHATSAPP_MIN_LENGTH,
        "Nomor WhatsApp minimal 8 karakter"
      ),
      v.maxLength(
        AFFILIATE_WHATSAPP_MAX_LENGTH,
        "Nomor WhatsApp maksimal 20 karakter"
      )
    ),
  }),
  v.check(
    (input) =>
      input.method !== "BANK" ||
      (input.bankName !== undefined && input.bankName.length > 0),
    "Nama bank diperlukan jika metode BANK"
  )
);

export const reviewAffiliateApplicationInputSchema = v.object({
  applicationId: affiliateApplicationIdSchema,
});

export const listAffiliateApplicationsInputSchema = v.object({
  limit: v.optional(
    v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100))
  ),
  page: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
  status: v.optional(applicationStatusSchema),
});

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

export const getMyAffiliateApplicationInputSchema = v.object({});

export const getMyPayoutAccountInputSchema = v.object({});

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

export const affiliatePayoutAccountSchema = v.object({
  accountHolderName: v.string(),
  accountNumber: v.string(),
  bankName: v.nullable(v.string()),
  createdAt: v.date(),
  id: affiliatePayoutAccountIdSchema,
  method: payoutMethodSchema,
  updatedAt: v.date(),
  userId: v.string(),
  whatsappNumber: v.string(),
});

export const payoutAccountInfoSchema = v.object({
  accountHolderName: v.string(),
  accountNumber: v.string(),
  bankName: v.nullable(v.string()),
  method: payoutMethodSchema,
  whatsappNumber: v.string(),
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

export const affiliateApplicationSchema = v.object({
  advantage: v.string(),
  createdAt: v.date(),
  id: affiliateApplicationIdSchema,
  instagramHandle: v.nullable(v.string()),
  reviewedAt: v.nullable(v.date()),
  reviewedByAdminId: v.nullable(v.string()),
  status: applicationStatusSchema,
  tiktokHandle: v.nullable(v.string()),
  updatedAt: v.date(),
  userId: v.string(),
  youtubeHandle: v.nullable(v.string()),
});

export const listAffiliateApplicationsOutputSchema = v.object({
  data: v.array(affiliateApplicationSchema),
  pagination: v.object({
    limit: v.number(),
    page: v.number(),
    total: v.number(),
    totalPages: v.number(),
  }),
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
  payoutAccount: v.nullable(payoutAccountInfoSchema),
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

export type ApplyAffiliateInput = v.InferOutput<
  typeof applyAffiliateInputSchema
>;

export type AffiliateApplication = v.InferOutput<
  typeof affiliateApplicationSchema
>;

export type ReviewAffiliateApplicationInput = v.InferOutput<
  typeof reviewAffiliateApplicationInputSchema
>;

export type ListAffiliateApplicationsInput = v.InferOutput<
  typeof listAffiliateApplicationsInputSchema
>;

export type ListAffiliateApplicationsOutput = v.InferOutput<
  typeof listAffiliateApplicationsOutputSchema
>;

export type SubmitPayoutAccountInput = v.InferOutput<
  typeof submitPayoutAccountInputSchema
>;

export type AffiliatePayoutAccount = v.InferOutput<
  typeof affiliatePayoutAccountSchema
>;

export type PayoutAccountInfo = v.InferOutput<typeof payoutAccountInfoSchema>;
