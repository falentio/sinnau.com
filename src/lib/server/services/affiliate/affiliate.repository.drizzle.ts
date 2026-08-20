/* oxlint-disable typescript/no-unsafe-member-access, typescript/no-unsafe-assignment -- Drizzle $onUpdate propagates any */
import {
  AFFILIATE_APPLICATION_ID_PREFIX,
  AFFILIATE_COMMISSION_ID_PREFIX,
  AFFILIATE_ID_PREFIX,
  AFFILIATE_PAYOUT_ACCOUNT_ID_PREFIX,
  AFFILIATE_PAYOUT_ID_PREFIX,
} from "$lib/schemas/affiliate.constant";
import { ORPCError } from "@orpc/server";
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  ne,
  sql,
  sum,
} from "drizzle-orm";

import { db as defaultDb } from "../../infras/db/client.ts";
import type { DB } from "../../infras/db/client.ts";
import {
  affiliateApplication,
  affiliateCommission,
  affiliatePayout,
  affiliatePayoutAccount,
  affiliateProfile,
} from "../../infras/db/schema/affiliate.ts";
import { user } from "../../infras/db/schema/auth-schema.ts";
import { order, payment } from "../../infras/db/schema/plan.ts";
import { generateId } from "../../utils/nanoid.ts";
import type {
  AffiliateDashboardRawSummary,
  AffiliatePayout,
  AffiliatePayoutAccount,
  AffiliateRepository,
  BackfillResult,
  CreatePayoutForAffiliateInput,
  InsertAffiliateApplicationInput,
  InsertAffiliateConversionInput,
  InvalidCommission,
  MissingCommissionRow,
  UpsertPayoutAccountInput,
} from "./affiliate.repository.ts";

const isUniqueConstraintError = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const { code } = error as { code?: unknown };
  return code === "SQLITE_CONSTRAINT_UNIQUE";
};

export class AffiliateDrizzleRepository implements AffiliateRepository {
  private readonly dbInstance: DB;

  constructor(dbInstance: DB = defaultDb) {
    this.dbInstance = dbInstance;
  }

  static withDatabase(db: DB): AffiliateDrizzleRepository {
    return new AffiliateDrizzleRepository(db);
  }

