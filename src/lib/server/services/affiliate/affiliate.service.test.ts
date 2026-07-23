import { ORPCError } from "@orpc/server";
import { describe, it } from "vitest";

import type { AffiliateGuard } from "./affiliate.guard";
import { AffiliateService } from "./affiliate.service";
import {
  captureError,
  createAffiliateProfileFixture,
  createMockGuard,
  createMockRepository,
} from "./affiliate.testing";

const throwUnauthorized = (): never => {
  throw new ORPCError("UNAUTHORIZED", {
    message: "Authentication is required",
  });
};

const setupService = () => {
  const repo = createMockRepository();
  const guard = createMockGuard();

  guard.requireUser.mockReturnValue("user-1");
  guard.requireAdmin.mockResolvedValue("admin-1");

  const service = new AffiliateService(
    repo,
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- mock to impl cast in tests
    guard as unknown as AffiliateGuard
  );

  return { guard, repo, service };
};

describe.concurrent("affiliate service", () => {
  describe.concurrent("claim", () => {
    it("creates profile with random 8-char slug", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findProfileByUserId.mockResolvedValue(null);
      repo.findProfileBySlug.mockResolvedValue(null);
      repo.findUserById.mockResolvedValue({
        id: "user-1",
        name: "Test User",
      });
      repo.insertProfile.mockResolvedValue({
        createdAt: new Date(),
        id: "aff_abc123def456",
        nameSnapshot: "Test User",
        points: 0,
        slug: "ab12cd34",
        updatedAt: new Date(),
        userId: "user-1",
        version: 1,
      });

      const profile = await service.claim("user-1");

      expect(profile.slug).toMatch(/^[0-9a-z]{8}$/u);
      expect(profile.userId).toBe("user-1");
      expect(profile.nameSnapshot).toBe("Test User");
    });

    it("returns existing profile when one exists", async ({ expect }) => {
      const { repo, service } = setupService();
      const existing = {
        createdAt: new Date(),
        id: "aff_existing",
        nameSnapshot: "Existing",
        points: 0,
        slug: "existing",
        updatedAt: new Date(),
        userId: "user-1",
        version: 1,
      };
      repo.findProfileByUserId.mockResolvedValue(existing);

      const result = await service.claim("user-1");

      expect(result).toEqual(existing);
    });

    it("throws NOT_FOUND when user does not exist", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findProfileByUserId.mockResolvedValue(null);
      repo.findUserById.mockResolvedValue(null);

      const err = await captureError(service.claim("user-1"));

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
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
        createdAt: new Date(),
        id: "aff_existing",
        nameSnapshot: "Other",
        points: 0,
        slug: "existing",
        updatedAt: new Date(),
        userId: "other",
        version: 1,
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

  describe.concurrent("getMyProfile", () => {
    it("returns the profile for the authenticated user", async ({ expect }) => {
      const { repo, service } = setupService();
      const profile = createAffiliateProfileFixture();
      repo.findProfileByUserId.mockResolvedValue(profile);

      const result = await service.getMyProfile("user-1");

      expect(result).toEqual(profile);
      expect(repo.findProfileByUserId).toHaveBeenCalledWith("user-1");
    });

    it("throws NOT_FOUND when the user has no profile", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findProfileByUserId.mockResolvedValue(null);

      const err = await captureError(service.getMyProfile("user-1"));

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws UNAUTHORIZED when userId is null", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.requireUser.mockImplementation(throwUnauthorized);

      const err = await captureError(service.getMyProfile(null));

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });
  });

  describe.concurrent("hasProfile", () => {
    it("returns true when the user has a profile", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findProfileByUserId.mockResolvedValue(
        createAffiliateProfileFixture()
      );

      await expect(service.hasProfile("user-1")).resolves.toBe(true);
      expect(repo.findProfileByUserId).toHaveBeenCalledWith("user-1");
    });

    it("returns false when the user has no profile", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findProfileByUserId.mockResolvedValue(null);

      await expect(service.hasProfile("user-1")).resolves.toBe(false);
    });
  });

  describe.concurrent("resolveSlug", () => {
    it("returns userId for a valid slug", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findProfileBySlug.mockResolvedValue({
        createdAt: new Date(),
        id: "aff_abc",
        nameSnapshot: "Test",
        points: 0,
        slug: "test-slug",
        updatedAt: new Date(),
        userId: "user-1",
        version: 1,
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
      commissionAmount: 30_000,
      purchaseAmount: 100_000,
      purchaserUserId: "buyer-1",
      transactionId: "txn-1",
    };

    it("records new conversion when affiliate is found", async ({ expect }) => {
      const { repo, service } = setupService();
      const commission = {
        affiliateUserId: "referrer-1",
        commissionAmount: 30_000,
        createdAt: new Date(),
        id: "afc_abc",
        payoutId: null,
        purchaseAmount: 100_000,
        purchaserUserId: "buyer-1",
        status: "PENDING" as const,
        transactionId: "txn-1",
      };

      repo.findAffiliatedByUserId.mockResolvedValue("referrer-1");
      repo.findConversionByTransactionId.mockResolvedValue(null);
      repo.insertConversion.mockResolvedValue(commission);

      const result = await service.recordConversion(validInput, "admin-1");

      expect(result.created).toBe(true);
      expect(result.commission).toEqual(commission);
      expect(repo.insertConversion).toHaveBeenCalledWith({
        affiliateUserId: "referrer-1",
        commissionAmount: 30_000,
        purchaseAmount: 100_000,
        purchaserUserId: "buyer-1",
        transactionId: "txn-1",
      });
    });

    it("returns no-op when purchaser has no affiliate", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findAffiliatedByUserId.mockResolvedValue(null);

      const result = await service.recordConversion(validInput, "admin-1");

      expect(result.created).toBe(false);
      expect(result.commission).toBeNull();
      expect(repo.insertConversion).not.toHaveBeenCalled();
    });

    it("returns existing conversion on duplicate transactionId", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      const existing = {
        affiliateUserId: "referrer-1",
        commissionAmount: 30_000,
        createdAt: new Date(),
        id: "afc_abc",
        payoutId: null,
        purchaseAmount: 100_000,
        purchaserUserId: "buyer-1",
        status: "PENDING" as const,
        transactionId: "txn-1",
      };

      repo.findAffiliatedByUserId.mockResolvedValue("referrer-1");
      repo.findConversionByTransactionId.mockResolvedValue(existing);

      const result = await service.recordConversion(validInput, "admin-1");

      expect(result.created).toBe(false);
      expect(result.commission).toEqual(existing);
      expect(repo.insertConversion).not.toHaveBeenCalled();
    });

    it("throws AFFILIATE_SELF_REFERRAL on self-referral", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findAffiliatedByUserId.mockResolvedValue("buyer-1");

      const err = await captureError(
        service.recordConversion(validInput, "admin-1")
      );

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "AFFILIATE_SELF_REFERRAL" });
      expect(repo.insertConversion).not.toHaveBeenCalled();
    });

    it("returns no-op when insertConversion returns null", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findAffiliatedByUserId.mockResolvedValue("referrer-1");
      repo.findConversionByTransactionId.mockResolvedValue(null);
      repo.insertConversion.mockResolvedValue(null);

      const result = await service.recordConversion(validInput, "admin-1");

      expect(result.created).toBe(false);
      expect(result.commission).toBeNull();
    });

    it("throws UNAUTHORIZED when adminId is null", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.requireAdmin.mockImplementation(throwUnauthorized);

      const err = await captureError(
        service.recordConversion(validInput, null)
      );

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });
  });

  describe.concurrent("recordPayout", () => {
    const validInput = {
      affiliateUserId: "user-1",
      method: "bank_transfer",
      reference: "REF-001",
    };

    const payout = {
      affiliateUserId: "user-1",
      amount: 50_000,
      createdAt: new Date(),
      id: "afp_abc",
      method: "bank_transfer",
      note: null,
      processedByAdminId: "admin-1",
      reference: "REF-001",
    };

    it("creates an atomic payout when the books are clean", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findMissingCommissions.mockResolvedValue([]);
      repo.findInvalidCommissions.mockResolvedValue([]);
      repo.createPayoutForAffiliate.mockResolvedValue(payout);

      const result = await service.recordPayout(validInput, "admin-1");

      expect(result).toEqual(payout);
      expect(repo.findMissingCommissions).toHaveBeenCalledWith("user-1");
      expect(repo.findInvalidCommissions).toHaveBeenCalledWith("user-1");
      expect(repo.createPayoutForAffiliate).toHaveBeenCalledWith({
        affiliateUserId: "user-1",
        method: "bank_transfer",
        note: null,
        processedByAdminId: "admin-1",
        reference: "REF-001",
      });
    });

    it("forwards note parameter to createPayoutForAffiliate", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findMissingCommissions.mockResolvedValue([]);
      repo.findInvalidCommissions.mockResolvedValue([]);
      repo.createPayoutForAffiliate.mockResolvedValue({
        ...payout,
        note: "First payout",
      });

      await service.recordPayout(
        { affiliateUserId: "user-1", note: "First payout" },
        "admin-1"
      );

      expect(repo.createPayoutForAffiliate).toHaveBeenCalledWith(
        expect.objectContaining({ note: "First payout" })
      );
    });

    it("throws AFFILIATE_RECONCILE_BEFORE_PAYOUT when missing commissions exist", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findMissingCommissions.mockResolvedValue([
        {
          affiliateUserId: "user-1",
          purchaseAmount: 100_000,
          purchaserUserId: "buyer-1",
          transactionId: "txn-miss",
        },
      ]);
      repo.findInvalidCommissions.mockResolvedValue([]);

      const err = await captureError(
        service.recordPayout(validInput, "admin-1")
      );

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "AFFILIATE_RECONCILE_BEFORE_PAYOUT" });
      expect(repo.createPayoutForAffiliate).not.toHaveBeenCalled();
    });

    it("throws AFFILIATE_RECONCILE_BEFORE_PAYOUT when invalid commissions exist", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findMissingCommissions.mockResolvedValue([]);
      repo.findInvalidCommissions.mockResolvedValue([
        {
          affiliateUserId: "user-1",
          commissionAmount: 35_000,
          commissionId: "afc_x",
          orderStatus: "CANCELLED",
          purchaserUserId: "buyer-1",
          transactionId: "txn-inv",
        },
      ]);

      const err = await captureError(
        service.recordPayout(validInput, "admin-1")
      );

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "AFFILIATE_RECONCILE_BEFORE_PAYOUT" });
      expect(repo.createPayoutForAffiliate).not.toHaveBeenCalled();
    });

    it("throws AFFILIATE_NO_PENDING_BALANCE when there is nothing to pay", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findMissingCommissions.mockResolvedValue([]);
      repo.findInvalidCommissions.mockResolvedValue([]);
      repo.createPayoutForAffiliate.mockResolvedValue(null);

      const err = await captureError(
        service.recordPayout(validInput, "admin-1")
      );

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "AFFILIATE_NO_PENDING_BALANCE" });
    });

    it("throws UNAUTHORIZED when adminId is null", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.requireAdmin.mockImplementation(throwUnauthorized);

      const err = await captureError(service.recordPayout(validInput, null));

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });
  });

  describe.concurrent("reconcileCommissions", () => {
    it("returns missing and invalid commissions for admin", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      const missingRows = [
        {
          affiliateUserId: "user-1",
          purchaseAmount: 100_000,
          purchaserUserId: "buyer-1",
          transactionId: "txn-miss",
        },
      ];
      const invalid = [
        {
          affiliateUserId: "user-1",
          commissionAmount: 35_000,
          commissionId: "afc_x",
          orderStatus: "CANCELLED" as const,
          purchaserUserId: "buyer-1",
          transactionId: "txn-inv",
        },
      ];
      repo.findMissingCommissions.mockResolvedValue(missingRows);
      repo.findInvalidCommissions.mockResolvedValue(invalid);

      const result = await service.reconcileCommissions({}, "admin-1");

      expect(result).toEqual({
        invalid,
        missing: [
          {
            affiliateUserId: "user-1",
            expectedCommissionAmount: 35_000,
            purchaseAmount: 100_000,
            purchaserUserId: "buyer-1",
            transactionId: "txn-miss",
          },
        ],
      });
    });

    it("passes the affiliateUserId filter to the repository", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findMissingCommissions.mockResolvedValue([]);
      repo.findInvalidCommissions.mockResolvedValue([]);

      await service.reconcileCommissions(
        { affiliateUserId: "user-9" },
        "admin-1"
      );

      expect(repo.findMissingCommissions).toHaveBeenCalledWith("user-9");
      expect(repo.findInvalidCommissions).toHaveBeenCalledWith("user-9");
    });

    it("throws UNAUTHORIZED when adminId is null", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.requireAdmin.mockImplementation(throwUnauthorized);

      const err = await captureError(service.reconcileCommissions({}, null));

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });
  });

  describe.concurrent("backfillCommissions", () => {
    it("creates missing commissions at the expected amount and voids invalid ones", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findMissingCommissions.mockResolvedValue([
        {
          affiliateUserId: "user-1",
          purchaseAmount: 100_000,
          purchaserUserId: "buyer-1",
          transactionId: "txn-miss",
        },
      ]);
      repo.findInvalidCommissions.mockResolvedValue([
        {
          affiliateUserId: "user-1",
          commissionAmount: 35_000,
          commissionId: "afc_x",
          orderStatus: "CANCELLED",
          purchaserUserId: "buyer-1",
          transactionId: "txn-inv",
        },
      ]);
      repo.backfillCommissions.mockResolvedValue({ created: 1, voided: 1 });

      const result = await service.backfillCommissions({}, "admin-1");

      expect(result).toEqual({ created: 1, voided: 1 });
      expect(repo.backfillCommissions).toHaveBeenCalledWith(
        [
          {
            affiliateUserId: "user-1",
            commissionAmount: 35_000,
            purchaseAmount: 100_000,
            purchaserUserId: "buyer-1",
            transactionId: "txn-miss",
          },
        ],
        ["afc_x"]
      );
    });

    it("passes the affiliateUserId filter to the repository", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findMissingCommissions.mockResolvedValue([]);
      repo.findInvalidCommissions.mockResolvedValue([]);
      repo.backfillCommissions.mockResolvedValue({ created: 0, voided: 0 });

      await service.backfillCommissions(
        { affiliateUserId: "user-9" },
        "admin-1"
      );

      expect(repo.findMissingCommissions).toHaveBeenCalledWith("user-9");
      expect(repo.findInvalidCommissions).toHaveBeenCalledWith("user-9");
    });

    it("throws UNAUTHORIZED when adminId is null", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.requireAdmin.mockImplementation(throwUnauthorized);

      const err = await captureError(service.backfillCommissions({}, null));

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });
  });

  describe.concurrent("setReferrer", () => {
    it("sets the referrer for a user", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findUserById.mockResolvedValue({ id: "referrer-1", name: "R" });
      repo.updateUserAffiliatedBy.mockResolvedValue({
        affiliatedBy: "referrer-1",
        id: "user-2",
      });

      const result = await service.setReferrer(
        { referredUserId: "user-2", referrerUserId: "referrer-1" },
        "admin-1"
      );

      expect(result).toEqual({ affiliatedBy: "referrer-1", userId: "user-2" });
      expect(repo.updateUserAffiliatedBy).toHaveBeenCalledWith(
        "user-2",
        "referrer-1"
      );
    });

    it("clears the referrer when referrerUserId is null", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.updateUserAffiliatedBy.mockResolvedValue({
        affiliatedBy: null,
        id: "user-2",
      });

      const result = await service.setReferrer(
        { referredUserId: "user-2", referrerUserId: null },
        "admin-1"
      );

      expect(result).toEqual({ affiliatedBy: null, userId: "user-2" });
      expect(repo.findUserById).not.toHaveBeenCalled();
      expect(repo.updateUserAffiliatedBy).toHaveBeenCalledWith("user-2", null);
    });

    it("throws AFFILIATE_SELF_REFERRAL on self-referral", async ({
      expect,
    }) => {
      const { service } = setupService();

      const err = await captureError(
        service.setReferrer(
          { referredUserId: "user-1", referrerUserId: "user-1" },
          "admin-1"
        )
      );

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "AFFILIATE_SELF_REFERRAL" });
    });

    it("throws NOT_FOUND when referrer does not exist", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findUserById.mockResolvedValue(null);

      const err = await captureError(
        service.setReferrer(
          { referredUserId: "user-2", referrerUserId: "ghost" },
          "admin-1"
        )
      );

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
      expect(repo.updateUserAffiliatedBy).not.toHaveBeenCalled();
    });

    it("throws NOT_FOUND when referred user does not exist", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findUserById.mockResolvedValue({ id: "referrer-1", name: "R" });
      repo.updateUserAffiliatedBy.mockResolvedValue(null);

      const err = await captureError(
        service.setReferrer(
          { referredUserId: "ghost", referrerUserId: "referrer-1" },
          "admin-1"
        )
      );

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
      expect(repo.updateUserAffiliatedBy).toHaveBeenCalledWith(
        "ghost",
        "referrer-1"
      );
    });

    it("throws UNAUTHORIZED when adminId is null", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.requireAdmin.mockImplementation(throwUnauthorized);

      const err = await captureError(
        service.setReferrer(
          { referredUserId: "user-2", referrerUserId: "referrer-1" },
          null
        )
      );

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });
  });

  describe.concurrent("getDashboardSummary", () => {
    it("returns dashboard summary for authenticated user", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.getDashboardSummary.mockResolvedValue({
        conversionCount: 10,
        profile: {
          createdAt: new Date(),
          id: "aff_abc",
          nameSnapshot: "Test",
          points: 0,
          slug: "test-slug",
          updatedAt: new Date(),
          userId: "user-1",
          version: 1,
        },
        totalEarned: 100_000,
        totalPaid: 70_000,
      });

      const result = await service.getDashboardSummary("user-1");

      expect(result).toEqual({
        conversionCount: 10,
        pendingBalance: 30_000,
        // oxlint-disable-next-line typescript/no-unsafe-assignment -- vitest asymmetric matcher
        profile: expect.anything(),
        totalEarned: 100_000,
        totalPaid: 70_000,
      });
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

  describe.concurrent("handlePaymentSuccess", () => {
    it("inserts conversion with 35% commission on happy path", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findAffiliatedByUserId.mockResolvedValue("referrer-1");
      repo.findConversionByTransactionId.mockResolvedValue(null);
      repo.insertConversion.mockResolvedValue({
        affiliateUserId: "referrer-1",
        commissionAmount: 35_000,
        createdAt: new Date(),
        id: "afc_abc",
        payoutId: null,
        purchaseAmount: 100_000,
        purchaserUserId: "buyer-1",
        status: "PENDING" as const,
        transactionId: "txn-1",
      });

      await service.handlePaymentSuccess({
        purchaseAmount: 100_000,
        purchaserUserId: "buyer-1",
        transactionId: "txn-1",
      });

      expect(repo.insertConversion).toHaveBeenCalledWith({
        affiliateUserId: "referrer-1",
        commissionAmount: 35_000,
        purchaseAmount: 100_000,
        purchaserUserId: "buyer-1",
        transactionId: "txn-1",
      });
    });

    it("does nothing when purchaser has no referrer", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findAffiliatedByUserId.mockResolvedValue(null);

      await service.handlePaymentSuccess({
        purchaseAmount: 100_000,
        purchaserUserId: "buyer-1",
        transactionId: "txn-1",
      });

      expect(repo.insertConversion).not.toHaveBeenCalled();
    });

    it("does nothing on self-referral", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findAffiliatedByUserId.mockResolvedValue("buyer-1");

      await service.handlePaymentSuccess({
        purchaseAmount: 100_000,
        purchaserUserId: "buyer-1",
        transactionId: "txn-1",
      });

      expect(repo.insertConversion).not.toHaveBeenCalled();
    });

    it("does nothing on duplicate transactionId", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findAffiliatedByUserId.mockResolvedValue("referrer-1");
      repo.findConversionByTransactionId.mockResolvedValue({
        affiliateUserId: "referrer-1",
        commissionAmount: 35_000,
        createdAt: new Date(),
        id: "afc_existing",
        payoutId: null,
        purchaseAmount: 100_000,
        purchaserUserId: "buyer-1",
        status: "PENDING" as const,
        transactionId: "txn-1",
      });

      await service.handlePaymentSuccess({
        purchaseAmount: 100_000,
        purchaserUserId: "buyer-1",
        transactionId: "txn-1",
      });

      expect(repo.insertConversion).not.toHaveBeenCalled();
    });
  });

  describe.concurrent("listPendingPayouts", () => {
    it("returns pending payouts list for admin", async ({ expect }) => {
      const { repo, service } = setupService();
      const list = {
        data: [
          {
            affiliateUserId: "user-1",
            conversionCount: 5,
            pendingBalance: 30_000,
            slug: "test",
          },
        ],
        pagination: { limit: 10, page: 1, total: 1, totalPages: 1 },
      };
      repo.listPendingPayouts.mockResolvedValue(list);

      const result = await service.listPendingPayouts({}, "admin-1");

      expect(result).toEqual(list);
      expect(repo.listPendingPayouts).toHaveBeenCalledWith(1, 10);
    });

    it("forwards custom page and limit to repo", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.listPendingPayouts.mockResolvedValue({
        data: [],
        pagination: { limit: 5, page: 2, total: 0, totalPages: 1 },
      });

      await service.listPendingPayouts({ limit: 5, page: 2 }, "admin-1");

      expect(repo.listPendingPayouts).toHaveBeenCalledWith(2, 5);
    });

    it("throws UNAUTHORIZED when adminId is null", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.requireAdmin.mockImplementation(throwUnauthorized);

      const err = await captureError(service.listPendingPayouts({}, null));

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });
  });
});
