import { REFERRAL_ID_PREFIX } from "$lib/schemas/referral";
import { user } from "$lib/server/infras/db/schema/auth-schema";
import { getTestingDb } from "$lib/server/infras/db/testing";
import { vi } from "vitest";
import type { MockedFunction } from "vitest";

import type {
  InsertReferralProfile,
  InsertReferralRelationship,
  InsertReferralSubscriptionEvent,
  ReferralProfile,
  ReferralRelationship,
  ReferralSubscriptionEvent,
} from "../../infras/db/schema/referral.ts";
import { generateId } from "../../utils/nanoid.ts";
import type { ReferralGuard } from "./referral.guard.ts";
import { ReferralDrizzleRepository } from "./referral.repository.drizzle.ts";
import type { ReferralRepository } from "./referral.repository.ts";

export type MockedReferralRepository = {
  [K in keyof ReferralRepository]: MockedFunction<ReferralRepository[K]>;
};

export const createMockRepository = (): MockedReferralRepository => ({
  findProfileBySlug: vi.fn<ReferralRepository["findProfileBySlug"]>(),
  findProfileByUserId: vi.fn<ReferralRepository["findProfileByUserId"]>(),
  findRelationshipByReferredUserId:
    vi.fn<ReferralRepository["findRelationshipByReferredUserId"]>(),
  findSubscriptionEventByIdempotencyKey:
    vi.fn<ReferralRepository["findSubscriptionEventByIdempotencyKey"]>(),
  insertProfile: vi.fn<ReferralRepository["insertProfile"]>(),
  insertRelationship: vi.fn<ReferralRepository["insertRelationship"]>(),
  insertSubscriptionEvent:
    vi.fn<ReferralRepository["insertSubscriptionEvent"]>(),
  isSlugTaken: vi.fn<ReferralRepository["isSlugTaken"]>(),
  updateProfilePoints: vi.fn<ReferralRepository["updateProfilePoints"]>(),
});

export type MockedReferralGuard = {
  [K in keyof ReferralGuard]: MockedFunction<ReferralGuard[K]>;
};

export const createMockGuard = (): MockedReferralGuard => ({
  requireUser: vi.fn<ReferralGuard["requireUser"]>(),
});

export const createReferralProfileFixture = (
  overrides: Partial<ReferralProfile> = {}
): ReferralProfile => ({
  createdAt: new Date(),
  id: generateId(REFERRAL_ID_PREFIX),
  points: 0,
  slug: "test-slug-abc123",
  updatedAt: new Date(),
  userId: "user-1",
  version: 1,
  ...overrides,
});

export const createReferralRelationshipFixture = (
  overrides: Partial<ReferralRelationship> = {}
): ReferralRelationship => ({
  createdAt: new Date(),
  id: generateId(REFERRAL_ID_PREFIX),
  referredUserId: "referred-1",
  referrerUserId: "referrer-1",
  ...overrides,
});

export const createReferralSubscriptionEventFixture = (
  overrides: Partial<ReferralSubscriptionEvent> = {}
): ReferralSubscriptionEvent => ({
  createdAt: new Date(),
  id: generateId(REFERRAL_ID_PREFIX),
  idempotencyKey: "idem-1",
  pointsAwarded: 100,
  referredUserId: "referred-1",
  referrerUserId: "referrer-1",
  relationshipId: generateId(REFERRAL_ID_PREFIX),
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

interface SeedUserOptions {
  id?: string;
  email?: string;
  name?: string;
}

export class ReferralTestEnv implements AsyncDisposable {
  readonly db: ReturnType<typeof getTestingDb>;
  readonly repo: ReferralDrizzleRepository;
  readonly ownerId: string;
  readonly otherId: string;

  constructor() {
    this.db = getTestingDb();
    this.repo = new ReferralDrizzleRepository(this.db);
    this.ownerId = this.seedUser({ name: "Owner" });
    this.otherId = this.seedUser({ name: "Other" });
  }

  seedUser(options: SeedUserOptions = {}): string {
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

  async seedProfile(
    overrides: Partial<ReferralProfile> = {}
  ): Promise<ReferralProfile> {
    const id = overrides.id ?? generateId(REFERRAL_ID_PREFIX);
    return await this.repo.insertProfile({
      id,
      points: overrides.points ?? 0,
      slug: overrides.slug ?? `slug-${id.slice(0, 8)}`,
      userId: overrides.userId ?? "seed-user",
      version: overrides.version ?? 1,
    } satisfies Omit<InsertReferralProfile, "createdAt" | "updatedAt">);
  }

  async seedRelationship(
    overrides: Partial<ReferralRelationship> = {}
  ): Promise<ReferralRelationship> {
    const id = overrides.id ?? generateId(REFERRAL_ID_PREFIX);
    return await this.repo.insertRelationship({
      id,
      referredUserId: overrides.referredUserId ?? "referred-1",
      referrerUserId: overrides.referrerUserId ?? "referrer-1",
    } satisfies Omit<InsertReferralRelationship, "createdAt">);
  }

  async seedSubscriptionEvent(
    overrides: Partial<ReferralSubscriptionEvent> = {}
  ): Promise<ReferralSubscriptionEvent> {
    const id = overrides.id ?? generateId(REFERRAL_ID_PREFIX);
    return await this.repo.insertSubscriptionEvent({
      id,
      idempotencyKey: overrides.idempotencyKey ?? `idem-${id}`,
      pointsAwarded: overrides.pointsAwarded ?? 100,
      referredUserId: overrides.referredUserId ?? "referred-1",
      referrerUserId: overrides.referrerUserId ?? "referrer-1",
      relationshipId:
        overrides.relationshipId ?? generateId(REFERRAL_ID_PREFIX),
    } satisfies Omit<InsertReferralSubscriptionEvent, "createdAt">);
  }

  // oxlint-disable-next-line require-await
  async [Symbol.asyncDispose](): Promise<void> {
    this.db.$client.close();
  }
}
