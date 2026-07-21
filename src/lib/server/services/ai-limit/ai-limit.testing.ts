import { AI_LIMIT_ID_PREFIX } from "$lib/schemas/ai-limit.constant";
import { aiUsageLog } from "$lib/server/infras/db/schema/ai-limit";
import { user } from "$lib/server/infras/db/schema/auth-schema";
import { getTestingDb } from "$lib/server/infras/db/testing";
import type { MockedFunction } from "vitest";
import { vi } from "vitest";

import type { AiUsageLog } from "../../infras/db/schema/ai-limit.ts";
import { generateId } from "../../utils/nanoid.ts";
import type { AiLimitGuard } from "./ai-limit.guard.ts";
import { AiLimitDrizzleRepository } from "./ai-limit.repository.drizzle.ts";
import type { AiLimitRepository } from "./ai-limit.repository.ts";

export type MockedAiLimitRepository = {
  [K in keyof AiLimitRepository]: MockedFunction<AiLimitRepository[K]>;
};

export const createMockRepository = (): MockedAiLimitRepository => ({
  consumeIfWithinQuota: vi.fn<AiLimitRepository["consumeIfWithinQuota"]>(),
  findUsageLogById: vi.fn<AiLimitRepository["findUsageLogById"]>(),
  markRefunded: vi.fn<AiLimitRepository["markRefunded"]>(),
  sumUsageInWindow: vi.fn<AiLimitRepository["sumUsageInWindow"]>(),
});

export type MockedAiLimitGuard = {
  [K in keyof AiLimitGuard]: MockedFunction<AiLimitGuard[K]>;
};

export const createMockGuard = (): MockedAiLimitGuard => ({
  assertLogOwnerOrForbidden: vi.fn<AiLimitGuard["assertLogOwnerOrForbidden"]>(),
  requireOwner: vi.fn<AiLimitGuard["requireOwner"]>(),
});

export const createAiUsageLogFixture = (
  overrides: Partial<AiUsageLog> = {}
): AiUsageLog => ({
  amount: 1,
  createdAt: new Date(),
  featureKey: "generate",
  id: generateId(AI_LIMIT_ID_PREFIX),
  ownerId: "owner-1",
  referenceId: null,
  refundedAt: null,
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

export class AiLimitTestEnv implements AsyncDisposable {
  readonly db: ReturnType<typeof getTestingDb>;
  readonly repo: AiLimitDrizzleRepository;
  readonly ownerId: string;
  readonly otherId: string;

  constructor() {
    this.db = getTestingDb();
    this.repo = new AiLimitDrizzleRepository(this.db);
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

  seedUsageLog(overrides: Partial<AiUsageLog> = {}): AiUsageLog {
    const row = {
      amount: overrides.amount ?? 1,
      createdAt: overrides.createdAt ?? new Date(),
      featureKey: overrides.featureKey ?? "generate",
      id: overrides.id ?? generateId(AI_LIMIT_ID_PREFIX),
      ownerId: overrides.ownerId ?? this.ownerId,
      referenceId: overrides.referenceId ?? null,
      refundedAt: overrides.refundedAt ?? null,
    };
    this.db.insert(aiUsageLog).values(row).run();
    return row;
  }

  // oxlint-disable-next-line require-await
  async [Symbol.asyncDispose](): Promise<void> {
    this.db.$client.close();
  }
}
