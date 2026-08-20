import { ORPCError } from "@orpc/server";
import { describe, it } from "vitest";

import type { AffiliateSeedGuard } from "./affiliate-seed.guard";
import { AffiliateSeedService } from "./affiliate-seed.service";
import {
  captureError,
  createMockSeedGuard,
  createMockSeedRepository,
} from "./affiliate-seed.testing";

const throwUnauthorized = (): never => {
  throw new ORPCError("UNAUTHORIZED", {
    message: "Authentication is required",
  });
};

const throwForbidden = (): never => {
  throw new ORPCError("FORBIDDEN", { message: "Admin access required" });
};

const setupService = (isDev = true) => {
  const repo = createMockSeedRepository();
  const guard = createMockSeedGuard();

  guard.requireAdmin.mockResolvedValue("admin-1");
  repo.findProfileByUserId.mockResolvedValue({
    createdAt: new Date(),
    id: "aff_abc",
    nameSnapshot: "Affiliate",
    points: 0,
    slug: "test-slug",
    updatedAt: new Date(),
    userId: "affiliate-1",
    version: 1,
  });
  repo.createDevUser.mockResolvedValue("purchaser-1");
  repo.insertConversion.mockResolvedValue({
    affiliateUserId: "affiliate-1",
    commissionAmount: 35_000,
    createdAt: new Date(),
    id: "afc_abc",
    payoutId: null,
    purchaseAmount: 100_000,
    purchaserUserId: "purchaser-1",
    status: "PENDING",
    transactionId: "dev-seed-abc",
  });

  const service = new AffiliateSeedService(
    repo,
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- mock to impl cast in tests
    guard as unknown as AffiliateSeedGuard,
    isDev
  );

  return { guard, repo, service };
};

describe.concurrent("affiliate-seed service", () => {
  describe.concurrent("seedPendingPayouts", () => {
    it("creates pending commissions for an existing affiliate", async ({
      expect,
    }) => {
      const { repo, service } = setupService(true);
      repo.findProfileByUserId.mockResolvedValue({
        createdAt: new Date(),
        id: "aff_abc",
        nameSnapshot: "Affiliate",
        points: 0,
        slug: "test-slug",
        updatedAt: new Date(),
        userId: "affiliate-1",
        version: 1,
      });
      repo.createDevUser
        .mockResolvedValueOnce("purchaser-1")
        .mockResolvedValueOnce("purchaser-2");
      repo.insertConversion
        .mockResolvedValueOnce({
          affiliateUserId: "affiliate-1",
          commissionAmount: 35_000,
          createdAt: new Date(),
          id: "afc_1",
          payoutId: null,
          purchaseAmount: 100_000,
          purchaserUserId: "purchaser-1",
          status: "PENDING",
          transactionId: "dev-seed-1",
        })
        .mockResolvedValueOnce({
          affiliateUserId: "affiliate-1",
          commissionAmount: 42_000,
          createdAt: new Date(),
          id: "afc_2",
          payoutId: null,
          purchaseAmount: 120_000,
          purchaserUserId: "purchaser-2",
          status: "PENDING",
          transactionId: "dev-seed-2",
        });

      const result = await service.seedPendingPayouts(
        { affiliateUserId: "affiliate-1", count: 2 },
        "admin-1"
      );

      expect(result).toEqual({
        affiliateUserId: "affiliate-1",
        commissionIds: ["afc_1", "afc_2"],
        created: 2,
      });
      expect(repo.findProfileByUserId).toHaveBeenCalledWith("affiliate-1");
      expect(repo.createDevUser).toHaveBeenCalledTimes(2);
      expect(repo.insertConversion).toHaveBeenCalledTimes(2);
      expect(repo.insertConversion).toHaveBeenCalledWith(
        expect.objectContaining({ affiliateUserId: "affiliate-1" })
      );
    });

    it("defaults count to 3 when not provided", async ({ expect }) => {
      const { repo, service } = setupService(true);

      await service.seedPendingPayouts(
        { affiliateUserId: "affiliate-1" },
        "admin-1"
      );

      expect(repo.createDevUser).toHaveBeenCalledTimes(3);
      expect(repo.insertConversion).toHaveBeenCalledTimes(3);
    });

    it("throws FORBIDDEN when not in dev", async ({ expect }) => {
      const { service } = setupService(false);

      const err = await captureError(
        service.seedPendingPayouts(
          { affiliateUserId: "affiliate-1", count: 1 },
          "admin-1"
        )
      );

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "FORBIDDEN" });
    });

    it("throws AFFILIATE_NO_PROFILE when affiliate has no profile", async ({
      expect,
    }) => {
      const { repo, service } = setupService(true);
      repo.findProfileByUserId.mockResolvedValue(null);

      const err = await captureError(
        service.seedPendingPayouts(
          { affiliateUserId: "ghost", count: 1 },
          "admin-1"
        )
      );

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "AFFILIATE_NO_PROFILE" });
      expect(repo.createDevUser).not.toHaveBeenCalled();
    });

    it("throws UNAUTHORIZED when guard rejects", async ({ expect }) => {
      const { guard, service } = setupService(true);
      guard.requireAdmin.mockImplementation(throwUnauthorized);

      const err = await captureError(
        service.seedPendingPayouts(
          { affiliateUserId: "affiliate-1", count: 1 },
          null
        )
      );

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("throws FORBIDDEN when admin check fails", async ({ expect }) => {
      const { guard, service } = setupService(true);
      guard.requireAdmin.mockImplementation(throwForbidden);

      const err = await captureError(
        service.seedPendingPayouts(
          { affiliateUserId: "affiliate-1", count: 1 },
          "user-1"
        )
      );

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "FORBIDDEN" });
    });

    it("counts only successful inserts when insert returns null", async ({
      expect,
    }) => {
      const { repo, service } = setupService(true);
      repo.createDevUser.mockResolvedValue("purchaser-1");
      repo.insertConversion.mockResolvedValueOnce(null).mockResolvedValueOnce({
        affiliateUserId: "affiliate-1",
        commissionAmount: 35_000,
        createdAt: new Date(),
        id: "afc_ok",
        payoutId: null,
        purchaseAmount: 100_000,
        purchaserUserId: "purchaser-1",
        status: "PENDING",
        transactionId: "dev-seed-ok",
      });

      const result = await service.seedPendingPayouts(
        { affiliateUserId: "affiliate-1", count: 2 },
        "admin-1"
      );

      expect(result.created).toBe(1);
      expect(result.commissionIds).toEqual(["afc_ok"]);
    });
  });
});
