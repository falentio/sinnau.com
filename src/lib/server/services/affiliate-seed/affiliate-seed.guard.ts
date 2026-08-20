import { ORPCError } from "@orpc/server";

import type { UserRepository } from "../user/user.repository";

export class AffiliateSeedGuard {
  // oxlint-disable-next-line typescript/parameter-properties -- intentional param property mirrors AffiliateGuard pattern
  constructor(private readonly userRepo: UserRepository) {}

  // oxlint-disable-next-line class-methods-use-this -- guard method consistent with other guards
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
    const user = await this.userRepo.findUserById(id);
    if (!user || user.role !== "admin") {
      throw new ORPCError("FORBIDDEN", {
        message: "Admin access required",
      });
    }
    return id;
  }
}
