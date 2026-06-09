import { CHAPTER_ID_PREFIX } from "$lib/schemas/chapter";
import { QUIZ_ID_PREFIX, QUIZ_OPTION_ID_PREFIX } from "$lib/schemas/quiz";
import { STUDY_SET_ID_PREFIX } from "$lib/schemas/study-set";
import { user } from "$lib/server/infras/db/schema/auth-schema";
import { chapter } from "$lib/server/infras/db/schema/chapter";
import { studySet } from "$lib/server/infras/db/schema/study-set";
import { getTestingDb } from "$lib/server/infras/db/testing";
import { eq } from "drizzle-orm";
import { vi } from "vitest";
import type { MockedFunction } from "vitest";

import type { Chapter } from "../../infras/db/schema/chapter.ts";
import type { Quiz, QuizOption } from "../../infras/db/schema/quiz.ts";
import type { StudySet } from "../../infras/db/schema/study-set.ts";
import { generateId } from "../../utils/nanoid.ts";
import type { QuizGuard } from "./quiz.guard.ts";
import { QuizDrizzleRepository } from "./quiz.repository.drizzle";
import type { QuizRepository } from "./quiz.repository.ts";

export type MockedQuizRepository = {
  [K in keyof QuizRepository]: MockedFunction<QuizRepository[K]>;
};

export const createMockRepository = (): MockedQuizRepository => ({
  deleteQuizOptions: vi.fn<QuizRepository["deleteQuizOptions"]>(),
  deleteQuizzes: vi.fn<QuizRepository["deleteQuizzes"]>(),
  findChapterById: vi.fn<QuizRepository["findChapterById"]>(),
  findOptionByIdForOwner: vi.fn<QuizRepository["findOptionByIdForOwner"]>(),
  findOptionsByIdsForOwner: vi.fn<QuizRepository["findOptionsByIdsForOwner"]>(),
  findOptionsByQuizIds: vi.fn<QuizRepository["findOptionsByQuizIds"]>(),
  findQuizById: vi.fn<QuizRepository["findQuizById"]>(),
  findQuizzesByIds: vi.fn<QuizRepository["findQuizzesByIds"]>(),
  findQuizzesByStudySetId: vi.fn<QuizRepository["findQuizzesByStudySetId"]>(),
  insertQuiz: vi.fn<QuizRepository["insertQuiz"]>(),
  insertQuizOptions: vi.fn<QuizRepository["insertQuizOptions"]>(),
  updateQuiz: vi.fn<QuizRepository["updateQuiz"]>(),
  updateQuizOption: vi.fn<QuizRepository["updateQuizOption"]>(),
});

export type MockedQuizGuard = {
  [K in keyof QuizGuard]: MockedFunction<QuizGuard[K]>;
};

export const createMockGuard = (): MockedQuizGuard => ({
  assertChapterInStudySetOrForbidden:
    vi.fn<QuizGuard["assertChapterInStudySetOrForbidden"]>(),
  assertChapterOwnerOrForbidden:
    vi.fn<QuizGuard["assertChapterOwnerOrForbidden"]>(),
  assertQuizOptionOwnerBatchOrPartialForbidden:
    vi.fn<QuizGuard["assertQuizOptionOwnerBatchOrPartialForbidden"]>(),
  assertQuizOwnerBatchOrPartialForbidden:
    vi.fn<QuizGuard["assertQuizOwnerBatchOrPartialForbidden"]>(),
  assertQuizOwnerOrForbidden: vi.fn<QuizGuard["assertQuizOwnerOrForbidden"]>(),
  assertQuizVisibleByIdOrNotFound:
    vi.fn<QuizGuard["assertQuizVisibleByIdOrNotFound"]>(),
  assertStudySetOwnerOrForbidden:
    vi.fn<QuizGuard["assertStudySetOwnerOrForbidden"]>(),
  assertStudySetVisibleOrNotFound:
    vi.fn<QuizGuard["assertStudySetVisibleOrNotFound"]>(),
});

export const createQuizFixture = (overrides: Partial<Quiz> = {}): Quiz => ({
  chapterId: null,
  createdAt: new Date(),
  id: generateId(QUIZ_ID_PREFIX),
  ownerId: "owner-1",
  questionText: "What is 2 + 2?",
  studySetId: generateId(STUDY_SET_ID_PREFIX),
  type: "MULTIPLE_CHOICE",
  updatedAt: new Date(),
  ...overrides,
});

