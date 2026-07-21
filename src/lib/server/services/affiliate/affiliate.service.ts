import type {
  AffiliateDashboardSummary,
  AffiliatePayout,
  AffiliateProfile,
  PendingPayoutsList,
  RecordAffiliateConversionInput,
  RecordAffiliateConversionOutput,
} from "$lib/schemas/affiliate";
import { ORPCError } from "@orpc/server";

import {
  SlugConflictError,
  generateSlug,
  sanitize,
} from "../../infras/slug.ts";
import type { AffiliateGuard } from "./affiliate.guard";
import type { AffiliateRepository } from "./affiliate.repository";

export class AffiliateService {
  private readonly repo: AffiliateRepository;
  private readonly guard: AffiliateGuard;

  constructor(repo: AffiliateRepository, guard: AffiliateGuard) {
    this.repo = repo;
    this.guard = guard;
  }

  async claim(userId: string | null | undefined): Promise<AffiliateProfile> {
    const owner = this.guard.requireUser(userId);

    const existingProfile = await this.repo.findProfileByUserId(owner);
    if (existingProfile) {
      throw new ORPCError("AFFILIATE_PROFILE_ALREADY_EXISTS", {
        message: "You already have an affiliate profile",
      });
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
    input: RecordAffiliateConversionInput
  ): Promise<RecordAffiliateConversionOutput> {
    const affiliateUserId = await this.repo.findAffiliatedByUserId(
      input.purchaserUserId
    );

    if (!affiliateUserId) {
      return { commission: null, created: false };
    }

    if (affiliateUserId === input.purchaserUserId) {
      return { commission: null, created: false };
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
    affiliateUserId: string,
    adminUserId: string | null | undefined,
    method?: string,
    reference?: string,
    note?: string
  ): Promise<AffiliatePayout> {
    const admin = this.guard.requireAdmin(adminUserId);

    const summary = await this.repo.getDashboardSummary(affiliateUserId);

    if (summary.pendingBalance <= 0) {
      throw new ORPCError("AFFILIATE_NO_PENDING_BALANCE", {
        message: "No pending balance to payout",
      });
    }

    const payout = await this.repo.insertPayout({
      affiliateUserId,
      amount: summary.pendingBalance,
      method: method ?? null,
      note: note ?? null,
      processedByAdminId: admin,
      reference: reference ?? null,
    });

    if (!payout) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Failed to record payout",
      });
    }

    await this.repo.markCommissionsAsPaid(affiliateUserId, payout.id);

    return payout;
  }

  async getDashboardSummary(
    userId: string | null | undefined
  ): Promise<AffiliateDashboardSummary> {
    const owner = this.guard.requireUser(userId);
    return await this.repo.getDashboardSummary(owner);
  }

  async listPendingPayouts(
    adminUserId: string | null | undefined,
    page = 1,
    limit = 10
  ): Promise<PendingPayoutsList> {
    this.guard.requireAdmin(adminUserId);
    return await this.repo.listPendingPayouts(page, limit);
  }
}