  async insertApplication(input: InsertAffiliateApplicationInput) {
    try {
      const id = generateId(AFFILIATE_APPLICATION_ID_PREFIX);
      const [created] = await this.dbInstance
        .insert(affiliateApplication)
        .values({
          advantage: input.advantage,
          id,
          instagramHandle: input.instagramHandle,
          tiktokHandle: input.tiktokHandle,
          userId: input.userId,
          youtubeHandle: input.youtubeHandle,
        })
        .returning();
      if (!created) {
        throw new Error("Failed to insert affiliate application");
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

  async findApplicationById(id: string) {
    try {
      const [row] = await this.dbInstance
        .select()
        .from(affiliateApplication)
        .where(eq(affiliateApplication.id, id))
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

  async findPendingApplicationByUserId(userId: string) {
    try {
      const [row] = await this.dbInstance
        .select()
        .from(affiliateApplication)
        .where(
          and(
            eq(affiliateApplication.userId, userId),
            eq(affiliateApplication.status, "PENDING")
          )
        )
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

  async findLatestApplicationByUserId(userId: string) {
    try {
      const [row] = await this.dbInstance
        .select()
        .from(affiliateApplication)
        .where(eq(affiliateApplication.userId, userId))
        .orderBy(desc(affiliateApplication.createdAt))
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

  async updateApplicationStatus(
    id: string,
    status: "ACCEPTED" | "REJECTED",
    reviewedByAdminId: string
  ) {
    try {
      const [updated] = await this.dbInstance
        .update(affiliateApplication)
        .set({
          reviewedAt: new Date(),
          reviewedByAdminId,
          status,
        })
        .where(eq(affiliateApplication.id, id))
        .returning();
      return updated ?? null;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async listApplications(
    status: "PENDING" | "ACCEPTED" | "REJECTED" | undefined,
    page: number,
    limit: number
  ) {
    try {
      const offset = (page - 1) * limit;
      const whereClause =
        status === undefined
          ? undefined
          : eq(affiliateApplication.status, status);

      const [countRow] = await this.dbInstance
        .select({
          total: count(affiliateApplication.id),
        })
        .from(affiliateApplication)
        .where(whereClause);

      const total = countRow?.total ?? 0;
      const totalPages = Math.max(1, Math.ceil(total / limit));

      const rows = await this.dbInstance
        .select()
        .from(affiliateApplication)
        .where(whereClause)
        .orderBy(desc(affiliateApplication.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        data: rows,
        pagination: {
          limit,
          page,
          total,
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
      if (isUniqueConstraintError(error)) {
        return null;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
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
      if (isUniqueConstraintError(error)) {
        return null;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
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

  async getDashboardSummary(
    userId: string
  ): Promise<AffiliateDashboardRawSummary> {
    try {
      const profile = await this.findProfileByUserId(userId);

      const [earnings] = await this.dbInstance
        .select({
          conversionCount: count(affiliateCommission.id),
          totalEarned: sum(affiliateCommission.commissionAmount),
        })
        .from(affiliateCommission)
        .where(
          and(
            eq(affiliateCommission.affiliateUserId, userId),
            ne(affiliateCommission.status, "VOID")
          )
        );

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

      const [countRow] = await this.dbInstance
        .select({
          total: sql<number>`count(distinct ${affiliateCommission.affiliateUserId})`,
        })
        .from(affiliateCommission)
        .where(eq(affiliateCommission.status, "PENDING"));

      const totalAffiliates = countRow?.total ?? 0;
      const totalPages = Math.max(1, Math.ceil(totalAffiliates / limit));

      const rows = await this.dbInstance
        .select({
          accountHolderName: affiliatePayoutAccount.accountHolderName,
          accountNumber: affiliatePayoutAccount.accountNumber,
          affiliateUserId: affiliateCommission.affiliateUserId,
          bankName: affiliatePayoutAccount.bankName,
          conversionCount: count(affiliateCommission.id),
          payoutMethod: affiliatePayoutAccount.method,
          pendingBalance: sum(affiliateCommission.commissionAmount).mapWith(
            Number
          ),
          slug: affiliateProfile.slug,
          whatsappNumber: affiliatePayoutAccount.whatsappNumber,
        })
        .from(affiliateCommission)
        .where(eq(affiliateCommission.status, "PENDING"))
        .leftJoin(
          affiliateProfile,
          eq(affiliateCommission.affiliateUserId, affiliateProfile.userId)
        )
        .leftJoin(
          affiliatePayoutAccount,
          eq(affiliateCommission.affiliateUserId, affiliatePayoutAccount.userId)
        )
        .groupBy(affiliateCommission.affiliateUserId)
        .orderBy(asc(affiliateCommission.affiliateUserId))
        .limit(limit)
        .offset(offset);

      const data = rows.map((row) => ({
        affiliateUserId: row.affiliateUserId,
        conversionCount: row.conversionCount,
        payoutAccount:
          row.accountNumber === null
            ? null
            : {
                accountHolderName: row.accountHolderName ?? "",
                accountNumber: row.accountNumber,
                bankName: row.bankName,
                method: row.payoutMethod ?? "GOPAY",
                whatsappNumber: row.whatsappNumber ?? "",
              },
        pendingBalance: row.pendingBalance ?? 0,
        slug: row.slug ?? "unknown",
      }));

      return {
        data,
        pagination: {
          limit,
          page,
          total: totalAffiliates,
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

  async listPayouts(page: number, limit: number) {
    try {
      const offset = (page - 1) * limit;

      const [countRow] = await this.dbInstance
        .select({ total: count(affiliatePayout.id) })
        .from(affiliatePayout);
      const total = countRow?.total ?? 0;
      const totalPages = Math.max(1, Math.ceil(total / limit));

      const rows = await this.dbInstance
        .select({
          affiliateUserId: affiliatePayout.affiliateUserId,
          amount: affiliatePayout.amount,
          createdAt: affiliatePayout.createdAt,
          id: affiliatePayout.id,
          method: affiliatePayout.method,
          note: affiliatePayout.note,
          processedByAdminId: affiliatePayout.processedByAdminId,
          reference: affiliatePayout.reference,
          slug: affiliateProfile.slug,
        })
        .from(affiliatePayout)
        .leftJoin(
          affiliateProfile,
          eq(affiliatePayout.affiliateUserId, affiliateProfile.userId)
        )
        .orderBy(desc(affiliatePayout.createdAt))
        .limit(limit)
        .offset(offset);

      const data = rows.map((row) => ({
        affiliateUserId: row.affiliateUserId,
        amount: row.amount,
        createdAt: row.createdAt,
        id: row.id,
        method: row.method,
        note: row.note,
        processedByAdminId: row.processedByAdminId,
        reference: row.reference,
        slug: row.slug ?? "unknown",
      }));

      return {
        data,
        pagination: { limit, page, total, totalPages },
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

  async createPayoutForAffiliate(
    input: CreatePayoutForAffiliateInput
  ): Promise<AffiliatePayout | null> {
    try {
      const payout = this.dbInstance.transaction((tx) => {
        const [agg] = tx
          .select({
            total: sum(affiliateCommission.commissionAmount).mapWith(Number),
          })
          .from(affiliateCommission)
          .where(
            and(
              eq(affiliateCommission.affiliateUserId, input.affiliateUserId),
              eq(affiliateCommission.status, "PENDING")
            )
          )
          .all();
        const amount = agg?.total ?? 0;
        if (amount <= 0) {
          return null;
        }

        const id = generateId(AFFILIATE_PAYOUT_ID_PREFIX);
        tx.insert(affiliatePayout)
          .values({
            affiliateUserId: input.affiliateUserId,
            amount,
            id,
            method: input.method,
            note: input.note,
            processedByAdminId: input.processedByAdminId,
            reference: input.reference,
          })
          .run();

        tx.update(affiliateCommission)
          .set({ payoutId: id, status: "PAID" })
          .where(
            and(
              eq(affiliateCommission.affiliateUserId, input.affiliateUserId),
              eq(affiliateCommission.status, "PENDING")
            )
          )
          .run();

        const [created] = tx
          .select()
          .from(affiliatePayout)
          .where(eq(affiliatePayout.id, id))
          .all();
        return created ?? null;
      });
      return payout ?? null;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async findMissingCommissions(
    affiliateUserId?: string
  ): Promise<MissingCommissionRow[]> {
    try {
      const rows = this.dbInstance
        .select({
          affiliateUserId: user.affiliatedBy,
          purchaseAmount: order.grossAmount,
          purchaserUserId: order.userId,
          transactionId: payment.gatewayTransactionId,
        })
        .from(order)
        .innerJoin(payment, eq(payment.orderId, order.id))
        .innerJoin(user, eq(user.id, order.userId))
        .leftJoin(
          affiliateCommission,
          eq(affiliateCommission.transactionId, payment.gatewayTransactionId)
        )
        .where(
          and(
            eq(order.status, "PAID"),
            isNotNull(payment.gatewayTransactionId),
            isNotNull(user.affiliatedBy),
            ne(user.affiliatedBy, order.userId),
            isNull(affiliateCommission.id),
            affiliateUserId === undefined
              ? undefined
              : eq(user.affiliatedBy, affiliateUserId)
          )
        )
        .all();

      return rows.map((row) => ({
        affiliateUserId: row.affiliateUserId ?? "",
        purchaseAmount: row.purchaseAmount,
        purchaserUserId: row.purchaserUserId,
        transactionId: row.transactionId ?? "",
      }));
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async findInvalidCommissions(
    affiliateUserId?: string
  ): Promise<InvalidCommission[]> {
    try {
      const rows = this.dbInstance
        .select({
          affiliateUserId: affiliateCommission.affiliateUserId,
          commissionAmount: affiliateCommission.commissionAmount,
          commissionId: affiliateCommission.id,
          orderStatus: order.status,
          purchaserUserId: affiliateCommission.purchaserUserId,
          transactionId: affiliateCommission.transactionId,
        })
        .from(affiliateCommission)
        .innerJoin(
          payment,
          eq(payment.gatewayTransactionId, affiliateCommission.transactionId)
        )
        .innerJoin(order, eq(order.id, payment.orderId))
        .where(
          and(
            eq(affiliateCommission.status, "PENDING"),
            ne(order.status, "PAID"),
            affiliateUserId === undefined
              ? undefined
              : eq(affiliateCommission.affiliateUserId, affiliateUserId)
          )
        )
        .all();

      return rows.map((row) => ({
        affiliateUserId: row.affiliateUserId,
        commissionAmount: row.commissionAmount,
        commissionId: row.commissionId,
        orderStatus: row.orderStatus,
        purchaserUserId: row.purchaserUserId,
        transactionId: row.transactionId,
      }));
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async backfillCommissions(
    inserts: InsertAffiliateConversionInput[],
    voidCommissionIds: string[]
  ): Promise<BackfillResult> {
    try {
      return this.dbInstance.transaction((tx) => {
        let created = 0;
        for (const entry of inserts) {
          const id = generateId(AFFILIATE_COMMISSION_ID_PREFIX);
          const inserted = tx
            .insert(affiliateCommission)
            .values({
              affiliateUserId: entry.affiliateUserId,
              commissionAmount: entry.commissionAmount,
              id,
              purchaseAmount: entry.purchaseAmount,
              purchaserUserId: entry.purchaserUserId,
              status: "PENDING",
              transactionId: entry.transactionId,
            })
            .onConflictDoNothing({ target: affiliateCommission.transactionId })
            .run();
          created += inserted.changes;
        }

        let voided = 0;
        if (voidCommissionIds.length > 0) {
          const result = tx
            .update(affiliateCommission)
            .set({ status: "VOID" })
            .where(
              and(
                inArray(affiliateCommission.id, voidCommissionIds),
                eq(affiliateCommission.status, "PENDING")
              )
            )
            .run();
          voided = result.changes;
        }

        return { created, voided };
      });
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
      // oxlint-disable-next-line typescript/no-unsafe-return -- row?.affiliatedBy is any from Drizzle
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

  async updateProfileBalance(
    profileId: string,
    points: number,
    expectedVersion: number
  ) {
    try {
      const [updated] = await this.dbInstance
        .update(affiliateProfile)
        .set({
          points,
          updatedAt: new Date(),
          version: sql`${affiliateProfile.version} + 1`,
        })
        .where(
          and(
            eq(affiliateProfile.id, profileId),
            eq(affiliateProfile.version, expectedVersion)
          )
        )
        .returning();
      return updated ?? null;
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
      // oxlint-disable-next-line typescript/no-unsafe-member-access -- Drizzle user table has any in type chain
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

  async updateUserAffiliatedBy(userId: string, referrerUserId: string | null) {
    try {
      const [updated] = await this.dbInstance
        .update(user)
        .set({ affiliatedBy: referrerUserId })
        .where(eq(user.id, userId))
        .returning({ affiliatedBy: user.affiliatedBy, id: user.id });
      if (!updated) {
        return null;
      }
      return { affiliatedBy: updated.affiliatedBy ?? null, id: updated.id };
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async findPayoutAccountByUserId(
    userId: string
  ): Promise<AffiliatePayoutAccount | null> {
    try {
      const [row] = await this.dbInstance
        .select()
        .from(affiliatePayoutAccount)
        .where(eq(affiliatePayoutAccount.userId, userId))
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

  async upsertPayoutAccount(
    input: UpsertPayoutAccountInput
  ): Promise<AffiliatePayoutAccount> {
    try {
      const id = generateId(AFFILIATE_PAYOUT_ACCOUNT_ID_PREFIX);
      const [row] = await this.dbInstance
        .insert(affiliatePayoutAccount)
        .values({
          accountHolderName: input.accountHolderName,
          accountNumber: input.accountNumber,
          bankName: input.bankName,
          id,
          method: input.method,
          userId: input.userId,
          whatsappNumber: input.whatsappNumber,
        })
        .onConflictDoUpdate({
          set: {
            accountHolderName: input.accountHolderName,
            accountNumber: input.accountNumber,
            bankName: input.bankName,
            method: input.method,
            updatedAt: new Date(),
            whatsappNumber: input.whatsappNumber,
          },
          target: affiliatePayoutAccount.userId,
        })
        .returning();
      if (!row) {
        throw new Error("Failed to upsert payout account");
      }
      return row;
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
/* oxlint-enable typescript/no-unsafe-member-access, typescript/no-unsafe-assignment */
