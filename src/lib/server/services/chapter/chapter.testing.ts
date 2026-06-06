import { CHAPTER_ID_PREFIX } from "$lib/schemas/chapter";
import { FLASHCARD_ID_PREFIX } from "$lib/schemas/flashcard";
import { STUDY_SET_ID_PREFIX } from "$lib/schemas/study-set";
import { user } from "$lib/server/infras/db/schema/auth-schema";
import { getTestingDb } from "$lib/server/infras/db/testing";
import { eq } from "drizzle-orm";
import { vi } from "vitest";
import type { MockedFunction } from "vitest";

import type { Chapter } from "../../infras/db/schema/chapter.ts";
import { flashcard } from "../../infras/db/schema/flashcard.ts";
import { studySet } from "../../infras/db/schema/study-set.ts";
import type { StudySetVisibility } from "../../infras/db/schema/study-set.ts";
import { generateId } from "../../utils/nanoid.ts";
import { StudySetDrizzleRepository } from "../study-set/study-set.repository.drizzle";
import type { ChapterGuard } from "./chapter.guard.ts";
import { ChapterDrizzleRepository } from "./chapter.repository.drizzle";
import type { ChapterRepository } from "./chapter.repository.ts";

export type MockedChapterRepository = {
  [K in keyof ChapterRepository]: MockedFunction<ChapterRepository[K]>;
};

export const createMockRepository = (): MockedChapterRepository => ({
  countChildren: vi.fn<ChapterRepository["countChildren"]>(),
  deleteChapter: vi.fn<ChapterRepository["deleteChapter"]>(),
  findChapterById: vi.fn<ChapterRepository["findChapterById"]>(),
  findChaptersByStudySet: vi.fn<ChapterRepository["findChaptersByStudySet"]>(),
  insertChapter: vi.fn<ChapterRepository["insertChapter"]>(),
  isSlugTakenInStudySet: vi.fn<ChapterRepository["isSlugTakenInStudySet"]>(),
  updateChapter: vi.fn<ChapterRepository["updateChapter"]>(),
});

export type MockedChapterGuard = {
  [K in keyof ChapterGuard]: MockedFunction<ChapterGuard[K]>;
};

export const createMockGuard = (): MockedChapterGuard => ({
  assertOwnerOrForbidden: vi.fn<ChapterGuard["assertOwnerOrForbidden"]>(),
  assertStudySetOwnerOrForbidden:
    vi.fn<ChapterGuard["assertStudySetOwnerOrForbidden"]>(),
  assertVisibleByIdOrNotFound:
    vi.fn<ChapterGuard["assertVisibleByIdOrNotFound"]>(),
});

export const createChapterFixture = (
  overrides: Partial<Chapter> = {}
): Chapter => ({
  createdAt: new Date(),
  description: null,
  id: generateId(CHAPTER_ID_PREFIX),
  ownerId: "owner-1",
  slug: "chapter-slug-abc123",
  studySetId: "set-1",
  title: "Chapter Title",
  updatedAt: new Date(),
  ...overrides,
});

export const EMPTY_CHAPTER_LIST: Chapter[] = [];

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

interface SeedStudySetOptions {
  id?: string;
  slug?: string;
  visibility?: StudySetVisibility;
  ownerId: string;
}

interface SeedChapterOptions {
  id?: string;
  slug?: string;
  title?: string;
  description?: string | null;
  studySetId?: string;
  ownerId?: string;
}

export class ChapterTestEnv implements AsyncDisposable {
  readonly db: ReturnType<typeof getTestingDb>;
  readonly repo: ChapterDrizzleRepository;
  readonly studySetRepo: StudySetDrizzleRepository;
  readonly ownerId: string;
  readonly otherId: string;
  readonly studySetId: string;
  readonly otherStudySetId: string;

  constructor() {
    this.db = getTestingDb();
    this.repo = new ChapterDrizzleRepository(this.db);
    this.studySetRepo = new StudySetDrizzleRepository(this.db);
    this.ownerId = this.seedUser({ name: "Owner" });
    this.otherId = this.seedUser({ name: "Other" });
    this.studySetId = generateId(STUDY_SET_ID_PREFIX);
    this.otherStudySetId = generateId(STUDY_SET_ID_PREFIX);
    this.insertStudySetSync(this.studySetId, this.ownerId, "PUBLIC");
    this.insertStudySetSync(this.otherStudySetId, this.otherId, "PRIVATE");
  }

  private insertStudySetSync(
    id: string,
    ownerId: string,
    visibility: StudySetVisibility
  ): void {
    this.db
      .insert(studySet)
      .values({
        description: null,
        files: [],
        id,
        ownerId,
        slug: `set-${id.slice(0, 8)}`,
        title: `Set ${id.slice(0, 8)}`,
        visibility,
      })
      .run();
  }

  seedUser(options: SeedUserOptions = {}): string {
    const id = options.id ?? crypto.randomUUID();
    this.db
      .insert(user)

      // User IDs are auth domain (not prefixed with project prefix)

      .values({
        email: options.email ?? `${id}@test.local`,
        emailVerified: true,
        id,
        name: options.name ?? "Test User",
      })
      .run();
    return id;
  }

  async seedStudySet(options: SeedStudySetOptions): Promise<{
    id: string;
    slug: string;
    visibility: StudySetVisibility;
  }> {
    const id = options.id ?? generateId(STUDY_SET_ID_PREFIX);
    const slug = options.slug ?? `slug-${id.slice(0, 8)}`;
    const visibility: StudySetVisibility = options.visibility ?? "PUBLIC";
    this.db.delete(studySet).where(eq(studySet.id, id)).run();
    await this.studySetRepo.insertStudySet({
      description: null,
      files: [],
      id,
      ownerId: options.ownerId,
      slug,
      title: `Set ${slug}`,
      visibility,
    });
    return { id, slug, visibility };
  }

  async seedChapter(overrides: SeedChapterOptions = {}): Promise<Chapter> {
    const id = overrides.id ?? generateId(CHAPTER_ID_PREFIX);
    const chapter = await this.repo.insertChapter({
      description: overrides.description ?? null,
      id,
      ownerId: overrides.ownerId ?? this.ownerId,
      slug: overrides.slug ?? `chapter-${id.slice(0, 8)}`,
      studySetId: overrides.studySetId ?? this.studySetId,
      title: overrides.title ?? "Seeded Chapter",
    });
    return chapter;
  }

  seedFlashcardInChapter(
    chapterId: string,
    ownerId: string = this.ownerId,
    studySetId: string = this.studySetId
  ): string {
    const id = generateId(FLASHCARD_ID_PREFIX);
    this.db
      .insert(flashcard)
      .values({
        back: "Back",
        chapterId,
        front: "Front",
        hint: null,
        id,
        importance: 0,
        ownerId,
        studySetId,
      })
      .run();
    return id;
  }

  // oxlint-disable-next-line require-await
  async [Symbol.asyncDispose](): Promise<void> {
    this.db.$client.close();
  }
}
