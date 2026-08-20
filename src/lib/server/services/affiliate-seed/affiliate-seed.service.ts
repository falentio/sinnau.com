import type {
  SeedAffiliatePendingPayoutsInput,
  SeedAffiliatePendingPayoutsOutput,
} from "$lib/schemas/affiliate";
import {
  AFFILIATE_COMMISSION_RATE,
  AFFILIATE_SEED_PENDING_DEFAULT_COUNT,
} from "$lib/schemas/affiliate.constant";
import { getLogger } from "@logtape/logtape";
import { ORPCError } from "@orpc/server";

import { nanoid } from "../../utils/nanoid.ts";
import type { AffiliateSeedGuard } from "./affiliate-seed.guard";
import type { AffiliateSeedRepository } from "./affiliate-seed.repository";

const logger = getLogger(["sinnau.com", "affiliate-seed", "service"]);

export class AffiliateSeedService {
  private readonly repo: AffiliateSeedRepository;
  private readonly guard: AffiliateSeedGuard;
  private readonly isDev: boolean;

  constructor(
    repo: AffiliateSeedRepository,
    guard: AffiliateSeedGuard,
    isDev: boolean
  ) {
    this.repo = repo;
    this.guard = guard;
    this.isDev = isDev;
  }

  async seedPendingPayouts(
    input: SeedAffiliatePendingPayoutsInput,
    adminUserId: string | null | undefined
  ): Promise<SeedAffiliatePendingPayoutsOutput> {
    if (!this.isDev) {
      throw new ORPCError("FORBIDDEN", { message: "Dev only" });
    }

    const admin = await this.guard.requireAdmin(adminUserId);

    const profile = await this.repo.findProfileByUserId(input.affiliateUserId);
    if (!profile) {
      throw new ORPCError("AFFILIATE_NO_PROFILE", {
        message: "Affiliate profile not found",
        status: 400,
      });
    }

    const count = input.count ?? AFFILIATE_SEED_PENDING_DEFAULT_COUNT;
    const commissionIds: string[] = [];

    for (let i = 0; i < count; i += 1) {
      const purchaserUserId = await this.repo.createDevUser(
        `Seed Purchaser ${nanoid(4)}`
      );
      const purchaseAmount = 100_000 + Math.floor(Math.random() * 200_000);
      const commissionAmount = Math.round(
        purchaseAmount * AFFILIATE_COMMISSION_RATE
      );
      const transactionId = `dev-seed-${nanoid(8)}`;

      // oxlint-disable-next-line no-await-in-loop -- sequential to keep transactionId unique and avoid race
      const commission = await this.repo.insertConversion({
        affiliateUserId: input.affiliateUserId,
        commissionAmount,
        purchaseAmount,
        purchaserUserId,
        transactionId,
      });
      if (commission) {
        commissionIds.push(commission.id);
      }
    }

    logger.info("Seeded pending payouts", {
      adminUserId: admin,
      affiliateUserId: input.affiliateUserId,
      commissionIds,
      count: commissionIds.length,
      requested: count,
    });

    return {
      affiliateUserId: input.affiliateUserId,
      commissionIds,
      created: commissionIds.length,
    };
  }
}
