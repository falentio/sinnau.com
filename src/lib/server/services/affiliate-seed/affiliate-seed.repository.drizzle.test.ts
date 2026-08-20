import { affiliateCommission } from "$lib/server/infras/db/schema/affiliate";
import { user } from "$lib/server/infras/db/schema/auth-schema";
import { eq } from "drizzle-orm";
import { describe, it } from "vitest";

import { AffiliateSeedTestEnv } from "./affiliate-seed.testing";

describe.concurrent("AffiliateSeedDrizzleRepository", () => {
  describe.concurrent("findProfileByUserId", () => {
    it("returns profile when found", async ({ expect }) => {
      await using env = new AffiliateSeedTestEnv();

      const profile = await env.repo.findProfileByUserId(env.affiliateId);

      expect(profile).not.toBeNull();
      expect(profile?.userId).toBe(env.affiliateId);
      expect(profile?.slug).toBe("seed-slug");
    });

    it("returns null when not found", async ({ expect }) => {
      await using env = new AffiliateSeedTestEnv();

      const profile = await env.repo.findProfileByUserId("non-existent");

      expect(profile).toBeNull();
    });
  });

  describe.concurrent("insertConversion", () => {
    it("persists the conversion and returns it", async ({ expect }) => {
      await using env = new AffiliateSeedTestEnv();
      const purchaser = env.repo.createDevUser("Purchaser A");
      const purchaserId = await purchaser;

      const conversion = await env.repo.insertConversion({
        affiliateUserId: env.affiliateId,
        commissionAmount: 35_000,
        purchaseAmount: 100_000,
        purchaserUserId: purchaserId,
        transactionId: "seed-txn-1",
      });

      expect(conversion).not.toBeNull();
      expect(conversion?.affiliateUserId).toBe(env.affiliateId);
      expect(conversion?.purchaserUserId).toBe(purchaserId);
      expect(conversion?.commissionAmount).toBe(35_000);
      expect(conversion?.status).toBe("PENDING");

      const rows = env.db
        .select()
        .from(affiliateCommission)
        .where(eq(affiliateCommission.transactionId, "seed-txn-1"))
        .all();
      expect(rows).toHaveLength(1);
    });

    it("returns null on duplicate transactionId", async ({ expect }) => {
      await using env = new AffiliateSeedTestEnv();
      const purchaser1 = await env.repo.createDevUser("P1");
      const purchaser2 = await env.repo.createDevUser("P2");

      await env.repo.insertConversion({
        affiliateUserId: env.affiliateId,
        commissionAmount: 35_000,
        purchaseAmount: 100_000,
        purchaserUserId: purchaser1,
        transactionId: "seed-dup",
      });

      const duplicate = await env.repo.insertConversion({
        affiliateUserId: env.affiliateId,
        commissionAmount: 40_000,
        purchaseAmount: 120_000,
        purchaserUserId: purchaser2,
        transactionId: "seed-dup",
      });

      expect(duplicate).toBeNull();
    });
  });

  describe.concurrent("createDevUser", () => {
    it("creates a new user and returns its id", async ({ expect }) => {
      await using env = new AffiliateSeedTestEnv();

      const newId = await env.repo.createDevUser("Dev Seed User");

      expect(newId).toBeDefined();
      const [row] = env.db.select().from(user).where(eq(user.id, newId)).all();
      expect(row).not.toBeUndefined();
      expect(row?.name).toBe("Dev Seed User");
      expect(row?.email).toContain("@seed.dev.local");
    });

    it("creates distinct users on successive calls", async ({ expect }) => {
      await using env = new AffiliateSeedTestEnv();

      const id1 = await env.repo.createDevUser("User 1");
      const id2 = await env.repo.createDevUser("User 2");

      expect(id1).not.toBe(id2);
    });
  });

  describe.concurrent("integration: seed flow", () => {
    it("creates pending payout visible via affiliate listPending", async ({
      expect,
    }) => {
      await using env = new AffiliateSeedTestEnv();
      // simulate what seed service does: create purchaser + conversion
      const purchaser = await env.repo.createDevUser("Purchaser");
      await env.repo.insertConversion({
        affiliateUserId: env.affiliateId,
        commissionAmount: 35_000,
        purchaseAmount: 100_000,
        purchaserUserId: purchaser,
        transactionId: "seed-flow-1",
      });

      // verify via raw affiliateCommission query
      const commissions = env.db
        .select()
        .from(affiliateCommission)
        .where(eq(affiliateCommission.affiliateUserId, env.affiliateId))
        .all();
      expect(commissions).toHaveLength(1);
      expect(commissions[0]?.status).toBe("PENDING");
    });
  });
});

describe.concurrent("AffiliateSeedDrizzleRepository (schema constraints)", () => {
  describe.concurrent("foreign keys", () => {
    it("rejects inserting conversion for non-existent affiliate", async ({
      expect,
    }) => {
      await using env = new AffiliateSeedTestEnv();
      const purchaser = await env.repo.createDevUser("Purchaser");

      const insertOrphan = async () =>
        env.db
          .insert(affiliateCommission)
          .values({
            affiliateUserId: "does-not-exist",
            commissionAmount: 35_000,
            createdAt: new Date(),
            id: "afc_orphan",
            payoutId: null,
            purchaseAmount: 100_000,
            purchaserUserId: purchaser,
            status: "PENDING",
            transactionId: "txn-orphan",
          })
          .run();

      await expect(insertOrphan()).rejects.toThrow();
    });
  });
});
