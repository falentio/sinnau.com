import {
  affiliateApplication,
  affiliatePayoutAccount,
} from "$lib/server/infras/db/schema/affiliate";
import { user } from "$lib/server/infras/db/schema/auth-schema";
import { order, payment } from "$lib/server/infras/db/schema/plan";
import type {
  OrderStatus,
  PaymentGateway,
  PaymentStatus,
  PlanDuration,
  PlanKey,
} from "$lib/server/infras/db/schema/plan";
import { getTestingDb } from "$lib/server/infras/db/testing";
import QuickLRU from "quick-lru";
import { vi } from "vitest";
import type { MockedFunction } from "vitest";

import type { UserRepository } from "../user/user.repository";
import type { AffiliateGuard } from "./affiliate.guard";
import type {
  AffiliateApplication,
  AffiliatePayoutAccount,
  AffiliateProfile,
  AffiliateRepository,
} from "./affiliate.repository";
import { AffiliateDrizzleRepository } from "./affiliate.repository.drizzle";

export type MockedAffiliateRepository = {
  [K in keyof AffiliateRepository]: MockedFunction<AffiliateRepository[K]>;
};

export const createMockRepository = (): MockedAffiliateRepository => ({
  backfillCommissions: vi.fn<AffiliateRepository["backfillCommissions"]>(),
  createPayoutForAffiliate:
    vi.fn<AffiliateRepository["createPayoutForAffiliate"]>(),
  findAffiliatedByUserId:
    vi.fn<AffiliateRepository["findAffiliatedByUserId"]>(),
  findApplicationById: vi.fn<AffiliateRepository["findApplicationById"]>(),
  findConversionByTransactionId:
    vi.fn<AffiliateRepository["findConversionByTransactionId"]>(),
  findInvalidCommissions:
    vi.fn<AffiliateRepository["findInvalidCommissions"]>(),
  findLatestApplicationByUserId:
    vi.fn<AffiliateRepository["findLatestApplicationByUserId"]>(),
  findMissingCommissions:
    vi.fn<AffiliateRepository["findMissingCommissions"]>(),
  findPayoutAccountByUserId:
    vi.fn<AffiliateRepository["findPayoutAccountByUserId"]>(),
  findPendingApplicationByUserId:
    vi.fn<AffiliateRepository["findPendingApplicationByUserId"]>(),
  findProfileBySlug: vi.fn<AffiliateRepository["findProfileBySlug"]>(),
  findProfileByUserId: vi.fn<AffiliateRepository["findProfileByUserId"]>(),
  findUserById: vi.fn<AffiliateRepository["findUserById"]>(),
  getDashboardSummary: vi.fn<AffiliateRepository["getDashboardSummary"]>(),
  insertApplication: vi.fn<AffiliateRepository["insertApplication"]>(),
  insertConversion: vi.fn<AffiliateRepository["insertConversion"]>(),
  insertProfile: vi.fn<AffiliateRepository["insertProfile"]>(),
  listApplications: vi.fn<AffiliateRepository["listApplications"]>(),
  listPendingPayouts: vi.fn<AffiliateRepository["listPendingPayouts"]>(),
  updateApplicationStatus:
    vi.fn<AffiliateRepository["updateApplicationStatus"]>(),
  updateProfileBalance: vi.fn<AffiliateRepository["updateProfileBalance"]>(),
  updateUserAffiliatedBy:
    vi.fn<AffiliateRepository["updateUserAffiliatedBy"]>(),
  upsertPayoutAccount: vi.fn<AffiliateRepository["upsertPayoutAccount"]>(),
});

export type MockedUserRepository = {
  [K in keyof UserRepository]: MockedFunction<UserRepository[K]>;
};

export const createMockUserRepository = (): MockedUserRepository => ({
  findUserById: vi.fn<UserRepository["findUserById"]>(),
});

export type MockedAffiliateGuard = {
  [K in keyof AffiliateGuard]: MockedFunction<AffiliateGuard[K]>;
};

export const createMockGuard = (): MockedAffiliateGuard => ({
  requireAdmin: vi.fn<AffiliateGuard["requireAdmin"]>(),
  requireUser: vi.fn<AffiliateGuard["requireUser"]>(),
});

export const createSlugCache = (): QuickLRU<string, { userId: string }> =>
  new QuickLRU({ maxSize: 10 });

export const createAffiliateApplicationFixture = (
  overrides: Partial<AffiliateApplication> = {}
): AffiliateApplication => ({
  advantage: "I have a large following and can promote your product",
  createdAt: new Date(),
  id: "afa_abc123def456",
  instagramHandle: null,
  reviewedAt: null,
  reviewedByAdminId: null,
  status: "PENDING",
  tiktokHandle: null,
  updatedAt: new Date(),
  userId: "user-1",
  youtubeHandle: null,
  ...overrides,
});

