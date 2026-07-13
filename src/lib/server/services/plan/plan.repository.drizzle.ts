import {
  ADMIN_GRANT_PAGE_LIMIT,
  PLAN_PAGE_LIMIT,
} from "$lib/schemas/plan.constant";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, gt, gte, lte, notInArray, sql } from "drizzle-orm";

import type { DB } from "../../infras/db/client.ts";
import { db as defaultDb } from "../../infras/db/client.ts";
import {
  adminGrant,
  order,
  payment,
  userPlan,
} from "../../infras/db/schema/plan.ts";
import type {
  AdminGrant,
  NewAdminGrant,
  NewOrder,
  NewPayment,
  NewUserPlan,
  Order,
  OrderStatus,
  Payment,
  PaymentGateway,
  UserPlan,
} from "../../infras/db/schema/plan.ts";
import type {
  AdminGrantListResult,
  ListAdminGrantsFilters,
  OrderListResult,
  PaymentUpdatePatch,
  PlanRepository,
} from "./plan.repository.ts";

export class PlanDrizzleRepository implements PlanRepository {
  private readonly dbInstance: DB;

  constructor(dbInstance: DB = defaultDb) {
    this.dbInstance = dbInstance;
  }

  static withDatabase(db: DB): PlanDrizzleRepository {
    return new PlanDrizzleRepository(db);
  }

