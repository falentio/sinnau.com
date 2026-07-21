import { user } from "$lib/server/infras/db/schema/auth-schema";
import { getTestingDb } from "$lib/server/infras/db/testing";
import { vi } from "vitest";
import type { MockedFunction } from "vitest";

import type { AffiliateGuard } from "./affiliate.guard";
import type {
  AffiliateProfile,
  AffiliateRepository,
} from "./affiliate.repository";
import { AffiliateDrizzleRepository } from "./affiliate.repository.drizzle";

export type MockedAffiliateRepository = {
  [K in keyof AffiliateRepository]: MockedFunction<AffiliateRepository[K]>;
};

export const createMockRepository = (): MockedAffiliateRepository => ({
  findAffiliatedByUserId:
    vi.fn<AffiliateRepository["findAffiliatedByUserId"]>(),
  findConversionByTransactionId:
    vi.fn<AffiliateRepository["findConversionByTransactionId"]>(),
  findProfileBySlug: vi.fn<AffiliateRepository["findProfileBySlug"]>(),
  findProfileByUserId: vi.fn<AffiliateRepository["findProfileByUserId"]>(),
  findUserById: vi.fn<AffiliateRepository["findUserById"]>(),
  getDashboardSummary: vi.fn<AffiliateRepository["getDashboardSummary"]>(),
  insertConversion: vi.fn<AffiliateRepository["insertConversion"]>(),
  insertPayout: vi.fn<AffiliateRepository["insertPayout"]>(),
  insertProfile: vi.fn<AffiliateRepository["insertProfile"]>(),
  listPendingPayouts: vi.fn<AffiliateRepository["listPendingPayouts"]>(),
  markCommissionsAsPaid: vi.fn<AffiliateRepository["markCommissionsAsPaid"]>(),
});

export type MockedAffiliateGuard = {
  [K in keyof AffiliateGuard]: MockedFunction<AffiliateGuard[K]>;
};

export const createMockGuard = (): MockedAffiliateGuard => ({
  requireUser: vi.fn<AffiliateGuard["requireUser"]>(),
  requireAdmin: vi.fn<AffiliateGuard["requireAdmin"]>(),
});

export const createAffiliateProfileFixture = (
  overrides: Partial<AffiliateProfile> = {}
): AffiliateProfile => ({
  createdAt: new Date(),
  id: "aff_abc123def456",
  nameSnapshot: "Test User",
  slug: "test-slug",
  updatedAt: new Date(),
  userId: "user-1",
  ...overrides,
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

export class AffiliateTestEnv implements AsyncDisposable {
  readonly db: ReturnType<typeof getTestingDb>;
  readonly repo: AffiliateDrizzleRepository;
  readonly userId: string;
  readonly otherId: string;

  constructor() {
    this.db = getTestingDb();
    this.repo = new AffiliateDrizzleRepository(this.db);
    this.userId = this.seedUser({ name: "Test User" });
    this.otherId = this.seedUser({ name: "Other User" });
  }

  seedUser(
    options: { id?: string; email?: string; name?: string } = {}
  ): string {
    const id = options.id ?? crypto.randomUUID();
    this.db
      .insert(user)
      .values({
        email: options.email ?? `${id}@test.local`,
        emailVerified: true,
        id,
        name: options.name ?? "Test User",
      })
      .run();
    return id;
  }

  seedReferrer(): string {
    return this.seedUser({ name: "Referrer" });
  }

  seedPurchaser(): string {
    return this.seedUser({ name: "Purchaser" });
  }

  // oxlint-disable-next-line require-await
  async [Symbol.asyncDispose](): Promise<void> {
    this.db.$client.close();
  }
}
