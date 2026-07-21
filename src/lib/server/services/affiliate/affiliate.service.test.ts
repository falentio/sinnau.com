import { ORPCError } from "@orpc/server";
import { describe, it } from "vitest";

import { AffiliateGuard } from "./affiliate.guard";
import { AffiliateService } from "./affiliate.service";
import {
  captureError,
  createMockGuard,
  createMockRepository,
} from "./affiliate.testing";

function throwUnauthorized(): never {
  throw new ORPCError("UNAUTHORIZED", {
    message: "Authentication is required",
  });
}

function setupService() {
  const repo = createMockRepository();
  const guard = createMockGuard();

  guard.requireUser.mockReturnValue("user-1");
  guard.requireAdmin.mockReturnValue("admin-1");

  const service = new AffiliateService(
    repo,
    guard as unknown as AffiliateGuard
  );

  return { repo, guard, service };
}

describe.concurrent("AffiliateService", () => {
  describe.concurrent("claim", () => {
    it("creates profile with auto-generated slug from user name", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findProfileByUserId.mockResolvedValue(null);
      repo.findProfileBySlug.mockResolvedValue(null);
      repo.findUserById.mockResolvedValue({
        id: "user-1",
        name: "Test User",
      });
      repo.insertProfile.mockResolvedValue({
        id: "aff_abc123def456",
        userId: "user-1",
        slug: "test-user-ab12cd34",
        nameSnapshot: "Test User",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const profile = await service.claim("user-1");

      expect(profile.slug).toMatch(/^test-user-[0-9A-Za-z]{8}$/u);
      expect(profile.userId).toBe("user-1");
      expect(profile.nameSnapshot).toBe("Test User");
    });

    it("throws NOT_FOUND when user does not exist", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findUserById.mockResolvedValue(null);

      const err = await captureError(service.claim("user-1"));

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws AFFILIATE_PROFILE_ALREADY_EXISTS when profile exists", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findProfileByUserId.mockResolvedValue({
        id: "aff_existing",
        userId: "user-1",
        slug: "existing",
        nameSnapshot: "Existing",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      repo.findUserById.mockResolvedValue({
        id: "user-1",
        name: "Test User",
      });

      const err = await captureError(service.claim("user-1"));

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "AFFILIATE_PROFILE_ALREADY_EXISTS" });
    });

    it("throws UNAUTHORIZED when guard rejects", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.requireUser.mockImplementation(throwUnauthorized);

      const err = await captureError(service.claim(null));

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("throws AFFILIATE_SLUG_CONFLICT when slug generation fails", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findProfileByUserId.mockResolvedValue(null);
      repo.findUserById.mockResolvedValue({
        id: "user-1",
        name: "Test User",
      });
      repo.findProfileBySlug.mockResolvedValue({
        id: "aff_existing",
        userId: "other",
        slug: "existing",
        nameSnapshot: "Other",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const err = await captureError(service.claim("user-1"));

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "AFFILIATE_SLUG_CONFLICT" });
    });

    it("throws AFFILIATE_SLUG_CONFLICT when insertProfile returns null", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findProfileByUserId.mockResolvedValue(null);
      repo.findProfileBySlug.mockResolvedValue(null);
      repo.findUserById.mockResolvedValue({
        id: "user-1",
        name: "Test User",
      });
      repo.insertProfile.mockResolvedValue(null);

      const err = await captureError(service.claim("user-1"));

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "AFFILIATE_SLUG_CONFLICT" });
    });
  });

  describe.concurrent("resolveSlug", () => {
    it("returns userId for a valid slug", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findProfileBySlug.mockResolvedValue({
        id: "aff_abc",
        userId: "user-1",
        slug: "test-slug",
        nameSnapshot: "Test",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.resolveSlug("test-slug");

      expect(result).toEqual({ userId: "user-1" });
      expect(repo.findProfileBySlug).toHaveBeenCalledWith("test-slug");
    });

    it("throws NOT_FOUND for unknown slug", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findProfileBySlug.mockResolvedValue(null);

      const err = await captureError(service.resolveSlug("unknown"));

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });

    it("sanitizes slug input before querying", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findProfileBySlug.mockResolvedValue(null);

      await captureError(service.resolveSlug("Test Slug!"));

      expect(repo.findProfileBySlug).toHaveBeenCalledWith("test-slug");
    });
  });

  describe.concurrent("recordConversion", () => {
    const validInput = {
      transactionId: "txn-1",
      purchaserUserId: "buyer-1",
      purchaseAmount: 100000,
      commissionAmount: 30000,
    };

    it("records new conversion when affiliate is found", async ({ expect }) => {
      const { repo, service } = setupService();
      const commission = {
        id: "afc_abc",
        affiliateUserId: "referrer-1",
        purchaserUserId: "buyer-1",
        purchaseAmount: 100000,
        commissionAmount: 30000,
        transactionId: "txn-1",
        status: "PENDING" as const,
        payoutId: null,
        createdAt: new Date(),
      };

      repo.findAffiliatedByUserId.mockResolvedValue("referrer-1");
      repo.findConversionByTransactionId.mockResolvedValue(null);
      repo.insertConversion.mockResolvedValue(commission);

      const result = await service.recordConversion(validInput);

      expect(result.created).toBe(true);
      expect(result.commission).toEqual(commission);
      expect(repo.insertConversion).toHaveBeenCalledWith({
        affiliateUserId: "referrer-1",
        purchaserUserId: "buyer-1",
        purchaseAmount: 100000,
        commissionAmount: 30000,
        transactionId: "txn-1",
      });
    });

    it("returns no-op when purchaser has no affiliate", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findAffiliatedByUserId.mockResolvedValue(null);

      const result = await service.recordConversion(validInput);

      expect(result.created).toBe(false);
      expect(result.commission).toBeNull();
      expect(repo.insertConversion).not.toHaveBeenCalled();
    });

    it("returns existing conversion on duplicate transactionId", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      const existing = {
        id: "afc_abc",
        affiliateUserId: "referrer-1",
        purchaserUserId: "buyer-1",
        purchaseAmount: 100000,
        commissionAmount: 30000,
        transactionId: "txn-1",
        status: "PENDING" as const,
        payoutId: null,
        createdAt: new Date(),
      };

      repo.findAffiliatedByUserId.mockResolvedValue("referrer-1");
      repo.findConversionByTransactionId.mockResolvedValue(existing);

      const result = await service.recordConversion(validInput);

      expect(result.created).toBe(false);
      expect(result.commission).toEqual(existing);
      expect(repo.insertConversion).not.toHaveBeenCalled();
    });

    it("blocks self-referral", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findAffiliatedByUserId.mockResolvedValue("buyer-1");

      const result = await service.recordConversion(validInput);

      expect(result.created).toBe(false);
      expect(result.commission).toBeNull();
      expect(repo.insertConversion).not.toHaveBeenCalled();
    });

    it("returns no-op when insertConversion returns null", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findAffiliatedByUserId.mockResolvedValue("referrer-1");
      repo.findConversionByTransactionId.mockResolvedValue(null);
      repo.insertConversion.mockResolvedValue(null);

      const result = await service.recordConversion(validInput);

      expect(result.created).toBe(false);
      expect(result.commission).toBeNull();
    });
  });

  describe.concurrent("recordPayout", () => {
    it("records full payout and marks commissions as paid", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      const payout = {
        id: "afp_abc",
        affiliateUserId: "user-1",
        amount: 50000,
        method: "bank_transfer",
        reference: "REF-001",
        note: null,
        processedByAdminId: "admin-1",
        createdAt: new Date(),
      };

      repo.getDashboardSummary.mockResolvedValue({
        profile: {
          id: "aff_abc",
          userId: "user-1",
          slug: "test",
          nameSnapshot: "Test",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        pendingBalance: 50000,
        totalEarned: 50000,
        totalPaid: 0,
        conversionCount: 5,
      });
      repo.insertPayout.mockResolvedValue(payout);
      repo.markCommissionsAsPaid.mockResolvedValue(5);

      const result = await service.recordPayout(
        "user-1",
        "bank_transfer",
        "REF-001",
        undefined,
        "admin-1"
      );

      expect(result).toEqual(payout);
      expect(repo.insertPayout).toHaveBeenCalledWith({
        affiliateUserId: "user-1",
        amount: 50000,
        method: "bank_transfer",
        reference: "REF-001",
        note: null,
        processedByAdminId: "admin-1",
      });
      expect(repo.markCommissionsAsPaid).toHaveBeenCalledWith(
        "user-1",
        "afp_abc"
      );
    });

    it("forwards note parameter to insertPayout", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.getDashboardSummary.mockResolvedValue({
        profile: null,
        pendingBalance: 50000,
        totalEarned: 50000,
        totalPaid: 0,
        conversionCount: 1,
      });
      repo.insertPayout.mockResolvedValue({
        id: "afp_note",
        affiliateUserId: "user-1",
        amount: 50000,
        method: null,
        reference: null,
        note: "First payout",
        processedByAdminId: "admin-1",
        createdAt: new Date(),
      });
      repo.markCommissionsAsPaid.mockResolvedValue(1);

      await service.recordPayout(
        "user-1",
        undefined,
        undefined,
        "First payout",
        "admin-1"
      );

      expect(repo.insertPayout).toHaveBeenCalledWith(
        expect.objectContaining({ note: "First payout" })
      );
    });

    it("throws UNAUTHORIZED when adminId is null", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.requireAdmin.mockImplementation(throwUnauthorized);

      const err = await captureError(
        service.recordPayout("user-1", undefined, undefined, undefined, null)
      );

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("throws AFFILIATE_NO_PENDING_BALANCE when balance is zero", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.getDashboardSummary.mockResolvedValue({
        profile: null,
        pendingBalance: 0,
        totalEarned: 0,
        totalPaid: 0,
        conversionCount: 0,
      });

      const err = await captureError(
        service.recordPayout(
          "user-1",
          undefined,
          undefined,
          undefined,
          "admin-1"
        )
      );

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "AFFILIATE_NO_PENDING_BALANCE" });
    });

    it("throws INTERNAL_SERVER_ERROR when insertPayout returns null", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.getDashboardSummary.mockResolvedValue({
        profile: null,
        pendingBalance: 50000,
        totalEarned: 50000,
        totalPaid: 0,
        conversionCount: 1,
      });
      repo.insertPayout.mockResolvedValue(null);

      const err = await captureError(
        service.recordPayout(
          "user-1",
          undefined,
          undefined,
          undefined,
          "admin-1"
        )
      );

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    });
  });

  describe.concurrent("getDashboardSummary", () => {
    it("returns dashboard summary for authenticated user", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      const summary = {
        profile: {
          id: "aff_abc",
          userId: "user-1",
          slug: "test-slug",
          nameSnapshot: "Test",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        pendingBalance: 30000,
        totalEarned: 100000,
        totalPaid: 70000,
        conversionCount: 10,
      };
      repo.getDashboardSummary.mockResolvedValue(summary);

      const result = await service.getDashboardSummary("user-1");

      expect(result).toEqual(summary);
      expect(repo.getDashboardSummary).toHaveBeenCalledWith("user-1");
    });

    it("throws UNAUTHORIZED when userId is null", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.requireUser.mockImplementation(throwUnauthorized);

      const err = await captureError(service.getDashboardSummary(null));

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });
  });

  describe.concurrent("listPendingPayouts", () => {
    it("returns pending payouts list for admin", async ({ expect }) => {
      const { repo, service } = setupService();
      const list = {
        data: [
          {
            affiliateUserId: "user-1",
            slug: "test",
            pendingBalance: 30000,
            conversionCount: 5,
          },
        ],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };
      repo.listPendingPayouts.mockResolvedValue(list);

      const result = await service.listPendingPayouts("admin-1");

      expect(result).toEqual(list);
      expect(repo.listPendingPayouts).toHaveBeenCalledWith(1, 10);
    });

    it("forwards custom page and limit to repo", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.listPendingPayouts.mockResolvedValue({
        data: [],
        pagination: { page: 2, limit: 5, total: 0, totalPages: 1 },
      });

      await service.listPendingPayouts("admin-1", 2, 5);

      expect(repo.listPendingPayouts).toHaveBeenCalledWith(2, 5);
    });

    it("throws UNAUTHORIZED when adminId is null", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.requireAdmin.mockImplementation(throwUnauthorized);

      const err = await captureError(service.listPendingPayouts(null));

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });
  });
});
