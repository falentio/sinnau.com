import type { user } from "../../infras/db/schema/auth-schema.ts";

export type AuthUser = typeof user.$inferSelect;

export interface UserRepository {
  // oxlint-disable-next-line typescript/no-redundant-type-constituents -- AuthUser resolves to any in oxlint but is properly typed for svelte-check
  findUserById(id: string): Promise<AuthUser | null>;
}
