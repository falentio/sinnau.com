/* oxlint-disable typescript/no-unsafe-member-access, typescript/no-unsafe-assignment -- Drizzle $onUpdate propagates any */
import { AFFILIATE_COMMISSION_ID_PREFIX } from "$lib/schemas/affiliate.constant";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";

import { db as defaultDb } from "../../infras/db/client.ts";
import type { DB } from "../../infras/db/client.ts";
import {
  affiliateCommission,
  affiliateProfile,
} from "../../infras/db/schema/affiliate.ts";
import { user } from "../../infras/db/schema/auth-schema.ts";
import { generateId } from "../../utils/nanoid.ts";
import type {
  AffiliateSeedRepository,
  InsertSeedConversionInput,
} from "./affiliate-seed.repository.ts";

const isUniqueConstraintError = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const { code } = error as { code?: unknown };
  return code === "SQLITE_CONSTRAINT_UNIQUE";
};

export class AffiliateSeedDrizzleRepository implements AffiliateSeedRepository {
  private readonly dbInstance: DB;

  constructor(dbInstance: DB = defaultDb) {
    this.dbInstance = dbInstance;
  }

  static withDatabase(db: DB): AffiliateSeedDrizzleRepository {
    return new AffiliateSeedDrizzleRepository(db);
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

  async insertConversion(input: InsertSeedConversionInput) {
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

  async createDevUser(name: string): Promise<string> {
    try {
      const id = crypto.randomUUID();
      this.dbInstance
        .insert(user)
        .values({
          affiliatedBy: null,
          email: `${id}@seed.dev.local`,
          emailVerified: true,
          id,
          name,
        })
        .run();
      return id;
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
