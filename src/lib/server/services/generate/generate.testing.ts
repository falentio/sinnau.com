import { GENERATE_ID_PREFIX } from "$lib/schemas/generate.constant";
import { STUDY_SET_ID_PREFIX } from "$lib/schemas/study-set";
import { user } from "$lib/server/infras/db/schema/auth-schema";
import { studySet } from "$lib/server/infras/db/schema/study-set";
import type { StudySetVisibility } from "$lib/server/infras/db/schema/study-set";
import { getTestingDb } from "$lib/server/infras/db/testing";
import { vi } from "vitest";
import type { MockedFunction } from "vitest";

import type { Generate } from "../../infras/db/schema/generate.ts";
import { generateId } from "../../utils/nanoid.ts";
import type { GenerateGuard } from "./generate.guard.ts";
import type {
  FinalizeTransactionFn,
  GenerationPipeline,
  ParseLiteparseFn,
  RunLLMFn,
} from "./generate.pipeline.ts";
import { GenerateDrizzleRepository } from "./generate.repository.drizzle";
import type { GenerateRepository } from "./generate.repository.ts";

export type MockedGenerateRepository = {
  [K in keyof GenerateRepository]: MockedFunction<GenerateRepository[K]>;
};

export const createMockRepository = (): MockedGenerateRepository => ({
  appendChunkResult: vi.fn<GenerateRepository["appendChunkResult"]>(),
  deleteOldChunks: vi.fn<GenerateRepository["deleteOldChunks"]>(),
  finalizeGenerateTransaction:
    vi.fn<GenerateRepository["finalizeGenerateTransaction"]>(),
  finalizeStuckAsFailed: vi.fn<GenerateRepository["finalizeStuckAsFailed"]>(),
  findChunkSummaries: vi.fn<GenerateRepository["findChunkSummaries"]>(),
  findGenerateById: vi.fn<GenerateRepository["findGenerateById"]>(),
  findGenerateInputByGenerateId:
    vi.fn<GenerateRepository["findGenerateInputByGenerateId"]>(),
  insertGenerate: vi.fn<GenerateRepository["insertGenerate"]>(),
  insertGenerateInput: vi.fn<GenerateRepository["insertGenerateInput"]>(),
  loadChunkResults: vi.fn<GenerateRepository["loadChunkResults"]>(),
  updateGenerateStatus: vi.fn<GenerateRepository["updateGenerateStatus"]>(),
});

export type MockedGenerateGuard = {
  [K in keyof GenerateGuard]: MockedFunction<GenerateGuard[K]>;
};

export const createMockGuard = (): MockedGenerateGuard => ({
  requireOwner: vi.fn<GenerateGuard["requireOwner"]>(),
});

export type MockedGeneratePipeline = {
  [K in keyof GenerationPipeline]: MockedFunction<GenerationPipeline[K]>;
};

export const createMockPipeline = (): MockedGeneratePipeline => ({
  finalizeTransaction: vi.fn<FinalizeTransactionFn>(),
  parseLiteparse: vi.fn<ParseLiteparseFn>(),
  runLLM: vi.fn<RunLLMFn>(),
});

export const createGenerateFixture = (
  overrides: Partial<Generate> = {}
): Generate => ({
  completedAt: null,
  createdAt: new Date("2026-01-01"),
  id: generateId(GENERATE_ID_PREFIX),
  ownerId: "owner-1",
  startedAt: new Date(),
  status: "CREATED",
  studySetId: "study-set-1",
  updatedAt: new Date("2026-01-01"),
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

export class GenerateTestEnv implements AsyncDisposable {
  readonly db: ReturnType<typeof getTestingDb>;
  readonly repo: GenerateDrizzleRepository;
  readonly ownerId: string;
  readonly otherId: string;
  readonly studySetId: string;

  constructor() {
    this.db = getTestingDb();
    this.repo = new GenerateDrizzleRepository(this.db);
    this.ownerId = this.seedUser({ name: "Owner" });
    this.otherId = this.seedUser({ name: "Other" });
    this.studySetId = this.seedStudySet(this.ownerId);
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

  seedStudySet(
    ownerId: string,
    overrides: { id?: string; visibility?: StudySetVisibility } = {}
  ): string {
    const id = overrides.id ?? generateId(STUDY_SET_ID_PREFIX);
    this.db
      .insert(studySet)
      .values({
        description: null,
        files: [],
        id,
        ownerId,
        slug: `set-${id.slice(0, 8)}`,
        title: `Set ${id.slice(0, 8)}`,
        visibility: overrides.visibility ?? "PUBLIC",
      })
      .run();
    return id;
  }

  async seedGenerate(overrides: Partial<Generate> = {}): Promise<Generate> {
    const id = overrides.id ?? generateId(GENERATE_ID_PREFIX);
    return await this.repo.insertGenerate({
      completedAt: null,
      id,
      ownerId: overrides.ownerId ?? this.ownerId,
      startedAt: overrides.startedAt ?? new Date(),
      status: overrides.status ?? "CREATED",
      studySetId: overrides.studySetId ?? "study-set-1",
    });
  }

  // oxlint-disable-next-line require-await
  async [Symbol.asyncDispose](): Promise<void> {
    this.db.$client.close();
  }
}
