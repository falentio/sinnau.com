import { QUIZ_SESSION_TTL_MS } from "$lib/schemas/quiz-session.constant";
import { Rng } from "$lib/utils/rng";
import { ORPCError } from "@orpc/server";
import { describe, it } from "vitest";

import type { StudySet } from "../../infras/db/schema/study-set.ts";
import type { QuizRepository } from "../quiz/quiz.repository.ts";
import {
  createMockRepository as createMockQuizRepository,
  createQuizFixture,
  createQuizOptionFixture,
} from "../quiz/quiz.testing.ts";
import type { QuizSessionGuard } from "./quiz-session.guard.ts";
import { QuizSessionService } from "./quiz-session.service.ts";
import {
  captureError,
  createMockGuard,
  createMockRepository,
  createQuizSessionAnswerFixture,
  createQuizSessionFixture,
  createQuizSessionQuizFixture,
  createQuizSessionQuizOptionFixture,
} from "./quiz-session.testing.ts";

const SAMPLE_STUDY_SET_ID = "sst_000000000000000001";
const SAMPLE_CHAPTER_ID = "chp_000000000000000001";
const SAMPLE_USER_ID = "user-1";

const setupService = () => {
  const repo = createMockRepository();
  const guard = createMockGuard();
  const quizRepo = createMockQuizRepository();

  // Repo defaults so individual tests only override the methods they care about.
  repo.countQuizzesInScope.mockResolvedValue(0);
  repo.deleteExpiredSessions.mockResolvedValue(0);
  repo.findAnswersBySessionId.mockResolvedValue([]);
  repo.findSessionById.mockResolvedValue(null);
  repo.findSessionQuizById.mockResolvedValue(null);
  repo.findSessionQuizOptionsByIds.mockResolvedValue([]);
  repo.findSessionQuizzesWithOptions.mockResolvedValue([]);
  repo.findSessionsByStudySet.mockResolvedValue([]);
  // oxlint-disable-next-line require-await
  repo.insertSessionWithQuizzes.mockImplementation(async (session) =>
    createQuizSessionFixture({ ...session })
  );
  repo.updateSession.mockResolvedValue(null);
  // oxlint-disable-next-line require-await
  repo.upsertAnswer.mockImplementation(async (row) =>
    createQuizSessionAnswerFixture({ ...row })
  );

  quizRepo.findQuizzesByStudySetId.mockResolvedValue([]);

  const sampleStudySet = {
    createdAt: new Date(),
    deletedAt: null,
    description: null,
    files: [],
    id: SAMPLE_STUDY_SET_ID,
    isAiGenerated: false,
    ownerId: SAMPLE_USER_ID,
    slug: "sample-set",
    title: "Sample",
    updatedAt: new Date(),
    visibility: "PRIVATE",
  } satisfies StudySet;

  // Guard defaults: happy-path passthrough so tests only configure failures explicitly.
  guard.requireUser.mockImplementation((id) => {
    // oxlint-disable-next-line typescript/strict-boolean-expressions
    if (!id) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Authentication is required",
      });
    }
    return id;
  });
  guard.assertStudySetVisibleOrNotFound.mockResolvedValue(sampleStudySet);
  guard.assertSessionOwnerOrNotFound.mockResolvedValue(
    createQuizSessionFixture({
      id: "qse_000000000000000001",
      status: "ACTIVE",
      userId: SAMPLE_USER_ID,
    })
  );
  guard.assertQuizInSessionOrValidationFailed.mockResolvedValue(
    createQuizSessionQuizFixture({
      id: "qsg_000000000000000001",
      sessionId: "qse_000000000000000001",
    })
  );
  guard.assertOptionsBelongToSessionQuizOrValidationFailed.mockResolvedValue(
    []
  );

  // oxlint-disable-next-line no-unsafe-type-assertion
  const service = new QuizSessionService(
    repo,
    // oxlint-disable-next-line no-unsafe-type-assertion
    guard as unknown as QuizSessionGuard,
    // oxlint-disable-next-line no-unsafe-type-assertion
    quizRepo as unknown as QuizRepository
  );
  return { guard, quizRepo, repo, service };
};

const throwUnauthorized = (): never => {
  throw new ORPCError("UNAUTHORIZED", {
    message: "Authentication is required",
  });
};

const throwNotFound = (): never => {
  throw new ORPCError("NOT_FOUND", { message: "Study set not found" });
};

const throwValidationFailed = (): never => {
  throw new ORPCError("VALIDATION_FAILED", {
    message: "Chapter does not belong to the study set",
  });
};

