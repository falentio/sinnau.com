import { ORPCError } from "@orpc/server";

import type { ReferralRepository } from "./referral.repository.ts";

export class ReferralGuard {
  private readonly repo: ReferralRepository;

  constructor(repo: ReferralRepository) {
    this.repo = repo;
  }

  // oxlint-disable-next-line class-methods-use-this
  requireUser(userId: string | null | undefined): string {
    if (userId === null || userId === undefined) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Authentication is required",
      });
    }
    return userId;
  }
}
