import { ORPCError } from "@orpc/server";
import { describe, it } from "vitest";

import type { QuizOption } from "../../infras/db/schema/quiz.ts";
import type { StudySet } from "../../infras/db/schema/study-set.ts";
import type { QuizWithOptions } from "../quiz/quiz.repository.ts";
import type { QuizSessionGuard } from "./quiz-session.guard.ts";
import { QuizSessionService } from "./quiz-session.service.ts";
import {
  captureError,
  createMockGuard,
  createMockRepository,
  createQuizSessionFixture,
  createQuizSessionAnswerFixture,
} from "./quiz-session.testing.ts";

const createStudySetFixture = (
  overrides: Partial<StudySet> = {}
): StudySet => ({
  createdAt: new Date(),
  deletedAt: null,
  description: null,
  files: [],
  id: "sts_test123",
  ownerId: "owner-1",
  slug: "test-slug-abc123",
  title: "Test Set",
  updatedAt: new Date(),
  visibility: "PUBLIC",
  ...overrides,
});

const createQuizOptionFixture = (
  overrides: Partial<QuizOption> = {}
): QuizOption => ({
  createdAt: new Date(),
  explanation: null,
  id: "qzo_test123",
  isCorrect: false,
  optionText: "Test option",
  quizId: "qiz_test123",
  updatedAt: new Date(),
  ...overrides,
});

const createQuizWithOptionsFixture = (
  overrides: Partial<QuizWithOptions> = {}
): QuizWithOptions => ({
  chapterId: null,
  createdAt: new Date(),
  id: "qiz_test123",
  options: [],
  ownerId: "owner-1",
  questionText: "Test question?",
  studySetId: "sts_test123",
  type: "MULTIPLE_CHOICE",
  updatedAt: new Date(),
  ...overrides,
});

const setupService = () => {
  const repo = createMockRepository();
  const guard = createMockGuard();

  // Repo defaults
  repo.insertSession.mockImplementation(
    // oxlint-disable-next-line require-await
    async (row) => ({
      ...createQuizSessionFixture(),
      ...row,
    })
  );
  repo.updateSession.mockImplementation(
    // oxlint-disable-next-line require-await
    async (_id, _userId, patch) => ({
      ...createQuizSessionFixture(),
      ...patch,
    })
  );
  repo.findSessionById.mockResolvedValue(null);
  repo.findSessionsByStudySetAndUser.mockResolvedValue([]);
  repo.countQuizzesInScope.mockResolvedValue(0);
  repo.findQuizzesWithOptionsInScope.mockResolvedValue([]);
  repo.findQuizById.mockResolvedValue(null);
  repo.findQuizByIdInScope.mockResolvedValue(null);
  repo.findQuizOptionsByQuizId.mockResolvedValue([]);
  repo.findChapterById.mockResolvedValue(null);
  repo.upsertAnswer.mockResolvedValue(createQuizSessionAnswerFixture());
  repo.findAnswersBySession.mockResolvedValue([]);
  repo.findAnswerBySessionAndQuiz.mockResolvedValue(null);
  repo.deleteExpiredSessionsAndOrphans.mockResolvedValue(0);

  // Guard defaults
  guard.requireUser.mockImplementation((id) => {
    if (id === null || id === undefined) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Authentication is required",
      });
    }
    return id;
  });
  guard.assertSessionOwnerOrNotFound.mockResolvedValue(
    createQuizSessionFixture()
  );
  guard.assertStudySetVisibleOrNotFound.mockResolvedValue(
    createStudySetFixture()
  );
  guard.assertChapterInStudySetOrValidationFailed.mockResolvedValue();
  guard.assertQuizInSessionScopeOrValidationFailed.mockResolvedValue();
  guard.assertQuizOptionsValidOrValidationFailed.mockResolvedValue();

  const service = new QuizSessionService(
    repo,
    guard as unknown as QuizSessionGuard
  ); // oxlint-disable-line no-unsafe-type-assertion
  return { guard, repo, service };
};

const mockRejectedNotFound = new ORPCError("NOT_FOUND", {
  message: "Not found",
});
const mockRejectedValidationFailed = new ORPCError("VALIDATION_FAILED", {
  message: "Validation failed",
});