const throwSessionAlreadyCompleted = (): never => {
  throw new ORPCError("SESSION_ALREADY_COMPLETED", {
    message: "Cannot modify a completed session",
  });
};

describe.concurrent(QuizSessionService, () => {
  describe("createSession", () => {
    it("propagates UNAUTHORIZED from requireUser", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.requireUser.mockImplementation(throwUnauthorized);

      const error = await captureError(
        service.createSession({ studySetId: SAMPLE_STUDY_SET_ID }, null)
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "UNAUTHORIZED" });
      expect(guard.assertStudySetVisibleOrNotFound).not.toHaveBeenCalled();
    });

    it("propagates NOT_FOUND from assertStudySetVisibleOrNotFound", async ({
      expect,
    }) => {
      const { guard, service } = setupService();
      guard.assertStudySetVisibleOrNotFound.mockImplementation(throwNotFound);

      const error = await captureError(
        service.createSession(
          { studySetId: SAMPLE_STUDY_SET_ID },
          SAMPLE_USER_ID
        )
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "NOT_FOUND" });
    });

    it("propagates VALIDATION_FAILED when the chapter is not in the study set", async ({
      expect,
    }) => {
      const { guard, service } = setupService();
      guard.assertChapterBelongsToStudySetOrValidationFailed.mockImplementation(
        throwValidationFailed
      );

      const error = await captureError(
        service.createSession(
          {
            chapterId: SAMPLE_CHAPTER_ID,
            studySetId: SAMPLE_STUDY_SET_ID,
          },
          SAMPLE_USER_ID
        )
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "VALIDATION_FAILED" });
    });

    it("skips the chapter check when chapterId is omitted", async ({
      expect,
    }) => {
      const { guard, service } = setupService();
      await service.createSession(
        { studySetId: SAMPLE_STUDY_SET_ID },
        SAMPLE_USER_ID
      );
      expect(
        guard.assertChapterBelongsToStudySetOrValidationFailed
      ).not.toHaveBeenCalled();
    });

    it("copies all source quizzes, preserving chapter assignment, when no chapterId is provided", async ({
      expect,
    }) => {
      const { quizRepo, repo, service } = setupService();
      const sourceQuiz = createQuizFixture({
        chapterId: null,
        id: "qiz_000000000000000001",
        questionText: "Unscoped question",
        studySetId: SAMPLE_STUDY_SET_ID,
        type: "MULTIPLE_CHOICE",
      });
      const sourceOption = createQuizOptionFixture({
        explanation: "Because",
        id: "qzo_000000000000000001",
        isCorrect: true,
        optionText: "Yes",
        quizId: sourceQuiz.id,
      });
      const scopedQuiz = createQuizFixture({
        chapterId: SAMPLE_CHAPTER_ID,
        id: "qiz_000000000000000002",
        questionText: "Scoped question",
        studySetId: SAMPLE_STUDY_SET_ID,
        type: "MULTIPLE_CHOICE",
      });
      const scopedOption = createQuizOptionFixture({
        explanation: null,
        id: "qzo_000000000000000002",
        isCorrect: true,
        optionText: "Ok",
        quizId: scopedQuiz.id,
      });
      quizRepo.findQuizzesByStudySetId.mockResolvedValue([
        { ...sourceQuiz, options: [sourceOption] },
        { ...scopedQuiz, options: [scopedOption] },
      ]);

      const result = await service.createSession(
        { studySetId: SAMPLE_STUDY_SET_ID },
        SAMPLE_USER_ID
      );

      expect(result).toMatchObject({
        chapterId: null,
        quizCount: 2,
        status: "ACTIVE",
        studySetId: SAMPLE_STUDY_SET_ID,
        userId: SAMPLE_USER_ID,
      });
      expect(repo.insertSessionWithQuizzes).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          chapterId: null,
          quizCount: 2,
          status: "ACTIVE",
          studySetId: SAMPLE_STUDY_SET_ID,
          userId: SAMPLE_USER_ID,
        }),
        expect.arrayContaining([
          expect.objectContaining({
            chapterId: null,
            originalQuizId: sourceQuiz.id,
            position: 0,
            questionText: "Unscoped question",
            type: "MULTIPLE_CHOICE",
          }),
          expect.objectContaining({
            chapterId: SAMPLE_CHAPTER_ID,
            originalQuizId: scopedQuiz.id,
            position: 1,
            questionText: "Scoped question",
            type: "MULTIPLE_CHOICE",
          }),
        ]),
        expect.arrayContaining([
          expect.objectContaining({
            explanation: "Because",
            isCorrect: true,
            optionText: "Yes",
            position: 0,
          }),
          expect.objectContaining({
            explanation: null,
            isCorrect: true,
            optionText: "Ok",
            position: 0,
          }),
        ])
      );
    });

    it("filters to the chapter and stamps chapterId on the session when provided", async ({
      expect,
    }) => {
      const { quizRepo, repo, service } = setupService();
      const matchingQuiz = createQuizFixture({
        chapterId: SAMPLE_CHAPTER_ID,
        id: "qiz_000000000000000010",
        questionText: "In chapter",
        studySetId: SAMPLE_STUDY_SET_ID,
        type: "MULTIPLE_CHOICE",
      });
      const matchingOption = createQuizOptionFixture({
        id: "qzo_000000000000000010",
        isCorrect: true,
        optionText: "Correct",
        quizId: matchingQuiz.id,
      });
      const otherQuiz = createQuizFixture({
        chapterId: "chp_000000000000000999",
        id: "qiz_000000000000000011",
        questionText: "In other chapter",
        studySetId: SAMPLE_STUDY_SET_ID,
        type: "MULTIPLE_CHOICE",
      });
      const otherOption = createQuizOptionFixture({
        id: "qzo_000000000000000011",
        isCorrect: true,
        optionText: "Correct",
        quizId: otherQuiz.id,
      });
      quizRepo.findQuizzesByStudySetId.mockResolvedValue([
        { ...matchingQuiz, options: [matchingOption] },
        { ...otherQuiz, options: [otherOption] },
      ]);

      const result = await service.createSession(
        {
          chapterId: SAMPLE_CHAPTER_ID,
          studySetId: SAMPLE_STUDY_SET_ID,
        },
        SAMPLE_USER_ID
      );

      expect(result).toMatchObject({
        chapterId: SAMPLE_CHAPTER_ID,
        quizCount: 1,
      });
      const [sessionRow, sessionQuizzes, sessionOptions] =
        repo.insertSessionWithQuizzes.mock.calls[0] ?? [];
      expect(sessionRow).toMatchObject({
        chapterId: SAMPLE_CHAPTER_ID,
        quizCount: 1,
      });
      expect(sessionQuizzes).toHaveLength(1);
      expect(sessionQuizzes?.[0]).toMatchObject({
        chapterId: SAMPLE_CHAPTER_ID,
        originalQuizId: matchingQuiz.id,
        position: 0,
      });
      expect(sessionOptions).toHaveLength(1);
      expect(sessionOptions?.[0]).toMatchObject({
        isCorrect: true,
        optionText: "Correct",
        position: 0,
        sessionQuizId: sessionQuizzes?.[0]?.id,
      });
    });
  });

  describe("submitAnswer", () => {
    const sessionId = "qse_000000000000000001";
    const sessionQuizId = "qsg_000000000000000001";

    it("propagates UNAUTHORIZED from requireUser", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.requireUser.mockImplementation(throwUnauthorized);

      const error = await captureError(
        service.submitAnswer(
          {
            selectedOptionIds: ["qso_000000000000000001"],
            sessionId,
            sessionQuizId,
          },
          null
        )
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "UNAUTHORIZED" });
      expect(guard.assertSessionOwnerOrNotFound).not.toHaveBeenCalled();
    });

    it("propagates NOT_FOUND from assertSessionOwnerOrNotFound", async ({
      expect,
    }) => {
      const { guard, service } = setupService();
      guard.assertSessionOwnerOrNotFound.mockImplementation(throwNotFound);

      const error = await captureError(
        service.submitAnswer(
          {
            selectedOptionIds: ["qso_000000000000000001"],
            sessionId,
            sessionQuizId,
          },
          SAMPLE_USER_ID
        )
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "NOT_FOUND" });
    });

    it("propagates SESSION_ALREADY_COMPLETED from assertSessionActive", async ({
      expect,
    }) => {
      const { guard, service } = setupService();
      guard.assertSessionActive.mockImplementation(
        throwSessionAlreadyCompleted
      );

      const error = await captureError(
        service.submitAnswer(
          {
            selectedOptionIds: ["qso_000000000000000001"],
            sessionId,
            sessionQuizId,
          },
          SAMPLE_USER_ID
        )
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "SESSION_ALREADY_COMPLETED" });
      expect(
        guard.assertQuizInSessionOrValidationFailed
      ).not.toHaveBeenCalled();
    });

    it("propagates NOT_FOUND when the session quiz does not exist", async ({
      expect,
    }) => {
      const { guard, service } = setupService();
      guard.assertQuizInSessionOrValidationFailed.mockImplementation(
        throwNotFound
      );

      const error = await captureError(
        service.submitAnswer(
          {
            selectedOptionIds: ["qso_000000000000000001"],
            sessionId,
            sessionQuizId,
          },
          SAMPLE_USER_ID
        )
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "NOT_FOUND" });
    });

    it("propagates VALIDATION_FAILED when options do not belong to the quiz", async ({
      expect,
    }) => {
      const { guard, repo, service } = setupService();
      guard.assertOptionsBelongToSessionQuizOrValidationFailed.mockImplementation(
        throwValidationFailed
      );

      const error = await captureError(
        service.submitAnswer(
          {
            selectedOptionIds: ["qso_000000000000000001"],
            sessionId,
            sessionQuizId,
          },
          SAMPLE_USER_ID
        )
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "VALIDATION_FAILED" });
      expect(repo.upsertAnswer).not.toHaveBeenCalled();
    });

    it("throws NOT_FOUND when the final updateSession returns null", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.updateSession.mockResolvedValue(null);

      const error = await captureError(
        service.submitAnswer(
          {
            selectedOptionIds: ["qso_000000000000000001"],
            sessionId,
            sessionQuizId,
          },
          SAMPLE_USER_ID
        )
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "NOT_FOUND" });
    });

    it("upserts the answer, updates the session, and returns the answer on the happy path", async ({
      expect,
    }) => {
      const { guard, repo, service } = setupService();
      const sessionQuiz = createQuizSessionQuizFixture({
        id: sessionQuizId,
        questionText: "What is 2 + 2?",
        sessionId,
      });
      guard.assertQuizInSessionOrValidationFailed.mockResolvedValue(
        sessionQuiz
      );
      const insertedAnswer = createQuizSessionAnswerFixture({
        id: "qsa_000000000000000001",
        selectedOptionIds: ["qso_000000000000000001"],
        sessionId,
        sessionQuizId,
      });
      const updatedSession = createQuizSessionFixture({
        id: sessionId,
        lastQuestionText: "What is 2 + 2?",
        status: "ACTIVE",
        userId: SAMPLE_USER_ID,
      });
      repo.upsertAnswer.mockResolvedValue(insertedAnswer);
      repo.updateSession.mockResolvedValue(updatedSession);

      const result = await service.submitAnswer(
        {
          selectedOptionIds: ["qso_000000000000000001"],
          sessionId,
          sessionQuizId,
        },
        SAMPLE_USER_ID
      );

      expect(result).toBe(insertedAnswer);
      expect(repo.upsertAnswer).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedOptionIds: ["qso_000000000000000001"],
          sessionId,
          sessionQuizId,
        })
      );
      const [idArg, ownerArg, patch] = repo.updateSession.mock.calls[0] ?? [];
      expect(idArg).toBe(sessionId);
      expect(ownerArg).toBe(SAMPLE_USER_ID);
      expect(patch).toMatchObject({
        lastQuestionText: "What is 2 + 2?",
      });
      expect(patch?.lastAnsweredAt).toBeInstanceOf(Date);
      expect(patch?.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("completeSession", () => {
    const sessionId = "qse_000000000000000001";

    it("propagates UNAUTHORIZED from requireUser", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.requireUser.mockImplementation(throwUnauthorized);

      const error = await captureError(
        service.completeSession({ sessionId }, null)
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("propagates NOT_FOUND from assertSessionOwnerOrNotFound", async ({
      expect,
    }) => {
      const { guard, service } = setupService();
      guard.assertSessionOwnerOrNotFound.mockImplementation(throwNotFound);

      const error = await captureError(
        service.completeSession({ sessionId }, SAMPLE_USER_ID)
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "NOT_FOUND" });
    });

    it("returns the session immediately when it is already COMPLETED", async ({
      expect,
    }) => {
      const { guard, repo, service } = setupService();
      const completed = createQuizSessionFixture({
        correctCount: 4,
        id: sessionId,
        score: 80,
        status: "COMPLETED",
        totalQuestions: 5,
        userId: SAMPLE_USER_ID,
      });
      guard.assertSessionOwnerOrNotFound.mockResolvedValue(completed);

      const result = await service.completeSession(
        { sessionId },
        SAMPLE_USER_ID
      );
      expect(result).toBe(completed);
      expect(repo.findAnswersBySessionId).not.toHaveBeenCalled();
      expect(repo.findSessionQuizzesWithOptions).not.toHaveBeenCalled();
      expect(repo.updateSession).not.toHaveBeenCalled();
    });

    it("throws NOT_FOUND when the final updateSession returns null", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findSessionQuizzesWithOptions.mockResolvedValue([]);
      repo.findAnswersBySessionId.mockResolvedValue([]);
      repo.updateSession.mockResolvedValue(null);

      const error = await captureError(
        service.completeSession({ sessionId }, SAMPLE_USER_ID)
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "NOT_FOUND" });
    });

    it("computes score, totals, and failing chapters and persists the result", async ({
      expect,
    }) => {
      const { guard, repo, service } = setupService();
      guard.assertSessionOwnerOrNotFound.mockResolvedValue(
        createQuizSessionFixture({
          chapterId: SAMPLE_CHAPTER_ID,
          id: sessionId,
          status: "ACTIVE",
          userId: SAMPLE_USER_ID,
        })
      );

      const quizA = createQuizSessionQuizFixture({
        chapterId: SAMPLE_CHAPTER_ID,
        id: "qsg_0000000000000000a1",
        position: 0,
        questionText: "Q1",
        sessionId,
        type: "MULTIPLE_CHOICE",
      });
      const quizB = createQuizSessionQuizFixture({
        chapterId: SAMPLE_CHAPTER_ID,
        id: "qsg_0000000000000000b1",
        position: 1,
        questionText: "Q2",
        sessionId,
        type: "MULTIPLE_CHOICE",
      });
      const correctOption = createQuizSessionQuizOptionFixture({
        id: "qso_0000000000000corr",
        isCorrect: true,
        sessionQuizId: quizA.id,
      });
      const wrongOption = createQuizSessionQuizOptionFixture({
        id: "qso_0000000000000wrg1",
        isCorrect: true,
        sessionQuizId: quizB.id,
      });
      repo.findSessionQuizzesWithOptions.mockResolvedValue([
        { ...quizA, options: [correctOption] },
        { ...quizB, options: [wrongOption] },
      ]);
      repo.findAnswersBySessionId.mockResolvedValue([
        createQuizSessionAnswerFixture({
          selectedOptionIds: [correctOption.id],
          sessionId,
          sessionQuizId: quizA.id,
        }),
        createQuizSessionAnswerFixture({
          selectedOptionIds: ["qso_0000000000000miss"],
          sessionId,
          sessionQuizId: quizB.id,
        }),
      ]);
      const updated = createQuizSessionFixture({
        id: sessionId,
        status: "COMPLETED",
        userId: SAMPLE_USER_ID,
      });
      repo.updateSession.mockResolvedValue(updated);

      const result = await service.completeSession(
        { sessionId },
        SAMPLE_USER_ID
      );
      expect(result).toBe(updated);
      const [idArg, ownerArg, patch] = repo.updateSession.mock.calls[0] ?? [];
      expect(idArg).toBe(sessionId);
      expect(ownerArg).toBe(SAMPLE_USER_ID);
      expect(patch).toMatchObject({
        correctCount: 1,
        failingChapterIds: [SAMPLE_CHAPTER_ID],
        incorrectQuizIds: [quizB.id],
        score: 50,
        status: "COMPLETED",
        totalQuestions: 2,
      });
      expect(patch?.completedAt).toBeInstanceOf(Date);
      expect(patch?.updatedAt).toBeInstanceOf(Date);
    });

    it("treats missing answers as incorrect and skips failingChapterIds for chapterless sessions", async ({
      expect,
    }) => {
      const { guard, repo, service } = setupService();
      guard.assertSessionOwnerOrNotFound.mockResolvedValue(
        createQuizSessionFixture({
          chapterId: null,
          id: sessionId,
          status: "ACTIVE",
          userId: SAMPLE_USER_ID,
        })
      );

      const quiz = createQuizSessionQuizFixture({
        chapterId: SAMPLE_CHAPTER_ID,
        id: "qsg_0000000000000000c1",
        position: 0,
        questionText: "Q1",
        sessionId,
        type: "MULTIPLE_CHOICE",
      });
      const option = createQuizSessionQuizOptionFixture({
        id: "qso_00000000000000c1o",
        isCorrect: true,
        sessionQuizId: quiz.id,
      });
      repo.findSessionQuizzesWithOptions.mockResolvedValue([
        { ...quiz, options: [option] },
      ]);
      repo.findAnswersBySessionId.mockResolvedValue([]);
      repo.updateSession.mockResolvedValue(
        createQuizSessionFixture({
          id: sessionId,
          status: "COMPLETED",
          userId: SAMPLE_USER_ID,
        })
      );

      await service.completeSession({ sessionId }, SAMPLE_USER_ID);
      const patch = repo.updateSession.mock.calls[0]?.[2];
      expect(patch).toMatchObject({
        correctCount: 0,
        failingChapterIds: [],
        incorrectQuizIds: [quiz.id],
        score: 0,
        status: "COMPLETED",
        totalQuestions: 1,
      });
    });
  });

  describe("getSession", () => {
    it("propagates UNAUTHORIZED from requireUser", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.requireUser.mockImplementation(throwUnauthorized);

      const error = await captureError(
        service.getSession({ sessionId: "qse_000000000000000001" }, null)
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("returns the session returned by the guard", async ({ expect }) => {
      const { guard, service } = setupService();
      const session = createQuizSessionFixture({
        id: "qse_000000000000000001",
        userId: SAMPLE_USER_ID,
      });
      guard.assertSessionOwnerOrNotFound.mockResolvedValue(session);

      const result = await service.getSession(
        { sessionId: session.id },
        SAMPLE_USER_ID
      );
      expect(result).toBe(session);
      expect(guard.assertSessionOwnerOrNotFound).toHaveBeenCalledWith(
        session.id,
        SAMPLE_USER_ID
      );
    });
  });

  describe("getQuestions", () => {
    it("propagates UNAUTHORIZED from requireUser", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.requireUser.mockImplementation(throwUnauthorized);

      const error = await captureError(
        service.getQuestions({ sessionId: "qse_000000000000000001" }, null)
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("propagates NOT_FOUND from assertSessionOwnerOrNotFound", async ({
      expect,
    }) => {
      const { guard, service } = setupService();
      guard.assertSessionOwnerOrNotFound.mockImplementation(throwNotFound);

      const error = await captureError(
        service.getQuestions(
          { sessionId: "qse_000000000000000001" },
          SAMPLE_USER_ID
        )
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "NOT_FOUND" });
    });

    it("returns the quizzes shuffled with their current answers attached", async ({
      expect,
    }) => {
      const { guard, repo, service } = setupService();
      const sessionId = "qse_000000000000000001";
      guard.assertSessionOwnerOrNotFound.mockResolvedValue(
        createQuizSessionFixture({
          id: sessionId,
          userId: SAMPLE_USER_ID,
        })
      );
      const quizA = createQuizSessionQuizFixture({
        id: "qsg_0000000000000000a1",
        position: 0,
        questionText: "Q1",
        sessionId,
        type: "MULTIPLE_CHOICE",
      });
      const optionA = createQuizSessionQuizOptionFixture({
        id: "qso_0000000000000000a1",
        sessionQuizId: quizA.id,
      });
      const quizB = createQuizSessionQuizFixture({
        id: "qsg_0000000000000000b1",
        position: 1,
        questionText: "Q2",
        sessionId,
        type: "MULTIPLE_CHOICE",
      });
      const optionB = createQuizSessionQuizOptionFixture({
        id: "qso_0000000000000000b1",
        sessionQuizId: quizB.id,
      });
      const quizC = createQuizSessionQuizFixture({
        id: "qsg_0000000000000000c1",
        position: 2,
        questionText: "Q3",
        sessionId,
        type: "MULTIPLE_CHOICE",
      });
      const optionC = createQuizSessionQuizOptionFixture({
        id: "qso_0000000000000000c1",
        sessionQuizId: quizC.id,
      });
      const storedQuizzes = [
        { ...quizA, options: [optionA] },
        { ...quizB, options: [optionB] },
        { ...quizC, options: [optionC] },
      ];
      repo.findSessionQuizzesWithOptions.mockResolvedValue(storedQuizzes);
      const storedAnswers = [
        createQuizSessionAnswerFixture({
          selectedOptionIds: [optionA.id],
          sessionId,
          sessionQuizId: quizA.id,
        }),
      ];
      repo.findAnswersBySessionId.mockResolvedValue(storedAnswers);

      const result = await service.getQuestions({ sessionId }, SAMPLE_USER_ID);

      const answerMap = new Map(
        storedAnswers.map((a) => [a.sessionQuizId, a.selectedOptionIds])
      );
      const expected = new Rng(sessionId)
        .shuffle(storedQuizzes)
        .map((quiz) => ({
          ...quiz,
          currentAnswer: answerMap.get(quiz.id) ?? null,
        }));

      expect(result).toEqual(expected);
      const byId = new Map(result.map((q) => [q.id, q]));
      expect(byId.get(quizA.id)?.currentAnswer).toEqual([optionA.id]);
      expect(byId.get(quizB.id)?.currentAnswer).toBeNull();
      expect(byId.get(quizC.id)?.currentAnswer).toBeNull();
    });

    it("returns an empty list when no quizzes exist", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.assertSessionOwnerOrNotFound.mockResolvedValue(
        createQuizSessionFixture({
          id: "qse_000000000000000001",
          userId: SAMPLE_USER_ID,
        })
      );

      const result = await service.getQuestions(
        { sessionId: "qse_000000000000000001" },
        SAMPLE_USER_ID
      );
      expect(result).toEqual([]);
    });
  });

  describe("getResults", () => {
    const sessionId = "qse_000000000000000001";

    it("propagates UNAUTHORIZED from requireUser", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.requireUser.mockImplementation(throwUnauthorized);

      const error = await captureError(service.getResults({ sessionId }, null));
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("propagates NOT_FOUND from assertSessionOwnerOrNotFound", async ({
      expect,
    }) => {
      const { guard, service } = setupService();
      guard.assertSessionOwnerOrNotFound.mockImplementation(throwNotFound);

      const error = await captureError(
        service.getResults({ sessionId }, SAMPLE_USER_ID)
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "NOT_FOUND" });
    });

    it("returns the stored fields for a COMPLETED session", async ({
      expect,
    }) => {
      const { guard, repo, service } = setupService();
      const completed = createQuizSessionFixture({
        correctCount: 2,
        failingChapterIds: [SAMPLE_CHAPTER_ID],
        id: sessionId,
        incorrectQuizIds: ["qsg_0000000000000000b1"],
        score: 50,
        status: "COMPLETED",
        totalQuestions: 4,
        userId: SAMPLE_USER_ID,
      });
      guard.assertSessionOwnerOrNotFound.mockResolvedValue(completed);
      const quizA = createQuizSessionQuizFixture({
        id: "qsg_0000000000000000a1",
        position: 0,
        sessionId,
        type: "MULTIPLE_CHOICE",
      });
      const optionA = createQuizSessionQuizOptionFixture({
        id: "qso_0000000000000000a1",
        sessionQuizId: quizA.id,
      });
      const quizB = createQuizSessionQuizFixture({
        id: "qsg_0000000000000000b1",
        position: 1,
        sessionId,
        type: "MULTIPLE_CHOICE",
      });
      const optionB = createQuizSessionQuizOptionFixture({
        id: "qso_0000000000000000b1",
        sessionQuizId: quizB.id,
      });
      repo.findSessionQuizzesWithOptions.mockResolvedValue([
        { ...quizA, options: [optionA] },
        { ...quizB, options: [optionB] },
      ]);
      repo.findAnswersBySessionId.mockResolvedValue([
        createQuizSessionAnswerFixture({
          selectedOptionIds: [optionB.id],
          sessionId,
          sessionQuizId: quizB.id,
        }),
      ]);

      const result = await service.getResults({ sessionId }, SAMPLE_USER_ID);
      expect(result).toEqual({
        correctCount: 2,
        failingChapterIds: [SAMPLE_CHAPTER_ID],
        incorrectQuestions: [
          {
            ...quizB,
            currentAnswer: [optionB.id],
            options: [optionB],
          },
        ],
        score: 50,
        totalQuestions: 4,
      });
    });

    it("returns zeroed fields when a COMPLETED session has no stored totals", async ({
      expect,
    }) => {
      const { guard, repo, service } = setupService();
      const completed = createQuizSessionFixture({
        correctCount: null,
        failingChapterIds: null,
        id: sessionId,
        incorrectQuizIds: null,
        score: null,
        status: "COMPLETED",
        totalQuestions: null,
        userId: SAMPLE_USER_ID,
      });
      guard.assertSessionOwnerOrNotFound.mockResolvedValue(completed);
      repo.findSessionQuizzesWithOptions.mockResolvedValue([]);
      repo.findAnswersBySessionId.mockResolvedValue([]);

      const result = await service.getResults({ sessionId }, SAMPLE_USER_ID);
      expect(result).toEqual({
        correctCount: 0,
        failingChapterIds: [],
        incorrectQuestions: [],
        score: 0,
        totalQuestions: 0,
      });
    });

    it("computes the result live when the session is still ACTIVE", async ({
      expect,
    }) => {
      const { guard, repo, service } = setupService();
      guard.assertSessionOwnerOrNotFound.mockResolvedValue(
        createQuizSessionFixture({
          chapterId: SAMPLE_CHAPTER_ID,
          id: sessionId,
          status: "ACTIVE",
          userId: SAMPLE_USER_ID,
        })
      );
      const quizA = createQuizSessionQuizFixture({
        chapterId: SAMPLE_CHAPTER_ID,
        id: "qsg_0000000000000000a1",
        position: 0,
        sessionId,
        type: "MULTIPLE_CHOICE",
      });
      const quizB = createQuizSessionQuizFixture({
        chapterId: SAMPLE_CHAPTER_ID,
        id: "qsg_0000000000000000b1",
        position: 1,
        sessionId,
        type: "MULTIPLE_CHOICE",
      });
      const optionA = createQuizSessionQuizOptionFixture({
        id: "qso_0000000000000000a1",
        isCorrect: true,
        sessionQuizId: quizA.id,
      });
      const optionB = createQuizSessionQuizOptionFixture({
        id: "qso_0000000000000000b1",
        isCorrect: true,
        sessionQuizId: quizB.id,
      });
      repo.findSessionQuizzesWithOptions.mockResolvedValue([
        { ...quizA, options: [optionA] },
        { ...quizB, options: [optionB] },
      ]);
      repo.findAnswersBySessionId.mockResolvedValue([
        createQuizSessionAnswerFixture({
          selectedOptionIds: [optionA.id],
          sessionId,
          sessionQuizId: quizA.id,
        }),
      ]);

      const result = await service.getResults({ sessionId }, SAMPLE_USER_ID);
      expect(result).toMatchObject({
        correctCount: 1,
        failingChapterIds: [SAMPLE_CHAPTER_ID],
        score: 50,
        totalQuestions: 2,
      });
      expect(result.incorrectQuestions).toHaveLength(1);
      expect(result.incorrectQuestions[0]?.id).toBe(quizB.id);
      expect(result.incorrectQuestions[0]?.currentAnswer).toBeNull();
    });
  });

  describe("listSessions", () => {
    it("propagates UNAUTHORIZED from requireUser", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.requireUser.mockImplementation(throwUnauthorized);

      const error = await captureError(
        service.listSessions({ studySetId: SAMPLE_STUDY_SET_ID }, null)
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("forwards studySetId and ownerId to the repository and returns its result", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      const sessions = [
        createQuizSessionFixture({ id: "qse_000000000000000001" }),
        createQuizSessionFixture({ id: "qse_000000000000000002" }),
      ];
      repo.findSessionsByStudySet.mockResolvedValue(sessions);

      const result = await service.listSessions(
        { studySetId: SAMPLE_STUDY_SET_ID },
        SAMPLE_USER_ID
      );
      expect(result).toBe(sessions);
      expect(repo.findSessionsByStudySet).toHaveBeenCalledWith(
        SAMPLE_STUDY_SET_ID,
        SAMPLE_USER_ID
      );
    });
  });

  describe("countInScope", () => {
    it("throws UNAUTHORIZED when requireUser fails", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.requireUser.mockImplementation(throwUnauthorized);

      const error = await captureError(
        service.countInScope({ studySetId: SAMPLE_STUDY_SET_ID }, null)
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("throws NOT_FOUND when study set is not visible", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.assertStudySetVisibleOrNotFound.mockImplementation(throwNotFound);

      const error = await captureError(
        service.countInScope({ studySetId: SAMPLE_STUDY_SET_ID }, "user-1")
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "NOT_FOUND" });
    });

    it("returns { count } on the happy path with no chapterId", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.countQuizzesInScope.mockResolvedValue(7);

      const result = await service.countInScope(
        { studySetId: SAMPLE_STUDY_SET_ID },
        "user-1"
      );
      expect(result).toEqual({ count: 7 });
      expect(repo.countQuizzesInScope).toHaveBeenCalledWith(
        SAMPLE_STUDY_SET_ID,
        undefined
      );
    });

    it("passes chapterId through to the repository when provided", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.countQuizzesInScope.mockResolvedValue(3);

      const result = await service.countInScope(
        {
          chapterId: SAMPLE_CHAPTER_ID,
          studySetId: SAMPLE_STUDY_SET_ID,
        },
        "user-1"
      );
      expect(result).toEqual({ count: 3 });
      expect(repo.countQuizzesInScope).toHaveBeenCalledWith(
        SAMPLE_STUDY_SET_ID,
        SAMPLE_CHAPTER_ID
      );
    });
  });

  describe("adminDeleteExpiredSessions", () => {
    it("passes a TTL-based cutoff timestamp to the repository and reports the deleted count", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.deleteExpiredSessions.mockResolvedValue(2);
      const before = Date.now() - QUIZ_SESSION_TTL_MS;

      const result = await service.adminDeleteExpiredSessions();
      expect(result).toEqual({ deletedCount: 2 });
      expect(repo.deleteExpiredSessions).toHaveBeenCalledExactlyOnceWith(
        expect.any(Number)
      );
      const cutoff = repo.deleteExpiredSessions.mock.calls[0]?.[0];
      expect(cutoff).toBeGreaterThanOrEqual(before - 50);
      expect(cutoff).toBeLessThanOrEqual(before + 50);
    });
  });
});
