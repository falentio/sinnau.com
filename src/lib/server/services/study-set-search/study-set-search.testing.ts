import { STUDY_SET_ID_PREFIX } from "$lib/schemas/study-set";
import { user } from "$lib/server/infras/db/schema/auth-schema";
import { studySet } from "$lib/server/infras/db/schema/study-set";
import { getTestingDb } from "$lib/server/infras/db/testing";
import { generateId } from "$lib/server/utils/nanoid";
import { vi } from "vitest";
import type { MockedFunction } from "vitest";

import type { StudySetSearchGuard } from "./study-set-search.guard.ts";
import { StudySetSearchDrizzleRepository } from "./study-set-search.repository.drizzle.ts";
import type { StudySetSearchRepository } from "./study-set-search.repository.ts";

export type MockedStudySetSearchRepository = {
  [K in keyof StudySetSearchRepository]: MockedFunction<
    StudySetSearchRepository[K]
  >;
};

export type MockedStudySetSearchGuard = {
  [K in keyof StudySetSearchGuard]: MockedFunction<StudySetSearchGuard[K]>;
};

export const createMockRepository = (): MockedStudySetSearchRepository => ({
  search: vi.fn<StudySetSearchRepository["search"]>(),
});

export const createMockGuard = (): MockedStudySetSearchGuard => ({
  requireUser: vi.fn<StudySetSearchGuard["requireUser"]>(),
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

interface SeedStudySetOptions {
  id?: string;
  title?: string;
  description?: string | null;
  visibility?: "PUBLIC" | "PRIVATE";
  ownerId?: string;
  slug?: string;
  deletedAt?: Date | null;
}

export class StudySetSearchTestEnv implements AsyncDisposable {
  readonly db: ReturnType<typeof getTestingDb>;
  readonly repo: StudySetSearchDrizzleRepository;
  readonly ownerId: string;

  constructor() {
    this.db = getTestingDb();
    this.ownerId = this.seedUser({ name: "Owner" });
    this.repo = StudySetSearchDrizzleRepository.withDatabase(this.db);
    this.repo.setup();
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

  seedStudySet(options: SeedStudySetOptions = {}): string {
    const id = options.id ?? generateId(STUDY_SET_ID_PREFIX);
    const slug = options.slug ?? `slug-${id.slice(-8)}`;
    this.db
      .insert(studySet)
      .values({
        ...(options.deletedAt ? { deletedAt: options.deletedAt } : {}),
        description: options.description ?? null,
        files: [],
        id,
        ownerId: options.ownerId ?? this.ownerId,
        slug,
        title: options.title ?? "Test Set",
        visibility: options.visibility ?? "PUBLIC",
      })
      .run();
    return id;
  }

  // oxlint-disable-next-line require-await
  async [Symbol.asyncDispose](): Promise<void> {
    try {
      this.db.$client.close();
    } catch {
      // The DB may already be closed if the constructor threw after
      // partial setup; nothing useful to do here.
    }
  }
}
