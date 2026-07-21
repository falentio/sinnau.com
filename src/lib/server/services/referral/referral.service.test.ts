import { ORPCError } from "@orpc/server";
import { describe, it } from "vitest";

import type { ReferralGuard } from "./referral.guard.ts";
import { ReferralService } from "./referral.service.ts";
import {
  captureError,
  createMockGuard,
  createMockRepository,
  createReferralProfileFixture,
  createReferralRelationshipFixture,
  createReferralSubscriptionEventFixture,
} from "./referral.testing.ts";

const setupService = () => {
  const repo = createMockRepository();
  const guard = createMockGuard();

  guard.requireUser.mockImplementation((id) => id ?? "fallback-user");

  repo.isSlugTaken.mockResolvedValue(false);
  repo.findProfileByUserId.mockResolvedValue(null);
  repo.findProfileBySlug.mockResolvedValue(null);
  repo.findRelationshipByReferredUserId.mockResolvedValue(null);
  repo.findSubscriptionEventByIdempotencyKey.mockResolvedValue(null);
  repo.updateProfilePoints.mockResolvedValue(null);
  // oxlint-disable-next-line require-await
  repo.insertProfile.mockImplementation(async (row) => ({
    ...createReferralProfileFixture(),
    ...row,
  }));

  // oxlint-disable-next-line require-await
  repo.insertRelationship.mockImplementation(async (row) => ({
    ...createReferralRelationshipFixture(),
    ...row,
  }));

  // oxlint-disable-next-line require-await
  repo.insertSubscriptionEvent.mockImplementation(async (row) => ({
    ...createReferralSubscriptionEventFixture(),
    ...row,
  }));

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const service = new ReferralService(repo, guard as unknown as ReferralGuard);
  return { guard, repo, service };
};

