import { affiliateProfile } from "$lib/server/infras/db/schema/affiliate";
import { user } from "$lib/server/infras/db/schema/auth-schema";
import { getTestingDb } from "$lib/server/infras/db/testing";
import { vi } from "vitest";
import type { MockedFunction } from "vitest";

import type { AffiliateSeedGuard } from "./affiliate-seed.guard";
import type { AffiliateSeedRepository } from "./affiliate-seed.repository";
import { AffiliateSeedDrizzleRepository } from "./affiliate-seed.repository.drizzle";

export type MockedAffiliateSeedRepository = {
  [K in keyof AffiliateSeedRepository]: MockedFunction<
    AffiliateSeedRepository[K]
  >;
};

export const createMockSeedRepository = (): MockedAffiliateSeedRepository => ({
  createDevUser: vi.fn<AffiliateSeedRepository["createDevUser"]>(),
  findProfileByUserId: vi.fn<AffiliateSeedRepository["findProfileByUserId"]>(),
  insertConversion: vi.fn<AffiliateSeedRepository["insertConversion"]>(),
});

export type MockedAffiliateSeedGuard = {
  [K in keyof AffiliateSeedGuard]: MockedFunction<AffiliateSeedGuard[K]>;
};

export const createMockSeedGuard = (): MockedAffiliateSeedGuard => ({
  requireAdmin: vi.fn<AffiliateSeedGuard["requireAdmin"]>(),
  requireUser: vi.fn<AffiliateSeedGuard["requireUser"]>(),
});

export const captureError = async (
  promise: Promise<unknown>
): Promise<unknown> => {
  try {
    await promise;
    return null;
  } catch (error) {
    return error;
  }
};

export class AffiliateSeedTestEnv implements AsyncDisposable {
  readonly db: ReturnType<typeof getTestingDb>;
  readonly repo: AffiliateSeedDrizzleRepository;
  readonly adminId: string;
  readonly affiliateId: string;

  constructor() {
    this.db = getTestingDb();
    this.repo = new AffiliateSeedDrizzleRepository(this.db);
    this.adminId = this.seedUser({ name: "Admin", role: "admin" });
    this.affiliateId = this.seedUser({ name: "Affiliate" });
    this.seedProfile(this.affiliateId, "seed-slug", "Affiliate");
  }

  seedUser(
    options: {
      id?: string;
      name?: string;
      role?: string;
    } = {}
  ): string {
    const id = options.id ?? crypto.randomUUID();
    this.db
      .insert(user)
      .values({
        email: `${id}@test.local`,
        emailVerified: true,
        id,
        name: options.name ?? "Test User",
        role: options.role ?? "user",
      })
      .run();
    return id;
  }

  seedProfile(userId: string, slug: string, nameSnapshot: string): string {
    const id = `aff_${crypto.randomUUID()}`;
    this.db
      .insert(affiliateProfile)
      .values({ id, nameSnapshot, slug, userId })
      .run();
    return id;
  }

  // oxlint-disable-next-line require-await
  async [Symbol.asyncDispose](): Promise<void> {
    this.db.$client.close();
  }
}