describe.concurrent(QuizSessionService, () => {
  describe("createQuizSession", () => {
    it("creates session with quizCount snapshot", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.countQuizzesInScope.mockResolvedValue(5);
      const result = await service.createQuizSession(
        { studySetId: "sts_test123" },
        "user-1"
      );
      expect(result.quizCount).toBe(5);
      expect(result.status).toBe("ACTIVE");
      expect(result.score).toBeNull();
      expect(repo.insertSession).toHaveBeenCalledOnce();
    });

    it("throws UNAUTHORIZED when user is null", async ({ expect }) => {
      const { service } = setupService();
      const error = await captureError(
        service.createQuizSession({ studySetId: "sts_test123" }, null)
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("throws NOT_FOUND when study set is not visible", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.assertStudySetVisibleOrNotFound.mockRejectedValue(
        mockRejectedNotFound
      );
      const error = await captureError(
        service.createQuizSession({ studySetId: "sts_test123" }, "user-1")
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws VALIDATION_FAILED when chapter does not belong to study set", async ({
      expect,
    }) => {
      const { guard, service } = setupService();
      guard.assertChapterInStudySetOrValidationFailed.mockRejectedValue(
        mockRejectedValidationFailed
      );
      const error = await captureError(
        service.createQuizSession(
          { chapterId: "chp_test123", studySetId: "sts_test123" },
          "user-1"
        )
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "VALIDATION_FAILED" });
    });
  });

  describe("submitAnswer", () => {
    it("upserts answer and updates session denormalized fields", async ({
      expect,
    }) => {
      const { guard, repo, service } = setupService();
      const session = createQuizSessionFixture({ status: "ACTIVE" });
      guard.assertSessionOwnerOrNotFound.mockResolvedValue(session);
      repo.findQuizById.mockResolvedValue(
        createQuizWithOptionsFixture({ questionText: "Sample?" })
      );
      const result = await service.submitAnswer(
        {
          quizId: "qiz_test123",
          selectedOptionIds: ["qzo_test123"],
          sessionId: "qse_test123",
        },
        "user-1"
      );
      expect(result.lastQuestionText).not.toBeNull();
      expect(repo.upsertAnswer).toHaveBeenCalledOnce();
      expect(repo.updateSession).toHaveBeenCalledOnce();
    });

    it("throws SESSION_ALREADY_COMPLETED when session is completed", async ({
      expect,
    }) => {
      const { guard, service } = setupService();
      guard.assertSessionOwnerOrNotFound.mockResolvedValue(
        createQuizSessionFixture({ status: "COMPLETED" })
      );
      const error = await captureError(
        service.submitAnswer(
          {
            quizId: "qiz_test123",
            selectedOptionIds: [],
            sessionId: "qse_test123",
          },
          "user-1"
        )
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "SESSION_ALREADY_COMPLETED" });
    });

    it("throws VALIDATION_FAILED when quiz is not in session scope", async ({
      expect,
    }) => {
      const { guard, service } = setupService();
      guard.assertQuizInSessionScopeOrValidationFailed.mockRejectedValue(
        mockRejectedValidationFailed
      );
      const error = await captureError(
        service.submitAnswer(
          {
            quizId: "qiz_test123",
            selectedOptionIds: [],
            sessionId: "qse_test123",
          },
          "user-1"
        )
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "VALIDATION_FAILED" });
    });

    it("throws VALIDATION_FAILED when option IDs are invalid", async ({
      expect,
    }) => {
      const { guard, service } = setupService();
      guard.assertQuizOptionsValidOrValidationFailed.mockRejectedValue(
        mockRejectedValidationFailed
      );
      const error = await captureError(
        service.submitAnswer(
          {
            quizId: "qiz_test123",
            selectedOptionIds: ["invalid"],
            sessionId: "qse_test123",
          },
          "user-1"
        )
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "VALIDATION_FAILED" });
    });
  });

  describe("completeQuizSession", () => {
    it("computes score and results on completion", async ({ expect }) => {
      const { guard, repo, service } = setupService();
      const session = createQuizSessionFixture({ status: "ACTIVE" });
      const quiz = createQuizWithOptionsFixture({
        chapterId: null,
        id: "qiz_1",
        options: [
          createQuizOptionFixture({
            id: "qzo_1",
            isCorrect: true,
            quizId: "qiz_1",
          }),
        ],
      });
      const answer = createQuizSessionAnswerFixture({
        quizId: "qiz_1",
        selectedOptionIds: ["qzo_1"],
      });
      guard.assertSessionOwnerOrNotFound.mockResolvedValue(session);
      repo.findQuizzesWithOptionsInScope.mockResolvedValue([quiz]);
      repo.findAnswersBySession.mockResolvedValue([answer]);
      repo.updateSession.mockResolvedValue({
        ...session,
        correctCount: 1,
        failingChapterIds: [],
        incorrectQuizIds: [],
        score: 100,
        status: "COMPLETED",
        totalQuestions: 1,
      });
      const result = await service.completeQuizSession(
        { sessionId: "qse_test123" },
        "user-1"
      );
      expect(result.status).toBe("COMPLETED");
      expect(result.score).toBe(100);
    });

    it("is idempotent when already completed", async ({ expect }) => {
      const { guard, service } = setupService();
      const session = createQuizSessionFixture({
        score: 75,
        status: "COMPLETED",
      });
      guard.assertSessionOwnerOrNotFound.mockResolvedValue(session);
      const result = await service.completeQuizSession(
        { sessionId: "qse_test123" },
        "user-1"
      );
      expect(result.status).toBe("COMPLETED");
      expect(result.score).toBe(75);
    });

    it("handles empty session (zero answers)", async ({ expect }) => {
      const { guard, repo, service } = setupService();
      const session = createQuizSessionFixture({ status: "ACTIVE" });
      const quiz = createQuizWithOptionsFixture({
        chapterId: null,
        id: "qiz_1",
        options: [],
      });
      guard.assertSessionOwnerOrNotFound.mockResolvedValue(session);
      repo.findQuizzesWithOptionsInScope.mockResolvedValue([quiz]);
      repo.findAnswersBySession.mockResolvedValue([]);
      repo.updateSession.mockResolvedValue({
        ...session,
        correctCount: 0,
        failingChapterIds: [],
        incorrectQuizIds: ["qiz_1"],
        score: 0,
        status: "COMPLETED",
        totalQuestions: 1,
      });
      const result = await service.completeQuizSession(
        { sessionId: "qse_test123" },
        "user-1"
      );
      expect(result.score).toBe(0);
      expect(result.correctCount).toBe(0);
    });
  });

  describe("getQuizSessionQuestions", () => {
    it("returns shuffled quizzes with currentAnswer", async ({ expect }) => {
      const { guard, repo, service } = setupService();
      const session = createQuizSessionFixture({ status: "ACTIVE" });
      const quiz = createQuizWithOptionsFixture({
        chapterId: null,
        id: "qiz_1",
        options: [],
      });
      const answer = createQuizSessionAnswerFixture({
        quizId: "qiz_1",
        selectedOptionIds: ["qzo_1"],
      });
      guard.assertSessionOwnerOrNotFound.mockResolvedValue(session);
      repo.findQuizzesWithOptionsInScope.mockResolvedValue([quiz]);
      repo.findAnswersBySession.mockResolvedValue([answer]);
      const result = await service.getQuizSessionQuestions(
        { sessionId: "qse_test123" },
        "user-1"
      );
      expect(result).toHaveLength(1);
      expect(result[0]?.currentAnswer).toEqual(["qzo_1"]);
    });

    it("returns empty array for empty scope", async ({ expect }) => {
      const { guard, repo, service } = setupService();
      const session = createQuizSessionFixture({ status: "ACTIVE" });
      guard.assertSessionOwnerOrNotFound.mockResolvedValue(session);
      repo.findQuizzesWithOptionsInScope.mockResolvedValue([]);
      const result = await service.getQuizSessionQuestions(
        { sessionId: "qse_test123" },
        "user-1"
      );
      expect(result).toHaveLength(0);
    });
  });

  describe("getQuizSessionResults", () => {
    it("returns live results for ACTIVE session", async ({ expect }) => {
      const { guard, repo, service } = setupService();
      const session = createQuizSessionFixture({ status: "ACTIVE" });
      const quiz = createQuizWithOptionsFixture({
        chapterId: null,
        id: "qiz_1",
        options: [
          createQuizOptionFixture({
            id: "qzo_1",
            isCorrect: true,
            quizId: "qiz_1",
          }),
        ],
      });
      const answer = createQuizSessionAnswerFixture({
        quizId: "qiz_1",
        selectedOptionIds: ["qzo_1"],
      });
      guard.assertSessionOwnerOrNotFound.mockResolvedValue(session);
      repo.findQuizzesWithOptionsInScope.mockResolvedValue([quiz]);
      repo.findAnswersBySession.mockResolvedValue([answer]);
      const result = await service.getQuizSessionResults(
        { sessionId: "qse_test123" },
        "user-1"
      );
      expect(result.score).toBe(100);
      expect(result.correctCount).toBe(1);
      expect(result.incorrectQuestions).toHaveLength(0);
    });

    it("returns stored snapshot for COMPLETED session", async ({ expect }) => {
      const { guard, repo, service } = setupService();
      const session = createQuizSessionFixture({
        correctCount: 1,
        failingChapterIds: [],
        incorrectQuizIds: ["qiz_1"],
        score: 50,
        status: "COMPLETED",
        totalQuestions: 2,
      });
      const quiz = createQuizWithOptionsFixture({
        chapterId: null,
        id: "qiz_1",
        options: [],
      });
      guard.assertSessionOwnerOrNotFound.mockResolvedValue(session);
      repo.findQuizzesWithOptionsInScope.mockResolvedValue([quiz]);
      repo.findAnswersBySession.mockResolvedValue([]);
      const result = await service.getQuizSessionResults(
        { sessionId: "qse_test123" },
        "user-1"
      );
      expect(result.score).toBe(50);
      expect(result.incorrectQuestions).toHaveLength(1);
    });
  });

  describe("listQuizSessions", () => {
    it("returns sessions sorted by createdAt desc", async ({ expect }) => {
      const { repo, service } = setupService();
      const session1 = createQuizSessionFixture({
        createdAt: new Date(1000),
        id: "qse_1",
      });
      const session2 = createQuizSessionFixture({
        createdAt: new Date(2000),
        id: "qse_2",
      });
      repo.findSessionsByStudySetAndUser.mockResolvedValue([
        session2,
        session1,
      ]);
      const result = await service.listQuizSessions(
        { studySetId: "sts_test123" },
        "user-1"
      );
      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe("qse_2");
    });
  });
});
