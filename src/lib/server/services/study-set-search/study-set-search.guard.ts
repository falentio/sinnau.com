import { ORPCError } from "@orpc/server";

export class StudySetSearchGuard {
  // oxlint-disable-next-line class-methods-use-this
  requireUser(userId: string | null | undefined): string {
    // oxlint-disable-next-line typescript/strict-boolean-expressions
    if (!userId) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Authentication is required",
      });
    }
    return userId;
  }
}
