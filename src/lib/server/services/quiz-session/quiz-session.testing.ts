import { CHAPTER_ID_PREFIX } from "$lib/schemas/chapter";
import {
  QUIZ_SESSION_ANSWER_ID_PREFIX,
  QUIZ_SESSION_ID_PREFIX,
  QUIZ_SESSION_QUIZ_ID_PREFIX,
  QUIZ_SESSION_QUIZ_OPTION_ID_PREFIX,
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
  QuizSessionQuiz,
  QuizSessionQuizOption,
} from "../../infras/db/schema/quiz-session.ts";
import type { StudySet } from "../../infras/db/schema/study-set.ts";
import { generateId } from "../../utils/nanoid.ts";
import type { QuizSessionGuard } from "./quiz-session.guard.ts";
import { QuizSessionDrizzleRepository } from "./quiz-session.repository.drizzle.ts";
import type { QuizSessionRepository } from "./quiz-session.repository.ts";

export type MockedQuizSessionRepository = {
  [K in keyof QuizSessionRepository]: MockedFunction<QuizSessionRepository[K]>;
};

export const createMockRepository = (): MockedQuizSessionRepository => ({
  countQuizzesInScope: vi.fn<QuizSessionRepository["countQuizzesInScope"]>(),
  deleteExpiredSessions:
    vi.fn<QuizSessionRepository["deleteExpiredSessions"]>(),
  findAnswersBySessionId:
    vi.fn<QuizSessionRepository["findAnswersBySessionId"]>(),
  findSessionById: vi.fn<QuizSessionRepository["findSessionById"]>(),
  findSessionQuizById: vi.fn<QuizSessionRepository["findSessionQuizById"]>(),
  findSessionQuizOptionsByIds:
    vi.fn<QuizSessionRepository["findSessionQuizOptionsByIds"]>(),
  findSessionQuizzesWithOptions:
    vi.fn<QuizSessionRepository["findSessionQuizzesWithOptions"]>(),
  findSessionsByStudySet:
    vi.fn<QuizSessionRepository["findSessionsByStudySet"]>(),
  insertSessionWithQuizzes:
    vi.fn<QuizSessionRepository["insertSessionWithQuizzes"]>(),
  updateSession: vi.fn<QuizSessionRepository["updateSession"]>(),
  upsertAnswer: vi.fn<QuizSessionRepository["upsertAnswer"]>(),
});

export type MockedQuizSessionGuard = {
  [K in keyof QuizSessionGuard]: MockedFunction<QuizSessionGuard[K]>;
};

export const createMockGuard = (): MockedQuizSessionGuard => ({
  assertChapterBelongsToStudySetOrValidationFailed:
    vi.fn<
      QuizSessionGuard["assertChapterBelongsToStudySetOrValidationFailed"]
    >(),
  assertOptionsBelongToSessionQuizOrValidationFailed:
    vi.fn<
      QuizSessionGuard["assertOptionsBelongToSessionQuizOrValidationFailed"]
    >(),
  assertQuizInSessionOrValidationFailed:
    vi.fn<QuizSessionGuard["assertQuizInSessionOrValidationFailed"]>(),
  assertSessionActive: vi.fn<QuizSessionGuard["assertSessionActive"]>(),
  assertSessionOwnerOrNotFound:
    vi.fn<QuizSessionGuard["assertSessionOwnerOrNotFound"]>(),
  assertStudySetVisibleOrNotFound:
    vi.fn<QuizSessionGuard["assertStudySetVisibleOrNotFound"]>(),
  requireUser: vi.fn<QuizSessionGuard["requireUser"]>(),
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
  userId: "user-1",
  ...overrides,
});

export const createQuizSessionQuizFixture = (
  overrides: Partial<QuizSessionQuiz> = {}
): QuizSessionQuiz => ({
  chapterId: null,
  id: generateId(QUIZ_SESSION_QUIZ_ID_PREFIX),
  originalQuizId: null,
  position: 0,
  questionText: "Test question",
  sessionId: generateId(QUIZ_SESSION_ID_PREFIX),
  type: "MULTIPLE_CHOICE",
  ...overrides,
});

export const createQuizSessionQuizOptionFixture = (
  overrides: Partial<QuizSessionQuizOption> = {}
): QuizSessionQuizOption => ({
  explanation: null,
  id: generateId(QUIZ_SESSION_QUIZ_OPTION_ID_PREFIX),
  isCorrect: false,
  optionText: "Option text",
  position: 0,
  sessionQuizId: generateId(QUIZ_SESSION_QUIZ_ID_PREFIX),
  ...overrides,
});

