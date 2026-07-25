import { ORPCError } from "@orpc/server";

import type { UserRepository } from "./user.repository.ts";

export class UserGuard {
  private readonly repo: UserRepository;

  constructor(repo: UserRepository) {
    this.repo = repo;
  }

  // oxlint-disable-next-line class-methods-use-this
  requireAdmin(adminId: string | null | undefined): string {
    if (adminId === null || adminId === undefined || adminId === "") {
      throw new ORPCError("FORBIDDEN", {
        message: "Admin access required",
      });
    }
    return adminId;
  }
}
