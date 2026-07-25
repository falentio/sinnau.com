import { ORPCError } from "@orpc/server";

export class UserGuard {
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
