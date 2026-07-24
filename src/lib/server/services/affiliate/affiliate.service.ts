import type {
  AffiliateApplication,
  AffiliateDashboardSummary,
  AffiliatePayout,
  AffiliateProfile,
  ApplyAffiliateInput,
  BackfillAffiliateCommissionsInput,
  BackfillAffiliateCommissionsOutput,
  ListAffiliateApplicationsInput,
  ListAffiliateApplicationsOutput,
  ListPendingPayoutsInput,
  PendingPayoutsList,
  ReconcileAffiliateCommissionsInput,
  ReconcileAffiliateCommissionsOutput,
  RecordAffiliateConversionInput,
  RecordAffiliateConversionOutput,
  RecordAffiliatePayoutInput,
  ReviewAffiliateApplicationInput,
  SetAffiliateReferrerInput,
  SetAffiliateReferrerOutput,
} from "$lib/schemas/affiliate";
import { AFFILIATE_COMMISSION_RATE } from "$lib/schemas/affiliate.constant";
import { getLogger } from "@logtape/logtape";
import { ORPCError } from "@orpc/server";
import type QuickLRU from "quick-lru";

import { sanitize } from "../../infras/slug.ts";
import { nanoid } from "../../utils/nanoid.ts";
import type { AffiliateGuard } from "./affiliate.guard";
import type { AffiliateRepository } from "./affiliate.repository";

const logger = getLogger(["sinnau.com", "affiliate", "service"]);

export interface HandlePaymentSuccessInput {
  purchaserUserId: string;
  purchaseAmount: number;
  transactionId: string;
}

const AFFILIATE_SLUG_MAX_RETRIES = 5;

export class AffiliateService {
  private readonly repo: AffiliateRepository;
  private readonly guard: AffiliateGuard;
  private readonly slugCache: QuickLRU<string, { userId: string }>;

  constructor(
    repo: AffiliateRepository,
    guard: AffiliateGuard,
    slugCache: QuickLRU<string, { userId: string }>
  ) {
    this.repo = repo;
    this.guard = guard;
    this.slugCache = slugCache;
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

  async apply(
    input: ApplyAffiliateInput,
    userId: string | null | undefined
  ): Promise<AffiliateApplication> {
    const owner = this.guard.requireUser(userId);

    const existingProfile = await this.repo.findProfileByUserId(owner);
    if (existingProfile) {
      throw new ORPCError("AFFILIATE_ALREADY_APPROVED", {
        message: "You already have an affiliate profile",
      });
    }

    const pendingApplication =
      await this.repo.findPendingApplicationByUserId(owner);
    if (pendingApplication) {
      throw new ORPCError("AFFILIATE_APPLICATION_PENDING", {
        message: "You already have a pending application",
      });
    }

    return await this.repo.insertApplication({
      advantage: input.advantage,
      instagramHandle: input.instagramHandle ?? null,
      tiktokHandle: input.tiktokHandle ?? null,
      userId: owner,
      youtubeHandle: input.youtubeHandle ?? null,
    });
  }

  async acceptApplication(
    input: ReviewAffiliateApplicationInput,
    adminUserId: string | null | undefined
  ): Promise<AffiliateProfile> {
    const admin = await this.guard.requireAdmin(adminUserId);

    const application = await this.assertPendingApplication(
      input.applicationId
    );

    const user = await this.repo.findUserById(application.userId);
    if (!user) {
      throw new ORPCError("NOT_FOUND", { message: "User not found" });
    }

    let slug: string | null = null;
    for (let attempt = 0; attempt < AFFILIATE_SLUG_MAX_RETRIES; attempt += 1) {
      const candidate = nanoid(8).toLowerCase();
      // oxlint-disable-next-line no-await-in-loop -- slug uniqueness retries are inherently sequential
      const existing = await this.repo.findProfileBySlug(candidate);
      if (!existing) {
        slug = candidate;
        break;
      }
    }

    if (slug === null) {
      throw new ORPCError("AFFILIATE_SLUG_CONFLICT", {
        message: "Failed to generate a unique slug after maximum retries",
      });
    }

    const profile = await this.repo.insertProfile(
      application.userId,
      slug,
      user.name
    );
    if (!profile) {
      throw new ORPCError("AFFILIATE_SLUG_CONFLICT", {
        message: "Failed to generate a unique slug after maximum retries",
      });
    }

    await this.repo.updateApplicationStatus(
      input.applicationId,
      "ACCEPTED",
      admin
    );

    return profile;
  }

  async rejectApplication(
    input: ReviewAffiliateApplicationInput,
    adminUserId: string | null | undefined
  ): Promise<AffiliateApplication> {
    const admin = await this.guard.requireAdmin(adminUserId);

    await this.assertPendingApplication(input.applicationId);

    const updated = await this.repo.updateApplicationStatus(
      input.applicationId,
      "REJECTED",
      admin
    );

    if (!updated) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }

    return updated;
  }

