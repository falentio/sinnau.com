import type {
  AffiliateDashboardSummary,
  AffiliatePayout,
  AffiliateProfile,
  BackfillAffiliateCommissionsInput,
  BackfillAffiliateCommissionsOutput,
  ListPendingPayoutsInput,
  PendingPayoutsList,
  ReconcileAffiliateCommissionsInput,
  ReconcileAffiliateCommissionsOutput,
  RecordAffiliateConversionInput,
  RecordAffiliateConversionOutput,
  RecordAffiliatePayoutInput,
  SetAffiliateReferrerInput,
  SetAffiliateReferrerOutput,
} from "$lib/schemas/affiliate";
import { AFFILIATE_COMMISSION_RATE } from "$lib/schemas/affiliate.constant";
import { ORPCError } from "@orpc/server";

import {
  SlugConflictError,
  generateSlug,
  sanitize,
} from "../../infras/slug.ts";
import type { AffiliateGuard } from "./affiliate.guard";
import type { AffiliateRepository } from "./affiliate.repository";

export interface HandlePaymentSuccessInput {
  purchaserUserId: string;
  purchaseAmount: number;
  transactionId: string;
}

export class AffiliateService {
  private readonly repo: AffiliateRepository;
  private readonly guard: AffiliateGuard;

  constructor(repo: AffiliateRepository, guard: AffiliateGuard) {
    this.repo = repo;
    this.guard = guard;
  }

  async getMyProfile(
    userId: string | null | undefined
  ): Promise<AffiliateProfile> {
    const owner = this.guard.requireUser(userId);
    const profile = await this.repo.findProfileByUserId(owner);
    if (!profile) {
      throw new ORPCError("NOT_FOUND", {
        message: "Affiliate profile not found",
      });
    }
    return profile;
  }

  async hasProfile(userId: string): Promise<boolean> {
    const profile = await this.repo.findProfileByUserId(userId);
    return profile !== null;
  }

  async claim(userId: string | null | undefined): Promise<AffiliateProfile> {
    const owner = this.guard.requireUser(userId);

    const existingProfile = await this.repo.findProfileByUserId(owner);
    if (existingProfile) {
      return existingProfile;
    }

    const user = await this.repo.findUserById(owner);
    if (!user) {
      throw new ORPCError("NOT_FOUND", { message: "User not found" });
    }

    const slugExists = async (candidate: string): Promise<boolean> => {
      const existing = await this.repo.findProfileBySlug(candidate);
      return existing !== null;
    };

    try {
      const slug = await generateSlug(user.name, slugExists);
      const profile = await this.repo.insertProfile(owner, slug, user.name);
      if (profile) {
        return profile;
      }

      throw new ORPCError("AFFILIATE_SLUG_CONFLICT", {
        message: "Failed to generate a unique slug after maximum retries",
      });
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      if (error instanceof SlugConflictError) {
        throw new ORPCError("AFFILIATE_SLUG_CONFLICT", {
          message: error.message,
        });
      }
      throw error;
    }
  }

  async resolveSlug(slug: string): Promise<{ userId: string }> {
    const sanitized = sanitize(slug);
    const profile = await this.repo.findProfileBySlug(sanitized);
    if (!profile) {
      throw new ORPCError("NOT_FOUND", {
        message: "Affiliate link not found",
      });
    }
    return { userId: profile.userId };
  }

  async recordConversion(
    input: RecordAffiliateConversionInput,
    adminUserId: string | null | undefined
  ): Promise<RecordAffiliateConversionOutput> {
    await this.guard.requireAdmin(adminUserId);

    const affiliateUserId = await this.repo.findAffiliatedByUserId(
      input.purchaserUserId
    );

    if (affiliateUserId === null) {
      return { commission: null, created: false };
    }

    if (affiliateUserId === input.purchaserUserId) {
      throw new ORPCError("AFFILIATE_SELF_REFERRAL", {
        message: "Cannot refer yourself",
      });
    }

    const existing = await this.repo.findConversionByTransactionId(
      input.transactionId
    );
    if (existing) {
      return { commission: existing, created: false };
    }

    const commission = await this.repo.insertConversion({
      affiliateUserId,
      commissionAmount: input.commissionAmount,
      purchaseAmount: input.purchaseAmount,
      purchaserUserId: input.purchaserUserId,
      transactionId: input.transactionId,
    });

    return {
      commission,
      created: commission !== null,
    };
  }

