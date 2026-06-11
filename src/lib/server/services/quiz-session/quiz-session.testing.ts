import { CHAPTER_ID_PREFIX } from "$lib/schemas/chapter";
import { QUIZ_ID_PREFIX, QUIZ_OPTION_ID_PREFIX } from "$lib/schemas/quiz";
import {
  QUIZ_SESSION_ID_PREFIX,
  QUIZ_SESSION_ANSWER_ID_PREFIX,
} from "$lib/schemas/quiz-session.constant";
import { STUDY_SET_ID_PREFIX } from "$lib/schemas/study-set";
import { user } from "$lib/server/infras/db/schema/auth-schema";
import { chapter } from "$lib/server/infras/db/schema/chapter";
import { studySet } from "$lib/server/infras/db/schema/study-set";
import { getTestingDb } from "$lib/server/infras/db/testing";
import { eq } from "drizzle-orm";
import { vi } from "vitest";
import type { MockedFunction } from "vitest";

import type { Chapter } from "../../infras/db/schema/chapter.ts";
import type {
  QuizSession,
  QuizSessionAnswer,
} from "../../infras/db/schema/quiz-session.ts";
import type { Quiz, QuizOption } from "../../infras/db/schema/quiz.ts";
import type { StudySet } from "../../infras/db/schema/study-set.ts";
import { generateId } from "../../utils/nanoid.ts";
import { QuizDrizzleRepository } from "../quiz/quiz.repository.drizzle";
import type { QuizSessionGuard } from "./quiz-session.guard.ts";
import { QuizSessionDrizzleRepository } from "./quiz-session.repository.drizzle";
import type { QuizSessionRepository } from "./quiz-session.repository.ts";

export type MockedQuizSessionRepository = {
  [K in keyof QuizSessionRepository]: MockedFunction<QuizSessionRepository[K]>;
};

export const createMockRepository = (): MockedQuizSessionRepository => ({
  countQuizzesInScope: vi.fn(),
  deleteExpiredSessionsAndOrphans: vi.fn(),
  findAnswerBySessionAndQuiz: vi.fn(),
  findAnswersBySession: vi.fn(),
  findChapterById: vi.fn(),
  findQuizById: vi.fn(),
  findQuizByIdInScope: vi.fn(),
  findQuizOptionsByQuizId: vi.fn(),
  findQuizzesWithOptionsInScope: vi.fn(),
  findSessionById: vi.fn(),
  findSessionsByStudySetAndUser: vi.fn(),
  insertSession: vi.fn(),
  updateSession: vi.fn(),
  upsertAnswer: vi.fn(),
});

export type MockedQuizSessionGuard = {
  [K in keyof QuizSessionGuard]: MockedFunction<QuizSessionGuard[K]>;
};

export const createMockGuard = (): MockedQuizSessionGuard => ({
  assertChapterInStudySetOrValidationFailed: vi.fn(),
  assertQuizInSessionScopeOrValidationFailed: vi.fn(),
  assertQuizOptionsValidOrValidationFailed: vi.fn(),
  assertSessionOwnerOrNotFound: vi.fn(),
  assertStudySetVisibleOrNotFound: vi.fn(),
  requireUser: vi.fn(),
});

export const createQuizSessionFixture = (
  overrides: Partial<QuizSession> = {}
): QuizSession => ({
  chapterId: null,
  completedAt: null,
  correctCount: null,
  createdAt: new Date(),
  failingChapterIds: null,
  id: generateId(QUIZ_SESSION_ID_PREFIX),
  incorrectQuizIds: null,
  lastAnsweredAt: null,
  lastQuestionText: null,
  quizCount: 0,
  score: null,
  status: "ACTIVE",
  studySetId: generateId(STUDY_SET_ID_PREFIX),
  totalQuestions: null,
  updatedAt: new Date(),
  userId: "owner-1",
  ...overrides,
});

export const createQuizSessionAnswerFixture = (
  overrides: Partial<QuizSessionAnswer> = {}
): QuizSessionAnswer => ({
  createdAt: new Date(),
  id: generateId(QUIZ_SESSION_ANSWER_ID_PREFIX),
  quizId: generateId(QUIZ_ID_PREFIX),
  selectedOptionIds: [],
  sessionId: generateId(QUIZ_SESSION_ID_PREFIX),
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

export class QuizSessionTestEnv implements AsyncDisposable {
  readonly db: ReturnType<typeof getTestingDb>;
  readonly quizSessionRepo: QuizSessionDrizzleRepository;
  readonly quizRepo: QuizDrizzleRepository;
  readonly ownerId: string;
  readonly otherId: string;

  constructor() {
    this.db = getTestingDb();
    this.quizSessionRepo = new QuizSessionDrizzleRepository(this.db);
    this.quizRepo = new QuizDrizzleRepository(this.db);
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
    if (studySetId !== undefined) {
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
    return await this.quizRepo.insertQuiz(
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
    const rows = await this.quizRepo.insertQuizOptions([
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

  async seedQuizSession(
    overrides: Partial<QuizSession> = {}
  ): Promise<QuizSession> {
    const studySetId = await this.resolveStudySetId(
      overrides.studySetId,
      overrides.userId
    );
    const quizCount = overrides.quizCount ?? 0;
    const id = overrides.id ?? generateId(QUIZ_SESSION_ID_PREFIX);
    return await this.quizSessionRepo.insertSession({
      chapterId: overrides.chapterId ?? null,
      completedAt: overrides.completedAt ?? null,
      correctCount: overrides.correctCount ?? null,
      failingChapterIds: overrides.failingChapterIds ?? null,
      id,
      incorrectQuizIds: overrides.incorrectQuizIds ?? null,
      lastAnsweredAt: overrides.lastAnsweredAt ?? null,
      lastQuestionText: overrides.lastQuestionText ?? null,
      quizCount,
      score: overrides.score ?? null,
      status: overrides.status ?? "ACTIVE",
      studySetId,
      totalQuestions: overrides.totalQuestions ?? null,
      userId: overrides.userId ?? this.ownerId,
    });
  }

  async seedQuizSessionAnswer(
    overrides: Partial<QuizSessionAnswer> = {}
  ): Promise<QuizSessionAnswer> {
    // oxlint-disable-next-line unicorn/no-await-expression-member
    const sessionId = overrides.sessionId ?? (await this.seedQuizSession()).id;
    // oxlint-disable-next-line unicorn/no-await-expression-member
    const quizId = overrides.quizId ?? (await this.seedQuiz()).id;
    const id = overrides.id ?? generateId(QUIZ_SESSION_ANSWER_ID_PREFIX);
    return await this.quizSessionRepo.upsertAnswer({
      id,
      quizId,
      selectedOptionIds: overrides.selectedOptionIds ?? [],
      sessionId,
    });
  }

  // oxlint-disable-next-line require-await
  async [Symbol.asyncDispose](): Promise<void> {
    this.db.$client.close();
  }
}
