import type { user } from "../../infras/db/schema/auth-schema.ts";

export type AuthUser = typeof user.$inferSelect;

export interface AdminUserDetail extends AuthUser {
  sessionCount: number;
}

export interface UserListPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UserListResult {
  data: AuthUser[];
  pagination: UserListPagination;
}

export interface ListUsersFilters {
  banStatus?: "all" | "banned" | "active";
  email?: string;
  page: number;
  role?: "admin" | "user";
}

export interface UserRepository {
  // oxlint-disable-next-line typescript/no-redundant-type-constituents -- AuthUser resolves to any in oxlint but is properly typed for svelte-check
  findUserById(id: string): Promise<AuthUser | null>;

  listUsers(filters: ListUsersFilters): Promise<UserListResult>;

  findUserDetail(id: string): Promise<AdminUserDetail | null>;

  updateUserRole(id: string, role: string): Promise<AuthUser | null>;

  banUser(id: string, reason: string | null): Promise<AuthUser | null>;

  unbanUser(id: string): Promise<AuthUser | null>;
}
