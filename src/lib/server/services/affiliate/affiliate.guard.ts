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

  // oxlint-disable-next-line class-methods-use-this -- guard methods use `this` only for consistency
  requireAdmin(userId: string | null | undefined): string {
    if (userId == null || userId === "") {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Authentication is required",
      });
    }
    return userId;
  }

  async assertProfileExistsOrNotFound(
    userId: string
  ): Promise<{ slug: string; userId: string }> {
    const profile = await this.repo.findProfileByUserId(userId);
    if (!profile) {
      throw new ORPCError("NOT_FOUND", {
        message: "Affiliate profile not found",
      });
    }
    return { slug: profile.slug, userId: profile.userId };
  }
}
