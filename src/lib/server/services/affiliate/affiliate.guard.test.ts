import { ORPCError } from "@orpc/server";
import { describe, it } from "vitest";

import { AffiliateGuard } from "./affiliate.guard";
import {
  captureError,
  createMockRepository,
  createMockUserRepository,
} from "./affiliate.testing";

const setupGuard = () => {
  const repo = createMockRepository();
  const userRepo = createMockUserRepository();
  const guard = new AffiliateGuard(repo, userRepo);
  return { guard, repo, userRepo };
};

describe.concurrent("affiliate guard", () => {
  describe.concurrent("requireUser", () => {
    it("returns userId when provided", ({ expect }) => {
      const { guard } = setupGuard();

      const result = guard.requireUser("user-1");

      expect(result).toBe("user-1");
    });

    it("throws UNAUTHORIZED when userId is null", async ({ expect }) => {
      const { guard } = setupGuard();

      const err = await captureError(
        Promise.resolve().then(() => guard.requireUser(null))
      );

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("throws UNAUTHORIZED when userId is undefined", async ({ expect }) => {
      const { guard } = setupGuard();

      const err = await captureError(
        Promise.resolve().then(() => guard.requireUser(null))
      );

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("throws UNAUTHORIZED when userId is empty string", async ({
      expect,
    }) => {
      const { guard } = setupGuard();

      const err = await captureError(
        Promise.resolve().then(() => guard.requireUser(""))
      );

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });
  });

  describe.concurrent("requireAdmin", () => {
    it("returns userId when user has admin role", async ({ expect }) => {
      const { guard, userRepo } = setupGuard();
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion, typescript/no-unnecessary-type-assertion -- mock data partial
      userRepo.findUserById.mockResolvedValue({
        id: "admin-1",
        role: "admin",
      } as never);

      const result = await guard.requireAdmin("admin-1");

      expect(result).toBe("admin-1");
      expect(userRepo.findUserById).toHaveBeenCalledWith("admin-1");
    });

    it("throws FORBIDDEN when user is not admin", async ({ expect }) => {
      const { guard, userRepo } = setupGuard();
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion, typescript/no-unnecessary-type-assertion -- mock data partial
      userRepo.findUserById.mockResolvedValue({
        id: "user-1",
        role: null,
      } as never);

      const err = await captureError(guard.requireAdmin("user-1"));

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({
        code: "FORBIDDEN",
        message: "Admin access required",
      });
    });

    it("throws FORBIDDEN when user does not exist", async ({ expect }) => {
      const { guard, userRepo } = setupGuard();
      userRepo.findUserById.mockResolvedValue(null);

      const err = await captureError(guard.requireAdmin("missing-user"));

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({
        code: "FORBIDDEN",
        message: "Admin access required",
      });
    });

    it("throws UNAUTHORIZED when userId is null", async ({ expect }) => {
      const { guard } = setupGuard();

      const err = await captureError(
        (async () => await guard.requireAdmin(null))()
      );

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });
  });
});
