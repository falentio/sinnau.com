import {
  ORDER_ID_PREFIX,
  PAYMENT_ID_PREFIX,
  PLAN_ID_PREFIX,
} from "$lib/schemas/plan.constant";
import { user } from "$lib/server/infras/db/schema/auth-schema";
import { getTestingDb } from "$lib/server/infras/db/testing";
import { vi } from "vitest";
import type { MockedFunction } from "vitest";

import type { Order, Payment, UserPlan } from "../../infras/db/schema/plan.ts";
import { generateId } from "../../utils/nanoid.ts";
import type { PlanGuard } from "./plan.guard.ts";
import { PlanDrizzleRepository } from "./plan.repository.drizzle";
import type { OrderListResult, PlanRepository } from "./plan.repository.ts";

export type MockedPlanRepository = {
  [K in keyof PlanRepository]: MockedFunction<PlanRepository[K]>;
};

export const createMockRepository = (): MockedPlanRepository => ({
  deleteUserPlan: vi.fn<PlanRepository["deleteUserPlan"]>(),
  findActiveUserPlan: vi.fn<PlanRepository["findActiveUserPlan"]>(),
  findOrderById: vi.fn<PlanRepository["findOrderById"]>(),
  findOrdersByUser: vi.fn<PlanRepository["findOrdersByUser"]>(),
  findPaidOrdersForUser: vi.fn<PlanRepository["findPaidOrdersForUser"]>(),
  findPaymentByOrderId: vi.fn<PlanRepository["findPaymentByOrderId"]>(),
  findPaymentByTransactionId:
    vi.fn<PlanRepository["findPaymentByTransactionId"]>(),
  insertOrder: vi.fn<PlanRepository["insertOrder"]>(),
  insertPayment: vi.fn<PlanRepository["insertPayment"]>(),
  setOrderAppliedAt: vi.fn<PlanRepository["setOrderAppliedAt"]>(),
  updateOrderStatus: vi.fn<PlanRepository["updateOrderStatus"]>(),
  updatePayment: vi.fn<PlanRepository["updatePayment"]>(),
  upsertUserPlan: vi.fn<PlanRepository["upsertUserPlan"]>(),
});

export type MockedPlanGuard = {
  [K in keyof PlanGuard]: MockedFunction<PlanGuard[K]>;
};

export const createMockGuard = (): MockedPlanGuard => ({
  assertOrderVisibleByIdOrNotFound:
    vi.fn<PlanGuard["assertOrderVisibleByIdOrNotFound"]>(),
  requireOwner: vi.fn<PlanGuard["requireOwner"]>(),
});

export const createUserPlanFixture = (
  overrides: Partial<UserPlan> = {}
): UserPlan => ({
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  id: generateId(PLAN_ID_PREFIX),
  planKey: "LITE",
  startedAt: new Date(),
  updatedAt: new Date(),
  userId: "owner-1",
  ...overrides,
});

export const createOrderFixture = (overrides: Partial<Order> = {}): Order => ({
  appliedAt: null,
  createdAt: new Date(),
  durationMonths: 1,
  expiresAt: null,
  grossAmount: 30_000,
  id: generateId(ORDER_ID_PREFIX),
  planKey: "LITE",
  sku: "lite-1m",
  status: "PENDING",
  updatedAt: new Date(),
  userId: "owner-1",
  ...overrides,
});

export const createPaymentFixture = (
  overrides: Partial<Payment> = {}
): Payment => ({
  amount: 30_000,
  createdAt: new Date(),
  gateway: "midtrans",
  gatewayOrderId: generateId(ORDER_ID_PREFIX),
  gatewayTransactionId: null,
  id: generateId(PAYMENT_ID_PREFIX),
  orderId: generateId(ORDER_ID_PREFIX),
  payload: null,
  status: "PENDING",
  updatedAt: new Date(),
  userId: "owner-1",
  ...overrides,
});

export const EMPTY_ORDER_LIST: OrderListResult = {
  data: [],
  pagination: { limit: 20, page: 1, total: 0, totalPages: 1 },
};

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

export class PlanTestEnv implements AsyncDisposable {
  readonly db: ReturnType<typeof getTestingDb>;
  readonly repo: PlanDrizzleRepository;
  readonly ownerId: string;
  readonly otherId: string;

  constructor() {
    this.db = getTestingDb();
    this.repo = new PlanDrizzleRepository(this.db);
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

  async seedUserPlan(overrides: Partial<UserPlan> = {}): Promise<UserPlan> {
    return await this.repo.upsertUserPlan({
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      id: generateId(PLAN_ID_PREFIX),
      planKey: "LITE",
      startedAt: new Date(),
      updatedAt: new Date(),
      userId: this.ownerId,
      ...overrides,
    });
  }

  async seedOrder(overrides: Partial<Order> = {}): Promise<Order> {
    return await this.repo.insertOrder({
      appliedAt: null,
      createdAt: new Date(),
      durationMonths: 1,
      expiresAt: null,
      grossAmount: 30_000,
      id: generateId(ORDER_ID_PREFIX),
      planKey: "LITE",
      sku: "lite-1m",
      status: "PENDING",
      updatedAt: new Date(),
      userId: this.ownerId,
      ...overrides,
    });
  }

  async seedPayment(overrides: Partial<Payment> = {}): Promise<Payment> {
    return await this.repo.insertPayment({
      amount: 30_000,
      createdAt: new Date(),
      gateway: "midtrans",
      gatewayOrderId: generateId(ORDER_ID_PREFIX),
      gatewayTransactionId: null,
      id: generateId(PAYMENT_ID_PREFIX),
      orderId: generateId(ORDER_ID_PREFIX),
      payload: null,
      status: "PENDING",
      updatedAt: new Date(),
      userId: this.ownerId,
      ...overrides,
    });
  }

  // oxlint-disable-next-line require-await
  async [Symbol.asyncDispose](): Promise<void> {
    this.db.$client.close();
  }
}
