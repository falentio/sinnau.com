import { REFERRAL_ID_PREFIX } from "$lib/schemas/referral";
import { eq } from "drizzle-orm";
import { describe, it } from "vitest";

import { user } from "../../infras/db/schema/auth-schema.ts";
import { generateId } from "../../utils/nanoid.ts";
import { ReferralDrizzleRepository } from "./referral.repository.drizzle.ts";
import { ReferralTestEnv } from "./referral.testing.ts";

describe.concurrent(ReferralDrizzleRepository, () => {
  describe("insertProfile", () => {
    it("inserts a profile and returns it with generated timestamps", async ({
      expect,
    }) => {
      await using env = new ReferralTestEnv();
      const profile = await env.repo.insertProfile({
        id: generateId(REFERRAL_ID_PREFIX),
        points: 0,
        slug: "test-user-abc123",
        userId: env.ownerId,
        version: 1,
      });
      expect(profile.id).toMatch(new RegExp(`^${REFERRAL_ID_PREFIX}_`, "u"));
      expect(profile.userId).toBe(env.ownerId);
      expect(profile.slug).toBe("test-user-abc123");
      expect(profile.points).toBe(0);
      expect(profile.version).toBe(1);
      expect(profile.createdAt).toBeInstanceOf(Date);
      expect(profile.updatedAt).toBeInstanceOf(Date);
    });

    it("inserts a profile with non-default points and version", async ({
      expect,
    }) => {
      await using env = new ReferralTestEnv();
      const profile = await env.repo.insertProfile({
        id: generateId(REFERRAL_ID_PREFIX),
        points: 500,
        slug: "rich-user-abc123",
        userId: env.ownerId,
        version: 3,
      });
      expect(profile.points).toBe(500);
      expect(profile.version).toBe(3);
    });
  });

  describe("findProfileByUserId", () => {
    it("returns profile when it exists", async ({ expect }) => {
      await using env = new ReferralTestEnv();
      const seeded = await env.seedProfile({
        slug: "owner-slug",
        userId: env.ownerId,
      });
      const found = await env.repo.findProfileByUserId(env.ownerId);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(seeded.id);
      expect(found?.slug).toBe("owner-slug");
    });

    it("returns null when no profile exists for user", async ({ expect }) => {
      await using env = new ReferralTestEnv();
      const found = await env.repo.findProfileByUserId("non-existent-user");
      expect(found).toBeNull();
    });
  });

  describe("findProfileBySlug", () => {
    it("returns profile matching the slug", async ({ expect }) => {
      await using env = new ReferralTestEnv();
      await env.seedProfile({ slug: "cool-slug", userId: env.ownerId });
      const found = await env.repo.findProfileBySlug("cool-slug");
      expect(found).not.toBeNull();
      expect(found?.slug).toBe("cool-slug");
    });

    it("matches case-insensitively", async ({ expect }) => {
      await using env = new ReferralTestEnv();
      await env.seedProfile({ slug: "case-sensitive", userId: env.ownerId });
      const found = await env.repo.findProfileBySlug("CASE-SENSITIVE");
      expect(found).not.toBeNull();
      expect(found?.slug).toBe("case-sensitive");
    });

    it("returns null when slug does not exist", async ({ expect }) => {
      await using env = new ReferralTestEnv();
      const found = await env.repo.findProfileBySlug("no-such-slug");
      expect(found).toBeNull();
    });
  });

  describe("updateProfilePoints", () => {
    it("updates points and increments version when expectedVersion matches", async ({
      expect,
    }) => {
      await using env = new ReferralTestEnv();
      const seeded = await env.seedProfile({
        points: 100,
        slug: "update-me",
        userId: env.ownerId,
        version: 1,
      });
      const updated = await env.repo.updateProfilePoints(seeded.id, 200, 1);
      expect(updated).not.toBeNull();
      expect(updated?.points).toBe(200);
      expect(updated?.version).toBe(2);
    });

    it("returns null when expectedVersion does not match (optimistic lock)", async ({
      expect,
    }) => {
      await using env = new ReferralTestEnv();
      const seeded = await env.seedProfile({
        points: 100,
        slug: "version-conflict",
        userId: env.ownerId,
        version: 2,
      });
      const updated = await env.repo.updateProfilePoints(seeded.id, 200, 1);
      expect(updated).toBeNull();
    });

    it("returns null when profile id does not exist", async ({ expect }) => {
      await using env = new ReferralTestEnv();
      const updated = await env.repo.updateProfilePoints(
        "non-existent-id",
        200,
        1
      );
      expect(updated).toBeNull();
    });

    it("increments version on each successful update", async ({ expect }) => {
      await using env = new ReferralTestEnv();
      const seeded = await env.seedProfile({
        points: 100,
        slug: "sequential",
        userId: env.ownerId,
        version: 1,
      });

      const first = await env.repo.updateProfilePoints(seeded.id, 200, 1);
      expect(first?.version).toBe(2);

      const second = await env.repo.updateProfilePoints(seeded.id, 300, 2);
      expect(second?.version).toBe(3);

      const third = await env.repo.updateProfilePoints(seeded.id, 400, 3);
      expect(third?.version).toBe(4);
    });
  });

  describe("isSlugTaken", () => {
    it("returns true when slug exists", async ({ expect }) => {
      await using env = new ReferralTestEnv();
      await env.seedProfile({ slug: "taken-slug", userId: env.ownerId });
      expect(await env.repo.isSlugTaken("taken-slug")).toBe(true);
    });

    it("returns true case-insensitively", async ({ expect }) => {
      await using env = new ReferralTestEnv();
      await env.seedProfile({ slug: "mixed-case", userId: env.ownerId });
      expect(await env.repo.isSlugTaken("MIXED-CASE")).toBe(true);
    });

    it("returns false when slug is available", async ({ expect }) => {
      await using env = new ReferralTestEnv();
      expect(await env.repo.isSlugTaken("free-slug")).toBe(false);
    });
  });

  describe("insertRelationship", () => {
    it("inserts a relationship and returns it", async ({ expect }) => {
      await using env = new ReferralTestEnv();
      const rel = await env.repo.insertRelationship({
        id: generateId(REFERRAL_ID_PREFIX),
        referredUserId: env.otherId,
        referrerUserId: env.ownerId,
      });
      expect(rel.referrerUserId).toBe(env.ownerId);
      expect(rel.referredUserId).toBe(env.otherId);
      expect(rel.createdAt).toBeInstanceOf(Date);
    });
  });

  describe("findRelationshipByReferredUserId", () => {
    it("returns relationship when referred user has one", async ({
      expect,
    }) => {
      await using env = new ReferralTestEnv();
      await env.seedRelationship({
        referredUserId: env.otherId,
        referrerUserId: env.ownerId,
      });
      const found = await env.repo.findRelationshipByReferredUserId(
        env.otherId
      );
      expect(found).not.toBeNull();
      expect(found?.referrerUserId).toBe(env.ownerId);
    });

    it("returns null when referred user has no relationship", async ({
      expect,
    }) => {
      await using env = new ReferralTestEnv();
      const found =
        await env.repo.findRelationshipByReferredUserId("no-relation-user");
      expect(found).toBeNull();
    });
  });

  describe("insertSubscriptionEvent", () => {
    it("inserts a subscription event and returns it", async ({ expect }) => {
      await using env = new ReferralTestEnv();
      const rel = await env.seedRelationship({
        referredUserId: env.otherId,
        referrerUserId: env.ownerId,
      });
      const event = await env.repo.insertSubscriptionEvent({
        id: generateId(REFERRAL_ID_PREFIX),
        idempotencyKey: "sub-event-1",
        pointsAwarded: 100,
        referredUserId: env.otherId,
        referrerUserId: env.ownerId,
        relationshipId: rel.id,
      });
      expect(event.idempotencyKey).toBe("sub-event-1");
      expect(event.pointsAwarded).toBe(100);
      expect(event.relationshipId).toBe(rel.id);
      expect(event.createdAt).toBeInstanceOf(Date);
    });
  });

  describe("findSubscriptionEventByIdempotencyKey", () => {
    it("returns event when key exists", async ({ expect }) => {
      await using env = new ReferralTestEnv();
      const rel = await env.seedRelationship({
        referredUserId: env.otherId,
        referrerUserId: env.ownerId,
      });
      await env.seedSubscriptionEvent({
        idempotencyKey: "idem-key-1",
        pointsAwarded: 50,
        referredUserId: env.otherId,
        referrerUserId: env.ownerId,
        relationshipId: rel.id,
      });
      const found =
        await env.repo.findSubscriptionEventByIdempotencyKey("idem-key-1");
      expect(found).not.toBeNull();
      expect(found?.pointsAwarded).toBe(50);
    });

    it("returns null when key does not exist", async ({ expect }) => {
      await using env = new ReferralTestEnv();
      const found =
        await env.repo.findSubscriptionEventByIdempotencyKey("unknown-key");
      expect(found).toBeNull();
    });
  });
});

