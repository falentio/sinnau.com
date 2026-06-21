import { CHAPTER_ID_PREFIX } from "$lib/schemas/chapter";
import { FLASHCARD_ID_PREFIX } from "$lib/schemas/flashcard";
import { STUDY_SET_ID_PREFIX } from "$lib/schemas/study-set";
import { user } from "$lib/server/infras/db/schema/auth-schema";
import { getTestingDb } from "$lib/server/infras/db/testing";
import { vi } from "vitest";
import type { MockedFunction } from "vitest";

import { chapter } from "../../infras/db/schema/chapter.ts";
import type { Flashcard } from "../../infras/db/schema/flashcard.ts";
import { generateId } from "../../utils/nanoid.ts";
import type { StudySetGuard } from "../study-set/study-set.guard.ts";
import { StudySetDrizzleRepository } from "../study-set/study-set.repository.drizzle";
import type { FlashcardGuard } from "./flashcard.guard.ts";
import { FlashcardDrizzleRepository } from "./flashcard.repository.drizzle";
import type { FlashcardRepository } from "./flashcard.repository.ts";

export type MockedFlashcardRepository = {
  [K in keyof FlashcardRepository]: MockedFunction<FlashcardRepository[K]>;
};

export const createMockRepository = (): MockedFlashcardRepository => ({
  deleteFlashcards: vi.fn<FlashcardRepository["deleteFlashcards"]>(),
  findChapter: vi.fn<FlashcardRepository["findChapter"]>(),
  findFlashcardById: vi.fn<FlashcardRepository["findFlashcardById"]>(),
  findFlashcardsByIds: vi.fn<FlashcardRepository["findFlashcardsByIds"]>(),
  findFlashcardsByStudySet:
    vi.fn<FlashcardRepository["findFlashcardsByStudySet"]>(),
  insertFlashcards: vi.fn<FlashcardRepository["insertFlashcards"]>(),
  updateFlashcard: vi.fn<FlashcardRepository["updateFlashcard"]>(),
});

export type MockedFlashcardGuard = {
  [K in keyof FlashcardGuard]: MockedFunction<FlashcardGuard[K]>;
};

export const createMockGuard = (): MockedFlashcardGuard => ({
  assertChapterOwnerInStudySetOrForbidden:
    vi.fn<FlashcardGuard["assertChapterOwnerInStudySetOrForbidden"]>(),
  assertFlashcardExistsOrNotFound:
    vi.fn<FlashcardGuard["assertFlashcardExistsOrNotFound"]>(),
  assertFlashcardOwnerOrForbidden:
    vi.fn<FlashcardGuard["assertFlashcardOwnerOrForbidden"]>(),
  assertFlashcardVisibleOrNotFound:
    vi.fn<FlashcardGuard["assertFlashcardVisibleOrNotFound"]>(),
  assertFlashcardsAllOwnedOrThrow:
    vi.fn<FlashcardGuard["assertFlashcardsAllOwnedOrThrow"]>(),
  assertStudySetOwnerOrForbidden:
    vi.fn<FlashcardGuard["assertStudySetOwnerOrForbidden"]>(),
  assertStudySetVisibleOrNotFound:
    vi.fn<FlashcardGuard["assertStudySetVisibleOrNotFound"]>(),
});

export type MockedStudySetGuard = {
  [K in keyof StudySetGuard]: MockedFunction<StudySetGuard[K]>;
};

export const createMockStudySetGuard = (): MockedStudySetGuard => ({
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

export const createFlashcardFixture = (
  overrides: Partial<Flashcard> = {}
): Flashcard => ({
  back: "Back of card",
  chapterId: null,
  createdAt: new Date(),
  front: "Front of card",
  hint: null,
  id: generateId(FLASHCARD_ID_PREFIX),
  importance: 0,
  ownerId: "owner-1",
  studySetId: "set-1",
  updatedAt: new Date(),
  ...overrides,
});

export const EMPTY_FLASHCARD_LIST: Flashcard[] = [];

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
  visibility?: "PUBLIC" | "PRIVATE";
}

export class FlashcardTestEnv implements AsyncDisposable {
  readonly db: ReturnType<typeof getTestingDb>;
  readonly repo: FlashcardDrizzleRepository;
  readonly studySetRepo: StudySetDrizzleRepository;
  readonly ownerId: string;
  readonly otherId: string;
  readonly studySetId: string;
  readonly otherStudySetId: string;

  constructor() {
    this.db = getTestingDb();
    this.repo = new FlashcardDrizzleRepository(this.db);
    this.studySetRepo = new StudySetDrizzleRepository(this.db);
    this.ownerId = this.seedUser({ name: "Owner" });
    this.otherId = this.seedUser({ name: "Other" });
    this.studySetId = generateId(STUDY_SET_ID_PREFIX);
    this.otherStudySetId = generateId(STUDY_SET_ID_PREFIX);
  }

  async seedOwnedStudySet(options: SeedStudySetOptions = {}): Promise<string> {
    await this.studySetRepo.insertStudySet({
      description: null,
      files: [],
      id: this.studySetId,
      ownerId: this.ownerId,
      slug: "slug-owned",
      title: "Owned set",
      visibility: options.visibility ?? "PUBLIC",
    });
    return this.studySetId;
  }

  async seedOtherStudySet(options: SeedStudySetOptions = {}): Promise<string> {
    await this.studySetRepo.insertStudySet({
      description: null,
      files: [],
      id: this.otherStudySetId,
      ownerId: this.otherId,
      slug: "slug-other",
      title: "Other set",
      visibility: options.visibility ?? "PUBLIC",
    });
    return this.otherStudySetId;
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

  async seedStudySet(
    id: string,
    ownerId: string,
    slugSuffix: string,
    options: SeedStudySetOptions = {}
  ): Promise<string> {
    await this.studySetRepo.insertStudySet({
      description: null,
      files: [],
      id,
      ownerId,
      slug: `slug-${slugSuffix}`,
      title: `Set ${slugSuffix}`,
      visibility: options.visibility ?? "PUBLIC",
    });
    return id;
  }

  async seedFlashcard(overrides: Partial<Flashcard> = {}): Promise<Flashcard> {
    const id = overrides.id ?? generateId(FLASHCARD_ID_PREFIX);
    const rows = await this.repo.insertFlashcards([
      {
        back: overrides.back ?? "Back",
        chapterId: overrides.chapterId ?? null,
        front: overrides.front ?? "Front",
        hint: overrides.hint ?? null,
        id,
        importance: overrides.importance ?? 0,
        ownerId: overrides.ownerId ?? this.ownerId,
        studySetId: overrides.studySetId ?? this.studySetId,
      },
    ]);
    const [row] = rows;
    if (!row) {
      throw new Error("Expected seeded flashcard to be inserted");
    }
    return row;
  }

  seedChapter(
    options: { id?: string; studySetId?: string; ownerId?: string } = {}
  ): string {
    const id = options.id ?? generateId(CHAPTER_ID_PREFIX);
    this.db
      .insert(chapter)
      .values({
        description: null,
        id,
        ownerId: options.ownerId ?? this.ownerId,
        slug: `chapter-${id.slice(0, 8)}`,
        studySetId: options.studySetId ?? this.studySetId,
        title: "Seeded chapter",
      })
      .run();
    return id;
  }

  // oxlint-disable-next-line require-await
  async [Symbol.asyncDispose](): Promise<void> {
    this.db.$client.close();
  }
}