export const createAffiliateProfileFixture = (
  overrides: Partial<AffiliateProfile> = {}
): AffiliateProfile => ({
  createdAt: new Date(),
  id: "aff_abc123def456",
  nameSnapshot: "Test User",
  points: 0,
  slug: "test-slug",
  updatedAt: new Date(),
  userId: "user-1",
  version: 1,
  ...overrides,
});

export const createAffiliatePayoutAccountFixture = (
  overrides: Partial<AffiliatePayoutAccount> = {}
): AffiliatePayoutAccount => ({
  accountHolderName: "Test User",
  accountNumber: "1234567890",
  bankName: null,
  createdAt: new Date(),
  id: "afpa_abc123def456",
  method: "GOPAY",
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
    options: {
      id?: string;
      email?: string;
      name?: string;
      affiliatedBy?: string | null;
    } = {}
  ): string {
    const id = options.id ?? crypto.randomUUID();
    this.db
      .insert(user)
      .values({
        affiliatedBy: options.affiliatedBy ?? null,
        email: options.email ?? `${id}@test.local`,
        emailVerified: true,
        id,
        name: options.name ?? "Test User",
      })
      .run();
    return id;
  }

  seedApplication(options: {
    id?: string;
    userId: string;
    advantage?: string;
    instagramHandle?: string | null;
    tiktokHandle?: string | null;
    youtubeHandle?: string | null;
    status?: "PENDING" | "ACCEPTED" | "REJECTED";
    reviewedByAdminId?: string | null;
    reviewedAt?: Date | null;
    createdAt?: Date;
  }): string {
    const id = options.id ?? `afa_${crypto.randomUUID()}`;
    this.db
      .insert(affiliateApplication)
      .values({
        advantage:
          options.advantage ??
          "I have a large following and can promote your product",
        createdAt: options.createdAt ?? new Date(),
        id,
        instagramHandle: options.instagramHandle ?? null,
        reviewedAt: options.reviewedAt ?? null,
        reviewedByAdminId: options.reviewedByAdminId ?? null,
        status: options.status ?? "PENDING",
        tiktokHandle: options.tiktokHandle ?? null,
        userId: options.userId,
        youtubeHandle: options.youtubeHandle ?? null,
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

  seedOrder(options: {
    id?: string;
    userId: string;
    grossAmount?: number;
    status?: OrderStatus;
    planKey?: PlanKey;
    sku?: string;
    durationMonths?: PlanDuration;
  }): string {
    const id = options.id ?? `ord_${crypto.randomUUID()}`;
    this.db
      .insert(order)
      .values({
        durationMonths: options.durationMonths ?? 1,
        grossAmount: options.grossAmount ?? 100_000,
        id,
        planKey: options.planKey ?? "PLUS",
        sku: options.sku ?? "sku-test",
        status: options.status ?? "PAID",
        userId: options.userId,
      })
      .run();
    return id;
  }

  seedPayment(options: {
    id?: string;
    orderId: string;
    userId: string;
    gatewayTransactionId?: string | null;
    amount?: number;
    status?: PaymentStatus;
    gateway?: PaymentGateway;
    gatewayOrderId?: string;
  }): string {
    const id = options.id ?? `pay_${crypto.randomUUID()}`;
    this.db
      .insert(payment)
      .values({
        amount: options.amount ?? 100_000,
        gateway: options.gateway ?? "midtrans",
        gatewayOrderId: options.gatewayOrderId ?? `go_${id}`,
        gatewayTransactionId: options.gatewayTransactionId ?? null,
        id,
        orderId: options.orderId,
        status: options.status ?? "SUCCESS",
        userId: options.userId,
      })
      .run();
    return id;
  }

  seedPayoutAccount(options: {
    id?: string;
    userId: string;
    method?: "GOPAY" | "BANK";
    bankName?: string | null;
    accountNumber?: string;
    accountHolderName?: string;
  }): string {
    const id = options.id ?? `afpa_${crypto.randomUUID()}`;
    this.db
      .insert(affiliatePayoutAccount)
      .values({
        accountHolderName: options.accountHolderName ?? "Test User",
        accountNumber: options.accountNumber ?? "1234567890",
        bankName: options.bankName ?? null,
        id,
        method: options.method ?? "GOPAY",
        userId: options.userId,
      })
      .run();
    return id;
  }

  // oxlint-disable-next-line require-await
  async [Symbol.asyncDispose](): Promise<void> {
    this.db.$client.close();
  }
}
