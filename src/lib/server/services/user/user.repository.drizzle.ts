import { USER_PAGE_LIMIT } from "$lib/schemas/user.constant";
import { ORPCError } from "@orpc/server";
import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  like,
  or,
  isNull,
} from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import type { DB } from "../../infras/db/client.ts";
import { db as defaultDb } from "../../infras/db/client.ts";
import { session, user } from "../../infras/db/schema/auth-schema.ts";
import type {
  AdminUserDetail,
  AuthUser,
  ListUsersFilters,
  UserListResult,
  UserRepository,
} from "./user.repository.ts";

const SORT_COLUMNS = {
  banned: user.banned,
  createdAt: user.createdAt,
  email: user.email,
  name: user.name,
  role: user.role,
} as const;

export class UserDrizzleRepository implements UserRepository {
  private readonly dbInstance: DB;

  constructor(dbInstance: DB = defaultDb) {
    this.dbInstance = dbInstance;
  }

  static withDatabase(db: DB): UserDrizzleRepository {
    return new UserDrizzleRepository(db);
  }

  // oxlint-disable-next-line typescript/no-redundant-type-constituents -- AuthUser resolves to any in oxlint
  async findUserById(id: string): Promise<AuthUser | null> {
    try {
      const [row] = await this.dbInstance
        .select()
        .from(user)
        // oxlint-disable-next-line typescript/no-unsafe-member-access -- Drizzle column references have complex types not resolvable by oxlint
        .where(eq(user.id, id))
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

  async listUsers(filters: ListUsersFilters): Promise<UserListResult> {
    try {
      const { page, email, role, banStatus, sortKey, sortDir } = filters;
      const limit = USER_PAGE_LIMIT;
      const offset = (page - 1) * limit;

      const conditions: (SQL | undefined)[] = [];

      if (email !== undefined && email !== "") {
        conditions.push(like(user.email, `%${email}%`));
      }
      if (role !== undefined) {
        // oxlint-disable-next-line typescript/no-unsafe-member-access -- Drizzle column references have complex types not resolvable by oxlint
        conditions.push(eq(user.role, role));
      }
      if (banStatus === "banned") {
        // oxlint-disable-next-line typescript/no-unsafe-member-access -- Drizzle column references have complex types not resolvable by oxlint
        conditions.push(eq(user.banned, true));
      }
      if (banStatus === "active") {
        // oxlint-disable-next-line typescript/no-unsafe-member-access -- Drizzle column references have complex types not resolvable by oxlint
        conditions.push(or(eq(user.banned, false), isNull(user.banned)));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      // oxlint-disable-next-line typescript/no-unsafe-member-access -- Drizzle column references have complex types not resolvable by oxlint
      const orderColumn =
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- sortKey is validated upstream; fallback handles invalid keys
        SORT_COLUMNS[sortKey as keyof typeof SORT_COLUMNS] ?? user.createdAt;
      // oxlint-disable-next-line typescript/no-unsafe-member-access -- Drizzle column references have complex types not resolvable by oxlint
      const orderByClause =
        sortDir === "asc" ? asc(orderColumn) : desc(orderColumn);

      const data = await this.dbInstance
        .select()
        .from(user)
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(orderByClause);

      const [countResult] = await this.dbInstance
        .select({ total: count() })
        .from(user)
        .where(whereClause);

      const total = countResult?.total ?? 0;
      const totalPages = Math.ceil(total / limit);

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

  async findUserDetail(id: string): Promise<AdminUserDetail | null> {
    try {
      const userColumns = getTableColumns(user);
      const [row] = await this.dbInstance
        .select({
          // oxlint-disable-next-line typescript/no-unsafe-assignment -- Drizzle column references have complex types not resolvable by oxlint
          ...userColumns,
          sessionCount: count(session.id),
        })
        .from(user)
        .leftJoin(session, eq(session.userId, user.id))
        // oxlint-disable-next-line typescript/no-unsafe-member-access -- Drizzle column references have complex types not resolvable by oxlint
        .where(eq(user.id, id))
        .groupBy(user.id)
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

  async updateUserRole(id: string, role: string): Promise<AuthUser | null> {
    try {
      const [row] = await this.dbInstance
        .update(user)
        .set({
          role,
          // oxlint-disable-next-line typescript/no-unsafe-assignment -- Date type not resolvable by oxlint
          updatedAt: new Date(),
        })
        // oxlint-disable-next-line typescript/no-unsafe-member-access -- Drizzle column references have complex types not resolvable by oxlint
        .where(eq(user.id, id))
        .returning();
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

  async banUser(id: string, reason: string | null): Promise<AuthUser | null> {
    try {
      const [row] = await this.dbInstance
        .update(user)
        .set({
          banReason: reason,
          banned: true,
          // oxlint-disable-next-line typescript/no-unsafe-assignment -- Date type not resolvable by oxlint
          updatedAt: new Date(),
        })
        // oxlint-disable-next-line typescript/no-unsafe-member-access -- Drizzle column references have complex types not resolvable by oxlint
        .where(eq(user.id, id))
        .returning();
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

  async unbanUser(id: string): Promise<AuthUser | null> {
    try {
      const [row] = await this.dbInstance
        .update(user)
        .set({
          banExpires: null,
          banReason: null,
          banned: false,
          // oxlint-disable-next-line typescript/no-unsafe-assignment -- Date type not resolvable by oxlint
          updatedAt: new Date(),
        })
        // oxlint-disable-next-line typescript/no-unsafe-member-access -- Drizzle column references have complex types not resolvable by oxlint
        .where(eq(user.id, id))
        .returning();
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