describe.concurrent("ReferralDrizzleRepository (schema constraints)", () => {
  it("rejects duplicate userId on referral_profile", async ({ expect }) => {
    await using env = new ReferralTestEnv();
    await env.seedProfile({ slug: "slug-a", userId: env.ownerId });
    await expect(
      env.repo.insertProfile({
        id: generateId(REFERRAL_ID_PREFIX),
        points: 0,
        slug: "slug-b",
        userId: env.ownerId,
        version: 1,
      })
    ).rejects.toThrow();
  });

  it("rejects duplicate slug case-insensitively", async ({ expect }) => {
    await using env = new ReferralTestEnv();
    await env.seedProfile({ slug: "duplicate-slug", userId: env.ownerId });
    await expect(
      env.repo.insertProfile({
        id: generateId(REFERRAL_ID_PREFIX),
        points: 0,
        slug: "DUPLICATE-SLUG",
        userId: env.otherId,
        version: 1,
      })
    ).rejects.toThrow();
  });

  it("rejects duplicate referredUserId on referral_relationship", async ({
    expect,
  }) => {
    await using env = new ReferralTestEnv();
    await env.seedRelationship({
      referredUserId: env.otherId,
      referrerUserId: env.ownerId,
    });
    await expect(
      env.repo.insertRelationship({
        id: generateId(REFERRAL_ID_PREFIX),
        referredUserId: env.otherId,
        referrerUserId: generateId(REFERRAL_ID_PREFIX),
      })
    ).rejects.toThrow();
  });

  it("rejects duplicate idempotencyKey on referral_subscription_event", async ({
    expect,
  }) => {
    await using env = new ReferralTestEnv();
    const rel = await env.seedRelationship({
      referredUserId: env.otherId,
      referrerUserId: env.ownerId,
    });
    await env.seedSubscriptionEvent({
      idempotencyKey: "dup-key",
      pointsAwarded: 100,
      referredUserId: env.otherId,
      referrerUserId: env.ownerId,
      relationshipId: rel.id,
    });
    await expect(
      env.repo.insertSubscriptionEvent({
        id: generateId(REFERRAL_ID_PREFIX),
        idempotencyKey: "dup-key",
        pointsAwarded: 200,
        referredUserId: env.otherId,
        referrerUserId: env.ownerId,
        relationshipId: rel.id,
      })
    ).rejects.toThrow();
  });

  it("cascade-deletes profile when user is deleted", async ({ expect }) => {
    await using env = new ReferralTestEnv();
    const userId = env.seedUser({ name: "Cascade Test" });
    await env.seedProfile({ slug: "cascade-test", userId });

    const found = await env.repo.findProfileByUserId(userId);
    expect(found).not.toBeNull();

    env.db.delete(user).where(eq(user.id, userId)).run();

    const afterDelete = await env.repo.findProfileByUserId(userId);
    expect(afterDelete).toBeNull();
  });
});
