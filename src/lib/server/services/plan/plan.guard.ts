import { ORPCError } from "@orpc/server";

import type { Order } from "../../infras/db/schema/plan.ts";
import type { AuthUser, UserRepository } from "../user/user.repository.ts";
import type { PlanRepository } from "./plan.repository.ts";

export class PlanGuard {
  private readonly planRepo: PlanRepository;
  private readonly userRepo: UserRepository;

  constructor(planRepo: PlanRepository, userRepo: UserRepository) {
    this.planRepo = planRepo;
    this.userRepo = userRepo;
  }

  // oxlint-disable-next-line class-methods-use-this
  requireOwner(ownerId: string | null | undefined): string {
    if (ownerId === null || ownerId === undefined || ownerId === "") {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Authentication is required",
      });
    }
    return ownerId;
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

  async assertUserExistsOrNotFound(userId: string): Promise<AuthUser> {
    // AuthUser resolves to `any` because auth-schema.ts is ignored by oxlint
    // oxlint-disable-next-line typescript/no-unsafe-assignment
    const row = await this.userRepo.findUserById(userId);
    if (row === null || row === undefined) {
      throw new ORPCError("NOT_FOUND", { message: "User not found" });
    }
    return row;
  }

  async assertOrderVisibleByIdOrNotFound(
    orderId: string,
    userId: string
  ): Promise<Order> {
    const order = await this.planRepo.findOrderById(orderId);
    if (!order || order.userId !== userId) {
      throw new ORPCError("NOT_FOUND", { message: "Order not found" });
    }
    return order;
  }
}