  async recordPayout(
    input: RecordAffiliatePayoutInput,
    adminUserId: string | null | undefined
  ): Promise<AffiliatePayout> {
    const admin = await this.guard.requireAdmin(adminUserId);

    const [missing, invalid] = await Promise.all([
      this.repo.findMissingCommissions(input.affiliateUserId),
      this.repo.findInvalidCommissions(input.affiliateUserId),
    ]);
    if (missing.length > 0 || invalid.length > 0) {
      throw new ORPCError("AFFILIATE_RECONCILE_BEFORE_PAYOUT", {
        message: "Reconcile commissions before paying out this affiliate",
      });
    }

    const payout = await this.repo.createPayoutForAffiliate({
      affiliateUserId: input.affiliateUserId,
      method: input.method ?? null,
      note: input.note ?? null,
      processedByAdminId: admin,
      reference: input.reference ?? null,
    });

    if (!payout) {
      throw new ORPCError("AFFILIATE_NO_PENDING_BALANCE", {
        message: "No pending balance to payout",
      });
    }

    return payout;
  }

  async setReferrer(
    input: SetAffiliateReferrerInput,
    adminUserId: string | null | undefined
  ): Promise<SetAffiliateReferrerOutput> {
    await this.guard.requireAdmin(adminUserId);

    const referrerUserId = input.referrerUserId ?? null;

    if (referrerUserId !== null) {
      if (referrerUserId === input.referredUserId) {
        throw new ORPCError("AFFILIATE_SELF_REFERRAL", {
          message: "Cannot refer yourself",
        });
      }

      const referrer = await this.repo.findUserById(referrerUserId);
      if (!referrer) {
        throw new ORPCError("NOT_FOUND", { message: "Referrer not found" });
      }
    }

    const updated = await this.repo.updateUserAffiliatedBy(
      input.referredUserId,
      referrerUserId
    );
    if (!updated) {
      throw new ORPCError("NOT_FOUND", { message: "User not found" });
    }

    return { affiliatedBy: updated.affiliatedBy, userId: updated.id };
  }

  async getDashboardSummary(
    userId: string | null | undefined
  ): Promise<AffiliateDashboardSummary> {
    const owner = this.guard.requireUser(userId);
    const raw = await this.repo.getDashboardSummary(owner);
    return {
      conversionCount: raw.conversionCount,
      pendingBalance: raw.totalEarned - raw.totalPaid,
      profile: raw.profile,
      totalEarned: raw.totalEarned,
      totalPaid: raw.totalPaid,
    };
  }

  async listPendingPayouts(
    input: ListPendingPayoutsInput,
    adminUserId: string | null | undefined
  ): Promise<PendingPayoutsList> {
    await this.guard.requireAdmin(adminUserId);
    return await this.repo.listPendingPayouts(
      input.page ?? 1,
      input.limit ?? 10
    );
  }

  async handlePaymentSuccess(input: HandlePaymentSuccessInput): Promise<void> {
    const affiliateUserId = await this.repo.findAffiliatedByUserId(
      input.purchaserUserId
    );
    if (affiliateUserId === null || affiliateUserId === input.purchaserUserId) {
      return;
    }

    const existing = await this.repo.findConversionByTransactionId(
      input.transactionId
    );
    if (existing) {
      return;
    }

    await this.repo.insertConversion({
      affiliateUserId,
      commissionAmount: Math.round(
        input.purchaseAmount * AFFILIATE_COMMISSION_RATE
      ),
      purchaseAmount: input.purchaseAmount,
      purchaserUserId: input.purchaserUserId,
      transactionId: input.transactionId,
    });
  }

  async reconcileCommissions(
    input: ReconcileAffiliateCommissionsInput,
    adminUserId: string | null | undefined
  ): Promise<ReconcileAffiliateCommissionsOutput> {
    await this.guard.requireAdmin(adminUserId);
    const [missing, invalid] = await Promise.all([
      this.repo.findMissingCommissions(input.affiliateUserId),
      this.repo.findInvalidCommissions(input.affiliateUserId),
    ]);
    return { invalid, missing };
  }

  async backfillCommissions(
    input: BackfillAffiliateCommissionsInput,
    adminUserId: string | null | undefined
  ): Promise<BackfillAffiliateCommissionsOutput> {
    await this.guard.requireAdmin(adminUserId);
    const [missing, invalid] = await Promise.all([
      this.repo.findMissingCommissions(input.affiliateUserId),
      this.repo.findInvalidCommissions(input.affiliateUserId),
    ]);
    const inserts = missing.map((m) => ({
      affiliateUserId: m.affiliateUserId,
      commissionAmount: m.expectedCommissionAmount,
      purchaseAmount: m.purchaseAmount,
      purchaserUserId: m.purchaserUserId,
      transactionId: m.transactionId,
    }));
    const voidCommissionIds = invalid.map((i) => i.commissionId);
    return await this.repo.backfillCommissions(inserts, voidCommissionIds);
  }
}