  async getMyApplication(
    userId: string | null | undefined
  ): Promise<AffiliateApplication> {
    const owner = this.guard.requireUser(userId);
    const application = await this.repo.findLatestApplicationByUserId(owner);
    if (!application) {
      throw new ORPCError("NOT_FOUND", {
        message: "Affiliate application not found",
      });
    }
    return application;
  }

  async listApplications(
    input: ListAffiliateApplicationsInput,
    adminUserId: string | null | undefined
  ): Promise<ListAffiliateApplicationsOutput> {
    await this.guard.requireAdmin(adminUserId);
    return await this.repo.listApplications(
      input.status,
      input.page ?? 1,
      input.limit ?? 10
    );
  }

  async resolveSlug(slug: string): Promise<{ userId: string }> {
    const sanitized = sanitize(slug);
    const cached = this.slugCache.get(sanitized);
    if (cached) {
      return cached;
    }
    const profile = await this.repo.findProfileBySlug(sanitized);
    if (!profile) {
      throw new ORPCError("NOT_FOUND", {
        message: "Affiliate link not found",
      });
    }
    const result = { userId: profile.userId };
    this.slugCache.set(sanitized, result);
    return result;
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

    if (commission) {
      logger.info("Commission recorded", {
        adminUserId: adminUserId ?? "unknown",
        affiliateUserId,
        commissionAmount: input.commissionAmount,
        commissionId: commission.id,
        purchaseAmount: input.purchaseAmount,
        purchaserUserId: input.purchaserUserId,
        transactionId: input.transactionId,
      });
    }

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

    const { invalid, missing } = await this.reconcile(input.affiliateUserId);
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

    logger.info("Payout created", {
      adminUserId: admin,
      affiliateUserId: input.affiliateUserId,
      amount: payout.amount,
      method: input.method ?? null,
      note: input.note ?? null,
      payoutId: payout.id,
      reference: input.reference ?? null,
    });

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

    logger.info("Referrer attribution updated", {
      adminUserId: adminUserId ?? "unknown",
      referredUserId: input.referredUserId,
      referrerUserId,
    });

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

    const commission = await this.repo.insertConversion({
      affiliateUserId,
      commissionAmount: Math.round(
        input.purchaseAmount * AFFILIATE_COMMISSION_RATE
      ),
      purchaseAmount: input.purchaseAmount,
      purchaserUserId: input.purchaserUserId,
      transactionId: input.transactionId,
    });

    if (commission) {
      logger.info("Commission recorded from payment event", {
        affiliateUserId,
        commissionAmount: commission.commissionAmount,
        commissionId: commission.id,
        purchaseAmount: input.purchaseAmount,
        purchaserUserId: input.purchaserUserId,
        transactionId: input.transactionId,
      });
    }
  }

  private async assertPendingApplication(
    applicationId: string
  ): Promise<AffiliateApplication> {
    const application = await this.repo.findApplicationById(applicationId);
    if (!application) {
      throw new ORPCError("NOT_FOUND", {
        message: "Application not found",
      });
    }
    if (application.status !== "PENDING") {
      throw new ORPCError("AFFILIATE_APPLICATION_NOT_PENDING", {
        message: "Application is not pending review",
      });
    }
    return application;
  }

  private async reconcile(
    affiliateUserId?: string
  ): Promise<ReconcileAffiliateCommissionsOutput> {
    const [missingRows, invalid] = await Promise.all([
      this.repo.findMissingCommissions(affiliateUserId),
      this.repo.findInvalidCommissions(affiliateUserId),
    ]);
    const missing = missingRows.map((row) => ({
      ...row,
      expectedCommissionAmount: Math.round(
        row.purchaseAmount * AFFILIATE_COMMISSION_RATE
      ),
    }));
    return { invalid, missing };
  }

  async reconcileCommissions(
    input: ReconcileAffiliateCommissionsInput,
    adminUserId: string | null | undefined
  ): Promise<ReconcileAffiliateCommissionsOutput> {
    await this.guard.requireAdmin(adminUserId);
    return await this.reconcile(input.affiliateUserId);
  }

  async backfillCommissions(
    input: BackfillAffiliateCommissionsInput,
    adminUserId: string | null | undefined
  ): Promise<BackfillAffiliateCommissionsOutput> {
    await this.guard.requireAdmin(adminUserId);
    const { invalid, missing } = await this.reconcile(input.affiliateUserId);
    const inserts = missing.map((entry) => ({
      affiliateUserId: entry.affiliateUserId,
      commissionAmount: entry.expectedCommissionAmount,
      purchaseAmount: entry.purchaseAmount,
      purchaserUserId: entry.purchaserUserId,
      transactionId: entry.transactionId,
    }));
    const voidCommissionIds = invalid.map((entry) => entry.commissionId);
    const result = await this.repo.backfillCommissions(
      inserts,
      voidCommissionIds
    );

    logger.info("Commissions backfilled", {
      adminUserId: adminUserId ?? "unknown",
      affiliateUserId: input.affiliateUserId ?? "all",
      created: result.created,
      voided: result.voided,
    });

    return result;
  }
}
