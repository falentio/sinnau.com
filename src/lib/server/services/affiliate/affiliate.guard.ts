import { ORPCError } from "@orpc/server";

import type { AffiliateRepository } from "./affiliate.repository";

export class AffiliateGuard {
  private readonly repo: AffiliateRepository;

  constructor(repo: AffiliateRepository) {
    this.repo = repo;
  }

  // oxlint-disable-next-line class-methods-use-this -- guard methods use `this` only for consistency
  requireUser(userId: string | null | undefined): string {
    if (userId == null || userId === "") {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Authentication is required",
      });
    }
    return userId;
  }

  requireAdmin(userId: string | null | undefined): string {
    return this.requireUser(userId);
  }
}
