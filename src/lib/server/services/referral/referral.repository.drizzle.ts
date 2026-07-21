import { ORPCError } from "@orpc/server";
import { and, eq, sql } from "drizzle-orm";

import { db as defaultDb } from "../../infras/db/client.ts";
import type { DB } from "../../infras/db/client.ts";
import {
  referralProfile,
  referralRelationship,
  referralSubscriptionEvent,
} from "../../infras/db/schema/referral.ts";
import type {
  InsertReferralProfile,
  InsertReferralRelationship,
  InsertReferralSubscriptionEvent,
  ReferralProfile,
  ReferralRelationship,
  ReferralSubscriptionEvent,
} from "../../infras/db/schema/referral.ts";
import type { ReferralRepository } from "./referral.repository.ts";

export class ReferralDrizzleRepository implements ReferralRepository {
  private readonly dbInstance: DB;

  constructor(dbInstance: DB = defaultDb) {
    this.dbInstance = dbInstance;
  }

  static withDatabase(db: DB): ReferralDrizzleRepository {
    return new ReferralDrizzleRepository(db);
  }

  async insertProfile(
    row: Omit<InsertReferralProfile, "createdAt" | "updatedAt">
  ): Promise<ReferralProfile> {
    try {
      const [created] = await this.dbInstance
        .insert(referralProfile)
        .values(row)
        .returning();
      if (!created) {
        throw new Error("Failed to insert referral profile");
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

  async findProfileByUserId(userId: string): Promise<ReferralProfile | null> {
    try {
      const [row] = await this.dbInstance
        .select()
        .from(referralProfile)
        .where(eq(referralProfile.userId, userId))
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

  async findProfileBySlug(slug: string): Promise<ReferralProfile | null> {
    try {
      const [row] = await this.dbInstance
        .select()
        .from(referralProfile)
        .where(sql`lower(${referralProfile.slug}) = lower(${slug})`)
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

  async updateProfilePoints(
    id: string,
    newPoints: number,
    expectedVersion: number
  ): Promise<ReferralProfile | null> {
    try {
      const [updated] = await this.dbInstance
        .update(referralProfile)
        .set({
          points: newPoints,
          version: sql`${referralProfile.version} + 1`,
        })
        .where(
          and(
            eq(referralProfile.id, id),
            eq(referralProfile.version, expectedVersion)
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

  async isSlugTaken(candidate: string): Promise<boolean> {
    try {
      const [row] = await this.dbInstance
        .select({ id: referralProfile.id })
        .from(referralProfile)
        .where(sql`lower(${referralProfile.slug}) = lower(${candidate})`)
        .limit(1);
      return row !== undefined;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async insertRelationship(
    row: Omit<InsertReferralRelationship, "createdAt">
  ): Promise<ReferralRelationship> {
    try {
      const [created] = await this.dbInstance
        .insert(referralRelationship)
        .values(row)
        .returning();
      if (!created) {
        throw new Error("Failed to insert referral relationship");
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

  async findRelationshipByReferredUserId(
    referredUserId: string
  ): Promise<ReferralRelationship | null> {
    try {
      const [row] = await this.dbInstance
        .select()
        .from(referralRelationship)
        .where(eq(referralRelationship.referredUserId, referredUserId))
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

  async insertSubscriptionEvent(
    row: Omit<InsertReferralSubscriptionEvent, "createdAt">
  ): Promise<ReferralSubscriptionEvent> {
    try {
      const [created] = await this.dbInstance
        .insert(referralSubscriptionEvent)
        .values(row)
        .returning();
      if (!created) {
        throw new Error("Failed to insert referral subscription event");
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

  async findSubscriptionEventByIdempotencyKey(
    idempotencyKey: string
  ): Promise<ReferralSubscriptionEvent | null> {
    try {
      const [row] = await this.dbInstance
        .select()
        .from(referralSubscriptionEvent)
        .where(eq(referralSubscriptionEvent.idempotencyKey, idempotencyKey))
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
