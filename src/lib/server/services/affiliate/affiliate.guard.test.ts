import { ORPCError } from "@orpc/server";
import { describe, it } from "vitest";

import { AffiliateGuard } from "./affiliate.guard";
import { captureError, createMockRepository } from "./affiliate.testing";

describe.concurrent("AffiliateGuard", () => {
  describe("requireUser", () => {
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
  });

  describe("requireAdmin", () => {
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

    it("throws UNAUTHORIZED when userId is undefined", async ({ expect }) => {
      const repo = createMockRepository();
      const guard = new AffiliateGuard(repo);

      const err = await captureError(
        Promise.resolve().then(() => guard.requireAdmin(undefined))
      );

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });
  });

  describe("assertProfileExistsOrNotFound", () => {
    const createProfileFixture = () => ({
      id: "aff_abc123def456",
      userId: "user-1",
      slug: "test-slug",
      nameSnapshot: "Test User",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    it("returns user id and slug when profile exists", async ({ expect }) => {
      const repo = createMockRepository();
      const guard = new AffiliateGuard(repo);
      repo.findProfileByUserId.mockResolvedValue(createProfileFixture());

      const result = await guard.assertProfileExistsOrNotFound("user-1");

      expect(result).toEqual({ userId: "user-1", slug: "test-slug" });
    });

    it("throws NOT_FOUND when profile does not exist", async ({ expect }) => {
      const repo = createMockRepository();
      const guard = new AffiliateGuard(repo);
      repo.findProfileByUserId.mockResolvedValue(null);

      const err = await captureError(
        guard.assertProfileExistsOrNotFound("user-1")
      );

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });
  });
});
