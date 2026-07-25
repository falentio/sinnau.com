import type {
  BanUserInput,
  ChangeRoleInput,
  GetUserDetailInput,
  ListUsersInput,
  UnbanUserInput,
} from "$lib/schemas/user";
import { ORPCError } from "@orpc/server";

import type { UserGuard } from "./user.guard.ts";
import type {
  AdminUserDetail,
  AuthUser,
  UserListResult,
  UserRepository,
} from "./user.repository.ts";

export class UserService {
  private readonly repo: UserRepository;
  private readonly guard: UserGuard;

  constructor(repo: UserRepository, guard: UserGuard) {
    this.repo = repo;
    this.guard = guard;
  }

  async listUsers(
    input: ListUsersInput,
    adminId: string | null | undefined
  ): Promise<UserListResult> {
    this.guard.requireAdmin(adminId);
    return await this.repo.listUsers({
      banStatus: input.banStatus,
      email: input.email,
      page: input.page ?? 1,
      role: input.role,
    });
  }

  async getUserDetail(
    input: GetUserDetailInput,
    adminId: string | null | undefined
  ): Promise<AdminUserDetail> {
    this.guard.requireAdmin(adminId);
    const detail = await this.repo.findUserDetail(input.userId);
    if (detail === null) {
      throw new ORPCError("NOT_FOUND", { message: "User not found" });
    }
    return detail;
  }

  async changeRole(
    input: ChangeRoleInput,
    adminId: string | null | undefined
  ): Promise<AuthUser> {
    this.guard.requireAdmin(adminId);
    const updated = await this.repo.updateUserRole(input.userId, input.role);
    if (updated === null) {
      throw new ORPCError("NOT_FOUND", { message: "User not found" });
    }
    return updated;
  }

  async banUser(
    input: BanUserInput,
    adminId: string | null | undefined
  ): Promise<AuthUser> {
    this.guard.requireAdmin(adminId);
    const updated = await this.repo.banUser(input.userId, input.reason ?? null);
    if (updated === null) {
      throw new ORPCError("NOT_FOUND", { message: "User not found" });
    }
    return updated;
  }

  async unbanUser(
    input: UnbanUserInput,
    adminId: string | null | undefined
  ): Promise<AuthUser> {
    this.guard.requireAdmin(adminId);
    const updated = await this.repo.unbanUser(input.userId);
    if (updated === null) {
      throw new ORPCError("NOT_FOUND", { message: "User not found" });
    }
    return updated;
  }
}
