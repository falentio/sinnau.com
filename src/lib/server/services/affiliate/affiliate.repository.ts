import type {
  InvalidCommission,
  ListAffiliateApplicationsOutput,
  PendingPayout,
  PendingPayoutsList,
} from "$lib/schemas/affiliate";
import type { AFFILIATE_APPLICATION_STATUSES } from "$lib/schemas/affiliate.constant";

import type {
  AffiliateApplication,
  AffiliateCommission,
  AffiliatePayout,
  AffiliatePayoutAccount,
  AffiliateProfile,
} from "../../infras/db/schema/affiliate.ts";

export type {
  AffiliateApplication,
  AffiliateCommission,
  AffiliatePayout,
  AffiliatePayoutAccount,
  AffiliateProfile,
  InvalidCommission,
  PendingPayout,
  PendingPayoutsList,
};

export interface InsertAffiliateConversionInput {
  affiliateUserId: string;
  purchaserUserId: string;
  purchaseAmount: number;
  commissionAmount: number;
  transactionId: string;
}

export interface MissingCommissionRow {
  affiliateUserId: string;
  purchaseAmount: number;
  purchaserUserId: string;
  transactionId: string;
}

export interface AffiliateDashboardRawSummary {
  profile: AffiliateProfile | null;
  totalEarned: number;
  totalPaid: number;
  conversionCount: number;
}

export interface CreatePayoutForAffiliateInput {
  affiliateUserId: string;
  method: string | null;
  reference: string | null;
  note: string | null;
  processedByAdminId: string;
}

export interface BackfillResult {
  created: number;
  voided: number;
}

export interface InsertAffiliateApplicationInput {
  userId: string;
  instagramHandle: string | null;
  tiktokHandle: string | null;
  youtubeHandle: string | null;
  advantage: string;
}

export interface UpsertPayoutAccountInput {
  userId: string;
  method: "GOPAY" | "BANK";
  bankName: string | null;
  accountNumber: string;
  accountHolderName: string;
}

export interface AffiliateRepository {
  insertApplication(
    input: InsertAffiliateApplicationInput
  ): Promise<AffiliateApplication>;

  findApplicationById(id: string): Promise<AffiliateApplication | null>;

  findPendingApplicationByUserId(
    userId: string
  ): Promise<AffiliateApplication | null>;

  findLatestApplicationByUserId(
    userId: string
  ): Promise<AffiliateApplication | null>;

  updateApplicationStatus(
    id: string,
    status: "ACCEPTED" | "REJECTED",
    reviewedByAdminId: string
  ): Promise<AffiliateApplication | null>;

  listApplications(
    status: (typeof AFFILIATE_APPLICATION_STATUSES)[number] | undefined,
    page: number,
    limit: number
  ): Promise<ListAffiliateApplicationsOutput>;

  insertProfile(
    userId: string,
    slug: string,
    nameSnapshot: string
  ): Promise<AffiliateProfile | null>;

  findProfileByUserId(userId: string): Promise<AffiliateProfile | null>;

  findProfileBySlug(slug: string): Promise<AffiliateProfile | null>;

  insertConversion(
    input: InsertAffiliateConversionInput
  ): Promise<AffiliateCommission | null>;

  findConversionByTransactionId(
    transactionId: string
  ): Promise<AffiliateCommission | null>;

  getDashboardSummary(userId: string): Promise<AffiliateDashboardRawSummary>;

  listPendingPayouts(page: number, limit: number): Promise<PendingPayoutsList>;

  createPayoutForAffiliate(
    input: CreatePayoutForAffiliateInput
  ): Promise<AffiliatePayout | null>;

  findMissingCommissions(
    affiliateUserId?: string
  ): Promise<MissingCommissionRow[]>;

  findInvalidCommissions(
    affiliateUserId?: string
  ): Promise<InvalidCommission[]>;

  backfillCommissions(
    inserts: InsertAffiliateConversionInput[],
    voidCommissionIds: string[]
  ): Promise<BackfillResult>;

  findAffiliatedByUserId(userId: string): Promise<string | null>;

  findUserById(userId: string): Promise<{ id: string; name: string } | null>;

  updateUserAffiliatedBy(
    userId: string,
    referrerUserId: string | null
  ): Promise<{ id: string; affiliatedBy: string | null } | null>;

  updateProfileBalance(
    profileId: string,
    points: number,
    expectedVersion: number
  ): Promise<AffiliateProfile | null>;

  findPayoutAccountByUserId(
    userId: string
  ): Promise<AffiliatePayoutAccount | null>;

  upsertPayoutAccount(
    input: UpsertPayoutAccountInput
  ): Promise<AffiliatePayoutAccount>;
}