describe.concurrent(ReferralService, () => {
  describe("getOrCreateReferralProfile", () => {
    it("returns existing profile when one already exists", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      const existing = createReferralProfileFixture({
        slug: "existing-slug",
        userId: "user-1",
      });
      repo.findProfileByUserId.mockResolvedValue(existing);

      const result = await service.getOrCreateReferralProfile(
        {},
        "user-1",
        "Test User"
      );
      expect(result).toBe(existing);
      expect(repo.insertProfile).not.toHaveBeenCalled();
    });

    it("creates a new profile when none exists, using the user name for slug", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      const result = await service.getOrCreateReferralProfile(
        {},
        "user-1",
        "Test User"
      );
      expect(repo.insertProfile).toHaveBeenCalled();
      const inserted = repo.insertProfile.mock.calls[0]?.[0];
      expect(inserted?.userId).toBe("user-1");
      expect(inserted?.slug).toMatch(/^test-user-[0-9A-Za-z]{8}$/u);
      expect(inserted?.points).toBe(0);
      expect(inserted?.version).toBe(1);
      expect(result).toBeDefined();
    });

    it("throws VALIDATION_FAILED when userName is empty", async ({
      expect,
    }) => {
      const { service } = setupService();
      const err = await captureError(
        service.getOrCreateReferralProfile({}, "user-1", "")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "VALIDATION_FAILED" });
    });

    it("throws UNAUTHORIZED from guard.requireUser", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.requireUser.mockImplementation(() => {
        throw new ORPCError("UNAUTHORIZED", {
          message: "Authentication is required",
        });
      });
      const err = await captureError(
        service.getOrCreateReferralProfile({}, null, "Test")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });
  });

  describe("resolveReferralSlug", () => {
    it("returns the profile matching the slug", async ({ expect }) => {
      const { repo, service } = setupService();
      const profile = createReferralProfileFixture({ slug: "my-slug" });
      repo.findProfileBySlug.mockResolvedValue(profile);

      const result = await service.resolveReferralSlug({ slug: "my-slug" });
      expect(result).toBe(profile);
    });

    it("throws REFERRAL_SLUG_NOT_FOUND when slug does not exist", async ({
      expect,
    }) => {
      const { service } = setupService();
      const err = await captureError(
        service.resolveReferralSlug({ slug: "no-such" })
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "REFERRAL_SLUG_NOT_FOUND" });
    });
  });

  describe("recordReferralRelationship", () => {
    it("creates a relationship and returns it", async ({ expect }) => {
      const { repo, service } = setupService();
      const result = await service.recordReferralRelationship({
        referredUserId: "referred-1",
        referrerUserId: "referrer-1",
      });
      expect(repo.insertRelationship).toHaveBeenCalledWith(
        expect.objectContaining({
          referredUserId: "referred-1",
          referrerUserId: "referrer-1",
        })
      );
      expect(result.referrerUserId).toBe("referrer-1");
      expect(result.referredUserId).toBe("referred-1");
    });

    it("throws SELF_REFERRAL_NOT_ALLOWED when referrer and referred are the same", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      const err = await captureError(
        service.recordReferralRelationship({
          referredUserId: "same-user",
          referrerUserId: "same-user",
        })
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "SELF_REFERRAL_NOT_ALLOWED" });
      expect(repo.insertRelationship).not.toHaveBeenCalled();
    });

    it("throws REFERRAL_ALREADY_EXISTS when referred user already has a relationship", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findRelationshipByReferredUserId.mockResolvedValue(
        createReferralRelationshipFixture({ referredUserId: "referred-1" })
      );
      const err = await captureError(
        service.recordReferralRelationship({
          referredUserId: "referred-1",
          referrerUserId: "referrer-1",
        })
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "REFERRAL_ALREADY_EXISTS" });
    });
  });

  describe("addReferralPoints", () => {
    const setupAddPoints = () => {
      const { repo, service } = setupService();
      const profile = createReferralProfileFixture({
        points: 100,
        slug: "referrer-slug",
        version: 1,
      });
      const relationship = createReferralRelationshipFixture({
        referredUserId: "referred-1",
        referrerUserId: "referrer-1",
      });
      repo.findProfileByUserId.mockResolvedValue(profile);
      repo.findRelationshipByReferredUserId.mockResolvedValue(relationship);
      repo.updateProfilePoints.mockImplementation(
        async (_id, points, _version) => {
          profile.points = points;
          profile.version += 1;
          return profile;
        }
      );
      return { profile, relationship, repo, service };
    };

    it("awards points and creates subscription event on first idempotency key", async ({
      expect,
    }) => {
      const { repo, service } = setupAddPoints();
      const result = await service.addReferralPoints({
        expectedVersion: 1,
        idempotencyKey: "award-1",
        points: 50,
        referredUserId: "referred-1",
        referrerUserId: "referrer-1",
      });
      expect(repo.insertSubscriptionEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          idempotencyKey: "award-1",
          pointsAwarded: 50,
        })
      );
      expect(repo.updateProfilePoints).toHaveBeenCalled();
      expect(result.points).toBe(150);
      expect(result.version).toBe(2);
    });

    it("returns existing event and profile on duplicate idempotency key (idempotent replay)", async ({
      expect,
    }) => {
      const { repo, service, profile } = setupAddPoints();
      const existingEvent = createReferralSubscriptionEventFixture({
        idempotencyKey: "idem-dup",
        pointsAwarded: 30,
      });
      repo.findSubscriptionEventByIdempotencyKey.mockResolvedValue(
        existingEvent
      );

      const result = await service.addReferralPoints({
        expectedVersion: 1,
        idempotencyKey: "idem-dup",
        points: 30,
        referredUserId: "referred-1",
        referrerUserId: "referrer-1",
      });
      expect(repo.insertSubscriptionEvent).not.toHaveBeenCalled();
      expect(repo.updateProfilePoints).not.toHaveBeenCalled();
      expect(result).toBe(profile);
    });

    it("throws REFERRAL_RELATIONSHIP_NOT_FOUND when no relationship exists", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      const profile = createReferralProfileFixture({ points: 100, version: 1 });
      repo.findProfileByUserId.mockResolvedValue(profile);
      repo.findRelationshipByReferredUserId.mockResolvedValue(null);

      const err = await captureError(
        service.addReferralPoints({
          expectedVersion: 1,
          idempotencyKey: "no-rel",
          points: 50,
          referredUserId: "referred-1",
          referrerUserId: "referrer-1",
        })
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "REFERRAL_RELATIONSHIP_NOT_FOUND" });
    });

    it("throws REFERRAL_PROFILE_NOT_FOUND when referrer profile does not exist", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findProfileByUserId.mockResolvedValue(null);
      repo.findRelationshipByReferredUserId.mockResolvedValue(
        createReferralRelationshipFixture()
      );

      const err = await captureError(
        service.addReferralPoints({
          expectedVersion: 1,
          idempotencyKey: "no-prof",
          points: 50,
          referredUserId: "referred-1",
          referrerUserId: "referrer-1",
        })
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "REFERRAL_PROFILE_NOT_FOUND" });
    });

    it("throws REFERRAL_VERSION_CONFLICT when update fails (optimistic lock)", async ({
      expect,
    }) => {
      const { repo, service } = setupAddPoints();
      repo.updateProfilePoints.mockResolvedValue(null);

      const err = await captureError(
        service.addReferralPoints({
          expectedVersion: 1,
          idempotencyKey: "version-conflict",
          points: 50,
          referredUserId: "referred-1",
          referrerUserId: "referrer-1",
        })
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "REFERRAL_VERSION_CONFLICT" });
    });
  });

  describe("adjustReferralPoints", () => {
    it("adjusts points positively", async ({ expect }) => {
      const { repo, service } = setupService();
      const profile = createReferralProfileFixture({ points: 100, version: 1 });
      repo.findProfileByUserId.mockResolvedValue(profile);
      repo.updateProfilePoints.mockImplementation(
        async (_id, points, _version) => {
          profile.points = points;
          profile.version += 1;
          return profile;
        }
      );

      const result = await service.adjustReferralPoints({
        expectedVersion: 1,
        idempotencyKey: "adj-1",
        points: 50,
        reason: "bonus",
        referrerUserId: "user-1",
      });
      expect(result.points).toBe(150);
    });

    it("adjusts points negatively", async ({ expect }) => {
      const { repo, service } = setupService();
      const profile = createReferralProfileFixture({ points: 100, version: 1 });
      repo.findProfileByUserId.mockResolvedValue(profile);
      repo.updateProfilePoints.mockImplementation(
        async (_id, points, _version) => {
          profile.points = points;
          profile.version += 1;
          return profile;
        }
      );

      const result = await service.adjustReferralPoints({
        expectedVersion: 1,
        idempotencyKey: "adj-2",
        points: -30,
        reason: "correction",
        referrerUserId: "user-1",
      });
      expect(result.points).toBe(70);
    });

    it("throws REFERRAL_POINTS_CONFLICT when adjustment would make balance negative", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      const profile = createReferralProfileFixture({ points: 50, version: 1 });
      repo.findProfileByUserId.mockResolvedValue(profile);

      const err = await captureError(
        service.adjustReferralPoints({
          expectedVersion: 1,
          idempotencyKey: "adj-neg",
          points: -100,
          reason: "too much",
          referrerUserId: "user-1",
        })
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "REFERRAL_POINTS_CONFLICT" });
      expect(repo.updateProfilePoints).not.toHaveBeenCalled();
    });

    it("returns existing event and profile on duplicate idempotency key", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      const profile = createReferralProfileFixture({ points: 100, version: 1 });
      repo.findProfileByUserId.mockResolvedValue(profile);
      const existingEvent = createReferralSubscriptionEventFixture({
        idempotencyKey: "adj-dup",
      });
      repo.findSubscriptionEventByIdempotencyKey.mockResolvedValue(
        existingEvent
      );

      const result = await service.adjustReferralPoints({
        expectedVersion: 1,
        idempotencyKey: "adj-dup",
        points: 50,
        reason: "bonus",
        referrerUserId: "user-1",
      });
      expect(repo.updateProfilePoints).not.toHaveBeenCalled();
      expect(result).toBe(profile);
    });

    it("throws REFERRAL_PROFILE_NOT_FOUND when profile does not exist", async ({
      expect,
    }) => {
      const { service } = setupService();
      const err = await captureError(
        service.adjustReferralPoints({
          expectedVersion: 1,
          idempotencyKey: "adj-404",
          points: 50,
          reason: "bonus",
          referrerUserId: "missing",
        })
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "REFERRAL_PROFILE_NOT_FOUND" });
    });

    it("throws REFERRAL_VERSION_CONFLICT on optimistic lock failure", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      const profile = createReferralProfileFixture({ points: 100, version: 1 });
      repo.findProfileByUserId.mockResolvedValue(profile);
      repo.updateProfilePoints.mockResolvedValue(null);

      const err = await captureError(
        service.adjustReferralPoints({
          expectedVersion: 1,
          idempotencyKey: "adj-lock",
          points: 50,
          reason: "bonus",
          referrerUserId: "user-1",
        })
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "REFERRAL_VERSION_CONFLICT" });
    });
  });

  describe("getMyReferralProfile", () => {
    it("returns profile when it exists", async ({ expect }) => {
      const { repo, service } = setupService();
      const profile = createReferralProfileFixture({ userId: "user-1" });
      repo.findProfileByUserId.mockResolvedValue(profile);

      const result = await service.getMyReferralProfile({ userId: "user-1" });
      expect(result).toBe(profile);
    });

    it("throws REFERRAL_PROFILE_NOT_FOUND when no profile exists", async ({
      expect,
    }) => {
      const { service } = setupService();
      const err = await captureError(
        service.getMyReferralProfile({ userId: "no-profile" })
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "REFERRAL_PROFILE_NOT_FOUND" });
    });
  });
});
