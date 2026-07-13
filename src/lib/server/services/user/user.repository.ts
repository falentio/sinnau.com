import type { user } from "../../infras/db/schema/auth-schema.ts";

export type AuthUser = typeof user.$inferSelect;

export interface UserRepository {
  findUserById(id: string): Promise<AuthUser | null>;
}