  async upsertUserPlan(row: NewUserPlan): Promise<UserPlan> {
    try {
      const [upserted] = await this.dbInstance
        .insert(userPlan)
        .values(row)
        .onConflictDoUpdate({
          set: {
            expiresAt: row.expiresAt,
            planKey: row.planKey,
            startedAt: row.startedAt,
            updatedAt: new Date(),
          },
          target: userPlan.userId,
        })
        .returning();
      if (!upserted) {
        throw new Error("Failed to upsert user plan");
      }
      return upserted;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async findActiveUserPlan(
    userId: string,
    nowMs: number
  ): Promise<UserPlan | null> {
    try {
      const now = new Date(nowMs);
      const [row] = await this.dbInstance
        .select()
        .from(userPlan)
        .where(
          and(
            eq(userPlan.userId, userId),
            gte(userPlan.expiresAt, now),
            lte(userPlan.startedAt, now)
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

  async deleteUserPlan(userId: string): Promise<boolean> {
    try {
      const deleted = await this.dbInstance
        .delete(userPlan)
        .where(eq(userPlan.userId, userId))
        .returning({ id: userPlan.id });
      return deleted.length > 0;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async insertOrder(row: NewOrder): Promise<Order> {
    try {
      const [created] = await this.dbInstance
        .insert(order)
        .values(row)
        .returning();
      if (!created) {
        throw new Error("Failed to insert order");
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

  async findOrderById(id: string): Promise<Order | null> {
    try {
      const [row] = await this.dbInstance
        .select()
        .from(order)
        .where(eq(order.id, id))
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

  async findOrdersByUser(
    userId: string,
    page: number,
    excludeStatuses?: OrderStatus[]
  ): Promise<OrderListResult> {
    try {
      const limit = PLAN_PAGE_LIMIT;
      const offset = (page - 1) * limit;
      const filters = [eq(order.userId, userId)];
      if (excludeStatuses && excludeStatuses.length > 0) {
        filters.push(notInArray(order.status, excludeStatuses));
      }
      const whereClause = and(...filters);
      const rows = await this.dbInstance
        .select()
        .from(order)
        .where(whereClause)
        .orderBy(desc(order.createdAt))
        .limit(limit)
        .offset(offset);
      const [{ total } = { total: 0 }] = await this.dbInstance
        .select({ total: sql<number>`count(*)` })
        .from(order)
        .where(whereClause);
      const totalCount = total;
      return {
        data: rows,
        pagination: {
          limit,
          page,
          total: totalCount,
          totalPages: Math.max(1, Math.ceil(totalCount / limit)),
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

  async findPaidOrdersForUser(userId: string): Promise<Order[]> {
    try {
      return await this.dbInstance
        .select()
        .from(order)
        .where(and(eq(order.userId, userId), eq(order.status, "PAID")))
        .orderBy(sql`${order.appliedAt} asc`);
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async updateOrderStatus(
    id: string,
    status: OrderStatus
  ): Promise<Order | null> {
    try {
      const [updated] = await this.dbInstance
        .update(order)
        .set({ status, updatedAt: new Date() })
        .where(eq(order.id, id))
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

  async setOrderAppliedAt(
    id: string,
    appliedAtMs: number
  ): Promise<Order | null> {
    try {
      const [updated] = await this.dbInstance
        .update(order)
        .set({ appliedAt: new Date(appliedAtMs), updatedAt: new Date() })
        .where(eq(order.id, id))
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

  async insertPayment(row: NewPayment): Promise<Payment> {
    try {
      const [created] = await this.dbInstance
        .insert(payment)
        .values(row)
        .returning();
      if (!created) {
        throw new Error("Failed to insert payment");
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

  async findPaymentByOrderId(orderId: string): Promise<Payment | null> {
    try {
      const [row] = await this.dbInstance
        .select()
        .from(payment)
        .where(eq(payment.orderId, orderId))
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

  async findPaymentByTransactionId(
    gateway: PaymentGateway,
    transactionId: string
  ): Promise<Payment | null> {
    try {
      const [row] = await this.dbInstance
        .select()
        .from(payment)
        .where(
          and(
            eq(payment.gateway, gateway),
            eq(payment.gatewayTransactionId, transactionId)
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

  async updatePayment(
    id: string,
    patch: PaymentUpdatePatch
  ): Promise<Payment | null> {
    try {
      const [updated] = await this.dbInstance
        .update(payment)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(payment.id, id))
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

  async insertAdminGrant(row: NewAdminGrant): Promise<AdminGrant> {
    try {
      const [created] = await this.dbInstance
        .insert(adminGrant)
        .values(row)
        .returning();
      if (!created) {
        throw new Error("Failed to insert admin grant");
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

  async findActiveAdminGrantsForUser(
    userId: string,
    nowMs: number
  ): Promise<AdminGrant[]> {
    try {
      return await this.dbInstance
        .select()
        .from(adminGrant)
        .where(
          and(
            eq(adminGrant.userId, userId),
            gt(adminGrant.expiresAt, new Date(nowMs))
          )
        )
        .orderBy(sql`${adminGrant.startedAt} asc`);
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async listAdminGrants(
    filters: ListAdminGrantsFilters
  ): Promise<AdminGrantListResult> {
    try {
      const limit = ADMIN_GRANT_PAGE_LIMIT;
      const page = filters.page;
      const offset = (page - 1) * limit;
      const conditions: ReturnType<typeof eq>[] = [];
      if (filters.userId !== undefined) {
        conditions.push(eq(adminGrant.userId, filters.userId));
      }
      if (filters.grantedBy !== undefined) {
        conditions.push(eq(adminGrant.grantedBy, filters.grantedBy));
      }
      if (filters.planKey !== undefined) {
        conditions.push(eq(adminGrant.planKey, filters.planKey));
      }
      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await this.dbInstance
        .select()
        .from(adminGrant)
        .where(whereClause)
        .orderBy(desc(adminGrant.grantedAt))
        .limit(limit)
        .offset(offset);

      const [{ total } = { total: 0 }] = await this.dbInstance
        .select({ total: sql<number>`count(*)` })
        .from(adminGrant)
        .where(whereClause);
      const totalCount = total;

      return {
        data: rows,
        pagination: {
          limit,
          page,
          total: totalCount,
          totalPages: Math.max(1, Math.ceil(totalCount / limit)),
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
}
