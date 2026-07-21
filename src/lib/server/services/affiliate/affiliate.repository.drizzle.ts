import {
  AFFILIATE_COMMISSION_ID_PREFIX,
  AFFILIATE_ID_PREFIX,
  AFFILIATE_PAYOUT_ID_PREFIX,
} from "$lib/schemas/affiliate.constant";
import { ORPCError } from "@orpc/server";
import { and, count, eq, sum } from "drizzle-orm";

import { db as defaultDb } from "../../infras/db/client.ts";
import type { DB } from "../../infras/db/client.ts";
import {
  affiliateCommission,
  affiliatePayout,
  affiliateProfile,
} from "../../infras/db/schema/affiliate.ts";
import { user } from "../../infras/db/schema/auth-schema.ts";
import { generateId } from "../../utils/nanoid.ts";
import type {
  AffiliateRepository,
  InsertAffiliateConversionInput,
  InsertAffiliatePayoutInput,
} from "./affiliate.repository.ts";

export class AffiliateDrizzleRepository implements AffiliateRepository {
  private readonly dbInstance: DB;

  constructor(dbInstance: DB = defaultDb) {
    this.dbInstance = dbInstance;
  }

  static withDatabase(db: DB): AffiliateDrizzleRepository {
    return new AffiliateDrizzleRepository(db);
  }

  async insertProfile(userId: string, slug: string, nameSnapshot: string) {
    try {
      const id = generateId(AFFILIATE_ID_PREFIX);
      const [created] = await this.dbInstance
        .insert(affiliateProfile)
        .values({ id, nameSnapshot, slug, userId })
        .returning();
      if (!created) {
        return null;
      }
      return created;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      return null;
    }
  }

  async findProfileByUserId(userId: string) {
    try {
      const [row] = await this.dbInstance
        .select()
        .from(affiliateProfile)
        .where(eq(affiliateProfile.userId, userId))
        .limit(1);
      return row ?? null;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async findProfileBySlug(slug: string) {
    try {
      const [row] = await this.dbInstance
        .select()
        .from(affiliateProfile)
        .where(eq(affiliateProfile.slug, slug))
        .limit(1);
      return row ?? null;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async insertConversion(input: InsertAffiliateConversionInput) {
    try {
      const id = generateId(AFFILIATE_COMMISSION_ID_PREFIX);
      const [created] = await this.dbInstance
        .insert(affiliateCommission)
        .values({
          affiliateUserId: input.affiliateUserId,
          commissionAmount: input.commissionAmount,
          id,
          purchaseAmount: input.purchaseAmount,
          purchaserUserId: input.purchaserUserId,
          status: "PENDING",
          transactionId: input.transactionId,
        })
        .returning();
      if (!created) {
        return null;
      }
      return created;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      return null;
    }
  }

  async findConversionByTransactionId(transactionId: string) {
    try {
      const [row] = await this.dbInstance
        .select()
        .from(affiliateCommission)
        .where(eq(affiliateCommission.transactionId, transactionId))
        .limit(1);
      return row ?? null;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async getDashboardSummary(userId: string) {
    try {
      const profile = await this.findProfileByUserId(userId);

      const [earnings] = await this.dbInstance
        .select({
          conversionCount: count(affiliateCommission.id),
          totalEarned: sum(affiliateCommission.commissionAmount),
        })
        .from(affiliateCommission)
        .where(eq(affiliateCommission.affiliateUserId, userId));

      const [paid] = await this.dbInstance
        .select({
          totalPaid: sum(affiliateCommission.commissionAmount).mapWith(Number),
        })
        .from(affiliateCommission)
        .where(
          and(
            eq(affiliateCommission.affiliateUserId, userId),
            eq(affiliateCommission.status, "PAID")
          )
        );

      const totalEarned =
        typeof earnings?.totalEarned === "number"
          ? earnings.totalEarned
          : Number(earnings?.totalEarned ?? 0);
      const totalPaid = paid?.totalPaid ?? 0;

      return {
        conversionCount: earnings?.conversionCount ?? 0,
        pendingBalance: totalEarned - totalPaid,
        profile,
        totalEarned,
        totalPaid,
      };
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async listPendingPayouts(page: number, limit: number) {
    try {
      const offset = (page - 1) * limit;

      const countRows = await this.dbInstance
        .select({
          affiliateUserId: affiliateCommission.affiliateUserId,
        })
        .from(affiliateCommission)
        .where(eq(affiliateCommission.status, "PENDING"))
        .groupBy(affiliateCommission.affiliateUserId);

      const totalAffiliates = countRows.length;
      const totalPages = Math.max(1, Math.ceil(totalAffiliates / limit));

      const rows = await this.dbInstance
        .select({
          affiliateUserId: affiliateCommission.affiliateUserId,
          conversionCount: count(affiliateCommission.id),
          pendingBalance: sum(affiliateCommission.commissionAmount).mapWith(
            Number
          ),
          slug: affiliateProfile.slug,
        })
        .from(affiliateCommission)
        .where(eq(affiliateCommission.status, "PENDING"))
        .leftJoin(
          affiliateProfile,
          eq(affiliateCommission.affiliateUserId, affiliateProfile.userId)
        )
        .groupBy(affiliateCommission.affiliateUserId)
        .limit(limit)
        .offset(offset);

      const data = rows.map((row) => ({
        affiliateUserId: row.affiliateUserId,
        conversionCount: row.conversionCount,
        pendingBalance: row.pendingBalance ?? 0,
        slug: row.slug ?? "unknown",
      }));

      return {
        data,
        pagination: {
          limit,
          page,
          total: data.length > 0 ? totalAffiliates : data.length,
          totalPages,
        },
      };
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async insertPayout(input: InsertAffiliatePayoutInput) {
    try {
      const id = generateId(AFFILIATE_PAYOUT_ID_PREFIX);
      const [created] = await this.dbInstance
        .insert(affiliatePayout)
        .values({
          affiliateUserId: input.affiliateUserId,
          amount: input.amount,
          id,
          method: input.method,
          note: input.note,
          processedByAdminId: input.processedByAdminId,
          reference: input.reference,
        })
        .returning();
      if (!created) {
        return null;
      }
      return created;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async markCommissionsAsPaid(affiliateUserId: string, payoutId: string) {
    try {
      const result = await this.dbInstance
        .update(affiliateCommission)
        .set({ payoutId, status: "PAID" })
        .where(
          and(
            eq(affiliateCommission.affiliateUserId, affiliateUserId),
            eq(affiliateCommission.status, "PENDING")
          )
        );

      return result.changes;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async findAffiliatedByUserId(userId: string) {
    try {
      const [row] = await this.dbInstance
        .select({ affiliatedBy: user.affiliatedBy })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);
      return row?.affiliatedBy ?? null;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async findUserById(userId: string) {
    try {
      const [row] = await this.dbInstance
        .select({ id: user.id, name: user.name })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);
      return row ?? null;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }
}
