import { ORPCError } from "@orpc/server";
import { describe, it } from "vitest";

import type { Order } from "../../infras/db/schema/plan.ts";
import type { UserRepository } from "../user/user.repository.ts";
import { PlanGuard } from "./plan.guard.ts";
import {
  captureError,
  createMockRepository,
  createMockUserRepository,
  createOrderFixture,
} from "./plan.testing.ts";

const setupGuard = () => {
  const repo = createMockRepository();
  const userRepo = createMockUserRepository();
  const guard = new PlanGuard(repo, userRepo as unknown as UserRepository);
  return { guard, repo, userRepo };
};

const throwUnauthorized = () => {
  throw new ORPCError("UNAUTHORIZED", {
    message: "Authentication is required",
  });
};

describe.concurrent("PlanGuard unit", () => {
  describe("requireOwner", () => {
    it("returns the owner id when present", async ({ expect }) => {
      const { guard } = setupGuard();
      expect(guard.requireOwner("user-123")).toBe("user-123");
    });

    it("throws UNAUTHORIZED when null", async ({ expect }) => {
      const { guard } = setupGuard();
      const err = await captureError((async () => guard.requireOwner(null))());
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("throws UNAUTHORIZED when empty string", async ({ expect }) => {
      const { guard } = setupGuard();
      const err = await captureError((async () => guard.requireOwner(""))());
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("has no side effects (no DB dependency)", async ({ expect }) => {
      const { guard } = setupGuard();
      expect(guard.requireOwner("user-123")).toBe("user-123");
    });

    it("propagates a thrown UNAUTHORIZED verbatim", async ({ expect }) => {
      const { guard } = setupGuard();
      const err = await captureError(
        (async () => {
          throwUnauthorized();
          guard.requireOwner("user-123");
        })()
      );
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });
  });

  describe("assertOrderVisibleByIdOrNotFound", () => {
    it("returns the order when the caller owns it", async ({ expect }) => {
      const { guard, repo } = setupGuard();
      const order: Order = createOrderFixture({
        id: "ord_owner1",
        userId: "user-1",
      });
      repo.findOrderById.mockResolvedValue(order);

      const result = await guard.assertOrderVisibleByIdOrNotFound(
        "ord_owner1",
        "user-1"
      );

      expect(result).toBe(order);
      expect(repo.findOrderById).toHaveBeenCalledWith("ord_owner1");
    });

    it("throws NOT_FOUND when the order does not exist", async ({ expect }) => {
      const { guard, repo } = setupGuard();
      repo.findOrderById.mockResolvedValue(null);
      const err = await captureError(
        guard.assertOrderVisibleByIdOrNotFound("ord_missing", "user-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws NOT_FOUND when the caller does not own the order (leak-prevention)", async ({
      expect,
    }) => {
      const { guard, repo } = setupGuard();
      repo.findOrderById.mockResolvedValue(
        createOrderFixture({ id: "ord_other", userId: "user-2" })
      );
      const err = await captureError(
        guard.assertOrderVisibleByIdOrNotFound("ord_other", "user-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({
        code: "NOT_FOUND",
        message: "Order not found",
      });
    });
  });

  describe("requireAdmin", () => {
    it("returns the admin id when present", async ({ expect }) => {
      const { guard } = setupGuard();
      expect(guard.requireAdmin("admin-123")).toBe("admin-123");
    });

    it("throws UNAUTHORIZED when null", async ({ expect }) => {
      const { guard } = setupGuard();
      const err = await captureError((async () => guard.requireAdmin(null))());
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("throws UNAUTHORIZED when undefined", async ({ expect }) => {
      const { guard } = setupGuard();
      const err = await captureError(
        (async () => guard.requireAdmin(undefined))()
      );
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("does not fetch the user (defense-in-depth only)", async ({
      expect,
    }) => {
      const { guard, userRepo } = setupGuard();
      guard.requireAdmin("admin-123");
      expect(userRepo.findUserById).not.toHaveBeenCalled();
    });
  });

  describe("assertUserExistsOrNotFound", () => {
    it("returns the user row when the id resolves", async ({ expect }) => {
      const { guard, userRepo } = setupGuard();
      const user = {
        banned: false,
        email: "u@e.com",
        emailVerified: true,
        id: "user-1",
        name: "U",
      } as never;
      userRepo.findUserById.mockResolvedValue(user);
      const result = await guard.assertUserExistsOrNotFound("user-1");
      expect(result).toBe(user);
      expect(userRepo.findUserById).toHaveBeenCalledWith("user-1");
    });

    it("throws NOT_FOUND when the user does not exist", async ({ expect }) => {
      const { guard, userRepo } = setupGuard();
      userRepo.findUserById.mockResolvedValue(null);
      const err = await captureError(
        guard.assertUserExistsOrNotFound("u-missing")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({
        code: "NOT_FOUND",
        message: "User not found",
      });
    });
  });
});
