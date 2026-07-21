import { ORPCError } from "@orpc/server";

import type { UserRepository } from "../user/user.repository";
import type { AffiliateRepository } from "./affiliate.repository";

export class AffiliateGuard {
  private readonly repo: AffiliateRepository;
  private readonly userRepo: UserRepository;

  constructor(repo: AffiliateRepository, userRepo: UserRepository) {
    this.repo = repo;
    this.userRepo = userRepo;
  }

  // oxlint-disable-next-line class-methods-use-this -- guard methods use `this` only for consistency
  requireUser(userId: string | null | undefined): string {
    if (userId === null || userId === undefined || userId === "") {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Authentication is required",
      });
    }
    return userId;
  }

  async requireAdmin(userId: string | null | undefined): Promise<string> {
    const id = this.requireUser(userId);
    // oxlint-disable-next-line typescript/no-unsafe-assignment -- Drizzle $onUpdate pollutes AuthUser with any
    const user = await this.userRepo.findUserById(id);
    // oxlint-disable-next-line typescript/strict-boolean-expressions, typescript/no-unsafe-member-access -- Drizzle any makes user.role unsafe
    if (!user || user.role !== "admin") {
      throw new ORPCError("FORBIDDEN", {
        message: "Admin access required",
      });
    }
    return id;
  }
}
