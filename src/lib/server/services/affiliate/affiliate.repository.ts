import type { PendingPayout, PendingPayoutsList } from "$lib/schemas/affiliate";

import type {
  AffiliateCommission,
  AffiliatePayout,
  AffiliateProfile,
  AffiliateRelationship,
} from "../../infras/db/schema/affiliate.ts";

export type {
  AffiliateCommission,
  AffiliatePayout,
  AffiliateProfile,
  AffiliateRelationship,
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

export interface InsertAffiliatePayoutInput {
  affiliateUserId: string;
  amount: number;
  method: string | null;
  reference: string | null;
  note: string | null;
  processedByAdminId: string;
}

export interface AffiliateDashboardRawSummary {
  profile: AffiliateProfile | null;
  totalEarned: number;
  totalPaid: number;
  conversionCount: number;
}

export interface AffiliateRepository {
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

  insertPayout(
    input: InsertAffiliatePayoutInput
  ): Promise<AffiliatePayout | null>;

  markCommissionsAsPaid(
    affiliateUserId: string,
    payoutId: string
  ): Promise<number>;

  findAffiliatedByUserId(userId: string): Promise<string | null>;

  findUserById(userId: string): Promise<{ id: string; name: string } | null>;

  insertRelationship(
    referrerUserId: string,
    referredUserId: string
  ): Promise<AffiliateRelationship>;

  findRelationshipByReferredUserId(
    referredUserId: string
  ): Promise<AffiliateRelationship | null>;

  updateProfileBalance(
    profileId: string,
    points: number,
    expectedVersion: number
  ): Promise<AffiliateProfile | null>;
}
