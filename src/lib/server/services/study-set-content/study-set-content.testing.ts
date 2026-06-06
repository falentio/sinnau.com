import { STUDY_SET_ID_PREFIX } from "$lib/schemas/study-set";
import { STUDY_SET_CONTENT_ID_PREFIX } from "$lib/schemas/study-set-content.constant";
import { user } from "$lib/server/infras/db/schema/auth-schema";
import { studySet } from "$lib/server/infras/db/schema/study-set";
import { getTestingDb } from "$lib/server/infras/db/testing";
import { eq } from "drizzle-orm";
import { vi } from "vitest";
import type { MockedFunction } from "vitest";

import { chapter } from "../../infras/db/schema/chapter.ts";
import type {
  StudySetContent,
  StudySetContentWithChapters,
} from "../../infras/db/schema/study-set-content.ts";
import type { StudySetVisibility } from "../../infras/db/schema/study-set.ts";
import { generateId } from "../../utils/nanoid.ts";
import { ChapterDrizzleRepository } from "../chapter/chapter.repository.drizzle.ts";
import { StudySetDrizzleRepository } from "../study-set/study-set.repository.drizzle.ts";
import type { StudySetContentGuard } from "./study-set-content.guard.ts";
import { StudySetContentDrizzleRepository } from "./study-set-content.repository.drizzle.ts";
import type { StudySetContentRepository } from "./study-set-content.repository.ts";

export type MockedStudySetContentRepository = {
  [K in keyof StudySetContentRepository]: MockedFunction<
    StudySetContentRepository[K]
  >;
};

export const createMockRepository = (): MockedStudySetContentRepository => ({
  deleteContent: vi.fn<StudySetContentRepository["deleteContent"]>(),
  findChapterById: vi.fn<StudySetContentRepository["findChapterById"]>(),
  findContentById: vi.fn<StudySetContentRepository["findContentById"]>(),
  findContentByIdWithChapters:
    vi.fn<StudySetContentRepository["findContentByIdWithChapters"]>(),
  findContentsByChapter:
    vi.fn<StudySetContentRepository["findContentsByChapter"]>(),
  findContentsByStudySet:
    vi.fn<StudySetContentRepository["findContentsByStudySet"]>(),
  insertContent: vi.fn<StudySetContentRepository["insertContent"]>(),
  linkChapter: vi.fn<StudySetContentRepository["linkChapter"]>(),
  setChapters: vi.fn<StudySetContentRepository["setChapters"]>(),
  unlinkChapter: vi.fn<StudySetContentRepository["unlinkChapter"]>(),
  updateContent: vi.fn<StudySetContentRepository["updateContent"]>(),
});

export type MockedStudySetContentGuard = {
  [K in keyof StudySetContentGuard]: MockedFunction<StudySetContentGuard[K]>;
};

export const createMockGuard = (): MockedStudySetContentGuard => ({
  assertContentOwnerOrForbidden:
    vi.fn<StudySetContentGuard["assertContentOwnerOrForbidden"]>(),
  assertContentVisibleByIdOrNotFound:
    vi.fn<StudySetContentGuard["assertContentVisibleByIdOrNotFound"]>(),
  assertStudySetOwnerOrForbidden:
    vi.fn<StudySetContentGuard["assertStudySetOwnerOrForbidden"]>(),
  assertStudySetVisibleByIdOrNotFound:
    vi.fn<StudySetContentGuard["assertStudySetVisibleByIdOrNotFound"]>(),
});

export const createStudySetContentFixture = (
  overrides: Partial<StudySetContent> = {}
): StudySetContent => ({
  content: "Some study content text",
  createdAt: new Date(),
  id: generateId(STUDY_SET_CONTENT_ID_PREFIX),
  studySetId: "set-1",
  updatedAt: new Date(),
  ...overrides,
});

export const createStudySetContentWithChaptersFixture = (
  overrides: Partial<StudySetContentWithChapters> = {}
): StudySetContentWithChapters => ({
  chapterIds: [],
  content: "Some study content text",
  createdAt: new Date(),
  id: generateId(STUDY_SET_CONTENT_ID_PREFIX),
  studySetId: "set-1",
  updatedAt: new Date(),
  ...overrides,
});

export const EMPTY_CONTENT_LIST: StudySetContentWithChapters[] = [];

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

export class StudySetContentTestEnv implements AsyncDisposable {
  readonly db: ReturnType<typeof getTestingDb>;
  readonly repo: StudySetContentDrizzleRepository;
  readonly studySetRepo: StudySetDrizzleRepository;
  readonly chapterRepo: ChapterDrizzleRepository;
  readonly ownerId: string;
  readonly otherId: string;
  readonly studySetId: string;
  readonly otherStudySetId: string;

  constructor() {
    this.db = getTestingDb();
    this.repo = new StudySetContentDrizzleRepository(this.db);
    this.studySetRepo = new StudySetDrizzleRepository(this.db);
    this.chapterRepo = new ChapterDrizzleRepository(this.db);
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

  seedChapterSync(
    chapterId: string,
    studySetId: string,
    ownerId: string
  ): void {
    this.db
      .insert(chapter)
      .values({
        description: null,
        id: chapterId,
        ownerId,
        slug: `ch-${chapterId.slice(0, 8)}`,
        studySetId,
        title: `Chapter ${chapterId.slice(0, 8)}`,
      })
      .run();
  }

  seedContent(
    overrides: Partial<StudySetContent> = {}
  ): Promise<StudySetContent> {
    return this.repo.insertContent({
      content: overrides.content ?? "Default content text",
      id: overrides.id ?? generateId(STUDY_SET_CONTENT_ID_PREFIX),
      studySetId: overrides.studySetId ?? this.studySetId,
    });
  }

  // oxlint-disable-next-line require-await
  async [Symbol.asyncDispose](): Promise<void> {
    this.db.$client.close();
  }
}
