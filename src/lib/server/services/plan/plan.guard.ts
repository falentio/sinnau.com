import { ORPCError } from "@orpc/server";

import type { Order } from "../../infras/db/schema/plan.ts";
import type { PlanRepository } from "./plan.repository.ts";

export class PlanGuard {
  private readonly repo: PlanRepository;

  constructor(repo: PlanRepository) {
    this.repo = repo;
  }

  requireOwner(ownerId: string | null | undefined): string {
    if (!ownerId) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Authentication is required",
      });
    }
    return ownerId;
  }

  async assertOrderVisibleByIdOrNotFound(
    orderId: string,
    userId: string
  ): Promise<Order> {
    const order = await this.repo.findOrderById(orderId);
    if (!order || order.userId !== userId) {
      throw new ORPCError("NOT_FOUND", { message: "Order not found" });
    }
    return order;
  }
}