export const createQuizSessionAnswerFixture = (
  overrides: Partial<QuizSessionAnswer> = {}
): QuizSessionAnswer => ({
  createdAt: new Date(),
  id: generateId(QUIZ_SESSION_ANSWER_ID_PREFIX),
  selectedOptionIds: [],
  sessionId: generateId(QUIZ_SESSION_ID_PREFIX),
  sessionQuizId: generateId(QUIZ_SESSION_QUIZ_ID_PREFIX),
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
  readonly repo: QuizSessionDrizzleRepository;
  readonly ownerId: string;
  readonly otherId: string;

  constructor() {
    this.db = getTestingDb();
    this.repo = new QuizSessionDrizzleRepository(this.db);
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

  async seedChapter(overrides: SeedChapterOptions = {}): Promise<Chapter> {
    const id = overrides.id ?? generateId(CHAPTER_ID_PREFIX);
    const seededSet = await this.seedStudySet({ ownerId: overrides.ownerId });
    const studySetId = overrides.studySetId ?? seededSet.id;
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

  async seedSession(
    overrides: Partial<QuizSession> = {}
  ): Promise<QuizSession> {
    const id = overrides.id ?? generateId(QUIZ_SESSION_ID_PREFIX);
    await this.repo.insertSessionWithQuizzes(
      {
        chapterId: overrides.chapterId ?? null,
        id,
        quizCount: overrides.quizCount ?? 0,
        status: overrides.status ?? "ACTIVE",
        studySetId: overrides.studySetId ?? generateId(STUDY_SET_ID_PREFIX),
        userId: overrides.userId ?? this.ownerId,
      },
      [],
      []
    );
    const row = await this.repo.findSessionById(id);
    if (!row) {
      throw new Error("Failed to seed quiz session");
    }
    return row;
  }

  async seedSessionQuiz(
    overrides: Partial<QuizSessionQuiz> = {}
  ): Promise<QuizSessionQuiz> {
    const seededSession = await this.seedSession();
    const sessionId = overrides.sessionId ?? seededSession.id;
    const id = overrides.id ?? generateId(QUIZ_SESSION_QUIZ_ID_PREFIX);
    await this.repo.insertSessionWithQuizzes(
      {
        id: sessionId,
        quizCount: 1,
        status: "ACTIVE",
        studySetId: generateId(STUDY_SET_ID_PREFIX),
        userId: this.ownerId,
      },
      [
        {
          chapterId: overrides.chapterId ?? null,
          id,
          originalQuizId: overrides.originalQuizId ?? null,
          position: overrides.position ?? 0,
          questionText: overrides.questionText ?? "Seeded question",
          sessionId,
          type: overrides.type ?? "MULTIPLE_CHOICE",
        },
      ],
      []
    );
    const row = await this.repo.findSessionQuizById(id);
    if (!row) {
      throw new Error("Failed to seed session quiz");
    }
    return row;
  }

  async seedSessionQuizOption(
    overrides: Partial<QuizSessionQuizOption> = {}
  ): Promise<QuizSessionQuizOption> {
    const seededQuiz = await this.seedSessionQuiz();
    const sessionQuizId = overrides.sessionQuizId ?? seededQuiz.id;
    const sessionQuiz = await this.repo.findSessionQuizById(sessionQuizId);
    if (!sessionQuiz) {
      throw new Error("Session quiz not found");
    }
    const id = overrides.id ?? generateId(QUIZ_SESSION_QUIZ_OPTION_ID_PREFIX);
    await this.repo.insertSessionWithQuizzes(
      {
        id: sessionQuiz.sessionId,
        quizCount: 1,
        status: "ACTIVE",
        studySetId: generateId(STUDY_SET_ID_PREFIX),
        userId: this.ownerId,
      },
      [sessionQuiz],
      [
        {
          explanation: overrides.explanation ?? null,
          id,
          isCorrect: overrides.isCorrect ?? false,
          optionText: overrides.optionText ?? "Seeded option",
          position: overrides.position ?? 0,
          sessionQuizId,
        },
      ]
    );
    const [row] = await this.repo.findSessionQuizOptionsByIds([id]);
    if (!row) {
      throw new Error("Failed to seed session quiz option");
    }
    return row;
  }

  // oxlint-disable-next-line require-await
  async [Symbol.asyncDispose](): Promise<void> {
    this.db.$client.close();
  }
}
