import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";

import type { DB } from "../../infras/db/client.ts";
import { db as defaultDb } from "../../infras/db/client.ts";
import { user } from "../../infras/db/schema/auth-schema.ts";
import type { AuthUser, UserRepository } from "./user.repository.ts";

export class UserDrizzleRepository implements UserRepository {
  private readonly dbInstance: DB;

  constructor(dbInstance: DB = defaultDb) {
    this.dbInstance = dbInstance;
  }

  static withDatabase(db: DB): UserDrizzleRepository {
    return new UserDrizzleRepository(db);
  }

  async findUserById(id: string): Promise<AuthUser | null> {
    try {
      const [row] = await this.dbInstance
        .select()
        .from(user)
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
}