export const createQuizOptionFixture = (
  overrides: Partial<QuizOption> = {}
): QuizOption => ({
  createdAt: new Date(),
  explanation: null,
  id: generateId(QUIZ_OPTION_ID_PREFIX),
  isCorrect: false,
  optionText: "Option text",
  quizId: generateId(QUIZ_ID_PREFIX),
  updatedAt: new Date(),
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

interface SeedStudySetOptions {
  id?: string;
  slug?: string;
  title?: string;
  visibility?: StudySet["visibility"];
  ownerId?: string;
}

interface SeedChapterOptions {
  id?: string;
  slug?: string;
  title?: string;
  studySetId?: string;
  ownerId?: string;
}

export class QuizTestEnv implements AsyncDisposable {
  readonly db: ReturnType<typeof getTestingDb>;
  readonly repo: QuizDrizzleRepository;
  readonly ownerId: string;
  readonly otherId: string;

  constructor() {
    this.db = getTestingDb();
    this.repo = new QuizDrizzleRepository(this.db);
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

  // oxlint-disable-next-line require-await
  async seedStudySet(overrides: SeedStudySetOptions = {}): Promise<StudySet> {
    const id = overrides.id ?? generateId(STUDY_SET_ID_PREFIX);
    this.db
      .insert(studySet)
      .values({
        description: null,
        files: [],
        id,
        ownerId: overrides.ownerId ?? this.ownerId,
        slug: overrides.slug ?? `slug-${id.slice(0, 8)}`,
        title: overrides.title ?? "Seeded Set",
        visibility: overrides.visibility ?? "PUBLIC",
      })
      .run();
    const [row] = this.db
      .select()
      .from(studySet)
      .where(eq(studySet.id, id))
      .all();
    if (!row) {
      throw new Error("Failed to seed study set");
    }
    return row;
  }

  private async resolveStudySetId(
    studySetId: string | undefined,
    ownerId?: string
  ): Promise<string> {
    if (studySetId) {
      return studySetId;
    }
    const seeded = await this.seedStudySet({
      ownerId: ownerId ?? this.ownerId,
    });
    return seeded.id;
  }

  async seedChapter(overrides: SeedChapterOptions = {}): Promise<Chapter> {
    const id = overrides.id ?? generateId(CHAPTER_ID_PREFIX);
    const studySetId = await this.resolveStudySetId(overrides.studySetId);
    this.db
      .insert(chapter)
      .values({
        description: null,
        id,
        ownerId: overrides.ownerId ?? this.ownerId,
        slug: overrides.slug ?? `chapter-${id.slice(0, 8)}`,
        studySetId,
        title: overrides.title ?? "Seeded Chapter",
      })
      .run();
    const [row] = this.db
      .select()
      .from(chapter)
      .where(eq(chapter.id, id))
      .all();
    if (!row) {
      throw new Error("Failed to seed chapter");
    }
    return row;
  }

  async seedQuiz(overrides: Partial<Quiz> = {}): Promise<Quiz> {
    const studySetId = await this.resolveStudySetId(
      overrides.studySetId,
      overrides.ownerId
    );
    const id = overrides.id ?? generateId(QUIZ_ID_PREFIX);
    return await this.repo.insertQuiz(
      {
        chapterId: overrides.chapterId ?? null,
        id,
        ownerId: overrides.ownerId ?? this.ownerId,
        questionText: overrides.questionText ?? "Seeded question?",
        studySetId,
        type: overrides.type ?? "MULTIPLE_CHOICE",
      },
      []
    );
  }

  async seedQuizOption(
    overrides: Partial<QuizOption> = {}
  ): Promise<QuizOption> {
    const seededQuiz = await this.seedQuiz();
    const quizId = overrides.quizId ?? seededQuiz.id;
    const id = overrides.id ?? generateId(QUIZ_OPTION_ID_PREFIX);
    const rows = await this.repo.insertQuizOptions([
      {
        explanation: overrides.explanation ?? null,
        id,
        isCorrect: overrides.isCorrect ?? false,
        optionText: overrides.optionText ?? "Seeded option",
        quizId,
      },
    ]);
    const [row] = rows;
    if (!row) {
      throw new Error("Expected seeded quiz option to be inserted");
    }
    return row;
  }

  // oxlint-disable-next-line require-await
  async [Symbol.asyncDispose](): Promise<void> {
    this.db.$client.close();
  }
}
