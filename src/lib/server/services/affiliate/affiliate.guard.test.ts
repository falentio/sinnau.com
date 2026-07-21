import { ORPCError } from "@orpc/server";
import { describe, it } from "vitest";

import { AffiliateGuard } from "./affiliate.guard";
import { captureError, createMockRepository } from "./affiliate.testing";

describe.concurrent("AffiliateGuard", () => {
  describe.concurrent("requireUser", () => {
    it("returns userId when provided", ({ expect }) => {
      const repo = createMockRepository();
      const guard = new AffiliateGuard(repo);

      const result = guard.requireUser("user-1");

      expect(result).toBe("user-1");
    });

    it("throws UNAUTHORIZED when userId is null", async ({ expect }) => {
      const repo = createMockRepository();
      const guard = new AffiliateGuard(repo);

      const err = await captureError(
        Promise.resolve().then(() => guard.requireUser(null))
      );

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("throws UNAUTHORIZED when userId is undefined", async ({ expect }) => {
      const repo = createMockRepository();
      const guard = new AffiliateGuard(repo);

      const err = await captureError(
        Promise.resolve().then(() => guard.requireUser(undefined))
      );

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("throws UNAUTHORIZED when userId is empty string", async ({
      expect,
    }) => {
      const repo = createMockRepository();
      const guard = new AffiliateGuard(repo);

      const err = await captureError(
        Promise.resolve().then(() => guard.requireUser(""))
      );

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });
  });

  describe.concurrent("requireAdmin", () => {
    it("returns userId when provided", ({ expect }) => {
      const repo = createMockRepository();
      const guard = new AffiliateGuard(repo);

      const result = guard.requireAdmin("admin-1");

      expect(result).toBe("admin-1");
    });

    it("throws UNAUTHORIZED when userId is null", async ({ expect }) => {
      const repo = createMockRepository();
      const guard = new AffiliateGuard(repo);

      const err = await captureError(
        Promise.resolve().then(() => guard.requireAdmin(null))
      );

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });
  });
});
