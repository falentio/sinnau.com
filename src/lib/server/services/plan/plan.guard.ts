import { ORPCError } from "@orpc/server";

export class PlanGuard {
  requireOwner(ownerId: string | null | undefined): string {
    if (!ownerId) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Authentication is required",
      });
    }
    return ownerId;
  }
}
