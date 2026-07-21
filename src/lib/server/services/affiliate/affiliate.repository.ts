import type {
  AffiliateCommission,
  AffiliatePayout,
  AffiliateProfile,
  PendingPayout,
  PendingPayoutsList,
} from "$lib/schemas/affiliate";

export type {
  AffiliateCommission,
  AffiliatePayout,
  AffiliateProfile,
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

  getDashboardSummary(userId: string): Promise<{
    profile: AffiliateProfile | null;
    pendingBalance: number;
    totalEarned: number;
    totalPaid: number;
    conversionCount: number;
  }>;

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
}
