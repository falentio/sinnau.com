import { STUDY_SET_ID_PREFIX } from "$lib/schemas/study-set";
import { user } from "$lib/server/infras/db/schema/auth-schema";
import { getTestingDb } from "$lib/server/infras/db/testing";
import { vi } from "vitest";
import type { MockedFunction } from "vitest";

import type { StudySet } from "../../infras/db/schema/study-set.ts";
import { generateId } from "../../utils/nanoid.ts";
import type { StudySetGuard } from "./study-set.guard.ts";
import { StudySetDrizzleRepository } from "./study-set.repository.drizzle";
import type {
  StudySetListResult,
  StudySetRepository,
} from "./study-set.repository.ts";

export type MockedStudySetRepository = {
  [K in keyof StudySetRepository]: MockedFunction<StudySetRepository[K]>;
};

export const createMockRepository = (): MockedStudySetRepository => ({
  deleteOldVisits: vi.fn<StudySetRepository["deleteOldVisits"]>(),
  deleteStudySet: vi.fn<StudySetRepository["deleteStudySet"]>(),
  findOwnedStudySets: vi.fn<StudySetRepository["findOwnedStudySets"]>(),
  findOwnedStudySetsByVisit:
    vi.fn<StudySetRepository["findOwnedStudySetsByVisit"]>(),
  findRecentVisits: vi.fn<StudySetRepository["findRecentVisits"]>(),
  findStudySetById: vi.fn<StudySetRepository["findStudySetById"]>(),
  findStudySetBySlug: vi.fn<StudySetRepository["findStudySetBySlug"]>(),
  hasUserVisitedStudySet: vi.fn<StudySetRepository["hasUserVisitedStudySet"]>(),
  insertStudySet: vi.fn<StudySetRepository["insertStudySet"]>(),
  isSlugTaken: vi.fn<StudySetRepository["isSlugTaken"]>(),
  restoreStudySet: vi.fn<StudySetRepository["restoreStudySet"]>(),
  updateStudySet: vi.fn<StudySetRepository["updateStudySet"]>(),
  upsertVisit: vi.fn<StudySetRepository["upsertVisit"]>(),
});

export type MockedStudySetGuard = {
  [K in keyof StudySetGuard]: MockedFunction<StudySetGuard[K]>;
};

export const createMockGuard = (): MockedStudySetGuard => ({
  assertOwnerOrForbidden: vi.fn<StudySetGuard["assertOwnerOrForbidden"]>(),
  assertStudySetOwnerOrForbidden:
    vi.fn<StudySetGuard["assertStudySetOwnerOrForbidden"]>(),
  assertStudySetVisibleByIdOrNotFound:
    vi.fn<StudySetGuard["assertStudySetVisibleByIdOrNotFound"]>(),
  assertVisibleByIdOrNotFound:
    vi.fn<StudySetGuard["assertVisibleByIdOrNotFound"]>(),
  assertVisibleBySlugOrNotFound:
    vi.fn<StudySetGuard["assertVisibleBySlugOrNotFound"]>(),
  canView: vi.fn<StudySetGuard["canView"]>(),
});

export const createStudySetFixture = (
  overrides: Partial<StudySet> = {}
): StudySet => ({
  createdAt: new Date(),
  deletedAt: null,
  description: null,
  files: [],
  id: generateId(STUDY_SET_ID_PREFIX),
  ownerId: "owner-1",
  slug: "test-slug-abc123",
  title: "Test Set",
  updatedAt: new Date(),
  visibility: "PUBLIC",
  ...overrides,
});

export const EMPTY_STUDY_SET_LIST: StudySetListResult = {
  data: [],
  pagination: { limit: 10, page: 1, total: 0, totalPages: 1 },
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

export class StudySetTestEnv implements AsyncDisposable {
  readonly db: ReturnType<typeof getTestingDb>;
  readonly repo: StudySetDrizzleRepository;
  readonly ownerId: string;
  readonly otherId: string;

  constructor() {
    this.db = getTestingDb();
    this.repo = new StudySetDrizzleRepository(this.db);
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

        // User IDs are auth domain (not prefixed with project prefix)

        name: options.name ?? "Test User",
      })
      .run();
    return id;
  }

  async seedStudySet(overrides: Partial<StudySet> = {}): Promise<StudySet> {
    const id = overrides.id ?? generateId(STUDY_SET_ID_PREFIX);
    return await this.repo.insertStudySet({
      description: overrides.description ?? null,
      files: overrides.files ?? [],
      id,
      ownerId: overrides.ownerId ?? "seed-owner",
      slug: overrides.slug ?? `slug-${id.slice(0, 8)}`,
      title: overrides.title ?? "Seeded Set",
      visibility: overrides.visibility ?? "PUBLIC",
    });
  }

  // oxlint-disable-next-line require-await
  async [Symbol.asyncDispose](): Promise<void> {
    this.db.$client.close();
  }
}
