import type {
  AffiliateCommission,
  AffiliateProfile,
} from "../../infras/db/schema/affiliate.ts";

export interface InsertSeedConversionInput {
  affiliateUserId: string;
  purchaserUserId: string;
  purchaseAmount: number;
  commissionAmount: number;
  transactionId: string;
}

export interface AffiliateSeedRepository {
  findProfileByUserId(userId: string): Promise<AffiliateProfile | null>;
  insertConversion(
    input: InsertSeedConversionInput
  ): Promise<AffiliateCommission | null>;
  createDevUser(name: string): Promise<string>;
}
