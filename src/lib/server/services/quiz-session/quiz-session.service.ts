import type {
  CompleteQuizSessionInput,
  CreateQuizSessionInput,
  GetQuizSessionInput,
  GetQuizSessionQuestionsInput,
  GetQuizSessionResultsInput,
  ListQuizSessionsInput,
  SubmitAnswerInput,
} from "$lib/schemas/quiz-session";
import {
  QUIZ_SESSION_ANSWER_ID_PREFIX,
  QUIZ_SESSION_ID_PREFIX,
  QUIZ_SESSION_QUIZ_ID_PREFIX,
  QUIZ_SESSION_QUIZ_OPTION_ID_PREFIX,
} from "$lib/schemas/quiz-session.constant";
import { ORPCError } from "@orpc/server";

import { Rng } from "../../../utils/rng.ts";
import type {
  QuizSession,
  QuizSessionAnswer,
  QuizSessionQuiz,
  QuizSessionQuizOption,
} from "../../infras/db/schema/quiz-session.ts";
import { generateId } from "../../utils/nanoid.ts";
import type { QuizRepository } from "../quiz/quiz.repository.ts";
import type { QuizSessionGuard } from "./quiz-session.guard.ts";
import type {
  NewQuizSessionQuizOptionRow,
  NewQuizSessionQuizRow,
  QuizSessionQuestionItem,
  QuizSessionQuizWithOptions,
  QuizSessionRepository,
} from "./quiz-session.repository.ts";
import {
  computeFailingChapters,
  computeScore,
  scoreAnswer,
} from "./quiz-session.scoring.ts";

export type {
  QuizSession,
  QuizSessionAnswer,
  QuizSessionQuiz,
  QuizSessionQuizOption,
  QuizSessionQuizWithOptions,
};

export class QuizSessionService {
  private readonly repo: QuizSessionRepository;
  private readonly guard: QuizSessionGuard;
  private readonly quizRepo: QuizRepository;

  constructor(
    repo: QuizSessionRepository,
    guard: QuizSessionGuard,
    quizRepo: QuizRepository
  ) {
    this.repo = repo;
    this.guard = guard;
    this.quizRepo = quizRepo;
  }

  async createSession(
    input: CreateQuizSessionInput,
    userId: string | null | undefined
  ): Promise<QuizSession> {
    const ownerId = this.guard.requireUser(userId);
    await this.guard.assertStudySetVisibleOrNotFound(input.studySetId, ownerId);

    if (input.chapterId !== undefined) {
      await this.guard.assertChapterBelongsToStudySetOrValidationFailed(
        input.chapterId,
        input.studySetId
      );
    }

    const sourceQuizzes = await this.quizRepo.findQuizzesByStudySetId(
      input.studySetId
    );

    const filtered =
      input.chapterId === undefined
        ? sourceQuizzes
        : sourceQuizzes.filter((q) => q.chapterId === input.chapterId);

    const quizCount = filtered.length;
    const sessionId = generateId(QUIZ_SESSION_ID_PREFIX);

    const sessionQuizzes: NewQuizSessionQuizRow[] = [];
    const sessionQuizOptions: NewQuizSessionQuizOptionRow[] = [];

    for (const [i, quiz] of filtered.entries()) {
      const sessionQuizId = generateId(QUIZ_SESSION_QUIZ_ID_PREFIX);
      sessionQuizzes.push({
        chapterId: quiz.chapterId,
        id: sessionQuizId,
        originalQuizId: quiz.id,
        position: i,
        questionText: quiz.questionText,
        sessionId,
        type: quiz.type,
      });

      for (const [j, opt] of quiz.options.entries()) {
        sessionQuizOptions.push({
          explanation: opt.explanation,
          id: generateId(QUIZ_SESSION_QUIZ_OPTION_ID_PREFIX),
          isCorrect: opt.isCorrect,
          optionText: opt.optionText,
          position: j,
          sessionQuizId,
        });
      }
    }

    return await this.repo.insertSessionWithQuizzes(
      {
        chapterId: input.chapterId ?? null,
        id: sessionId,
        quizCount,
        status: "ACTIVE",
        studySetId: input.studySetId,
        userId: ownerId,
      },
      sessionQuizzes,
      sessionQuizOptions
    );
  }

  async submitAnswer(
    input: SubmitAnswerInput,
    userId: string | null | undefined
  ): Promise<QuizSessionAnswer> {
    const ownerId = this.guard.requireUser(userId);
    const session = await this.guard.assertSessionOwnerOrNotFound(
      input.sessionId,
      ownerId
    );
    this.guard.assertSessionActive(session);

    const sessionQuiz = await this.guard.assertQuizInSessionOrValidationFailed(
      input.sessionQuizId,
      session.id
    );

    await this.guard.assertOptionsBelongToSessionQuizOrValidationFailed(
      input.selectedOptionIds,
      sessionQuiz.id
    );

    const answer = await this.repo.upsertAnswer({
      id: generateId(QUIZ_SESSION_ANSWER_ID_PREFIX),
      selectedOptionIds: input.selectedOptionIds,
      sessionId: session.id,
      sessionQuizId: sessionQuiz.id,
    });

    const updated = await this.repo.updateSession(session.id, ownerId, {
      lastAnsweredAt: new Date(),
      lastQuestionText: sessionQuiz.questionText,
      updatedAt: new Date(),
    });

    if (!updated) {
      throw new ORPCError("NOT_FOUND", { message: "Quiz session not found" });
    }

    return answer;
  }

  async completeSession(
    input: CompleteQuizSessionInput,
    userId: string | null | undefined
  ): Promise<QuizSession> {
    const ownerId = this.guard.requireUser(userId);
    const session = await this.guard.assertSessionOwnerOrNotFound(
      input.sessionId,
      ownerId
    );

    if (session.status === "COMPLETED") {
      return session;
    }

    const answers = await this.repo.findAnswersBySessionId(session.id);
    const quizzes = await this.repo.findSessionQuizzesWithOptions(session.id);

    const answerMap = new Map(answers.map((a) => [a.sessionQuizId, a]));
    let correctCount = 0;
    const incorrectQuizIds: string[] = [];
    const totalQuestions = quizzes.length;

    for (const quiz of quizzes) {
      const answer = answerMap.get(quiz.id);
      if (!answer) {
        incorrectQuizIds.push(quiz.id);
        continue;
      }
      const isCorrect = scoreAnswer(
        quiz.type,
        quiz.options,
        answer.selectedOptionIds
      );
      if (isCorrect) {
        correctCount += 1;
      } else {
        incorrectQuizIds.push(quiz.id);
      }
    }

    const score = computeScore(correctCount, totalQuestions);
    const failingChapterIds =
      session.chapterId === null || session.chapterId === undefined
        ? []
        : computeFailingChapters(incorrectQuizIds, quizzes);

    const updated = await this.repo.updateSession(session.id, ownerId, {
      completedAt: new Date(),
      correctCount,
      failingChapterIds,
      incorrectQuizIds,
      score,
      status: "COMPLETED",
      totalQuestions,
      updatedAt: new Date(),
    });

    if (!updated) {
      throw new ORPCError("NOT_FOUND", { message: "Quiz session not found" });
    }

    return updated;
  }

  async getSession(
    input: GetQuizSessionInput,
    userId: string | null | undefined
  ): Promise<QuizSession> {
    const ownerId = this.guard.requireUser(userId);
    return await this.guard.assertSessionOwnerOrNotFound(
      input.sessionId,
      ownerId
    );
  }

  async getQuestions(
    input: GetQuizSessionQuestionsInput,
    userId: string | null | undefined
  ): Promise<QuizSessionQuestionItem[]> {
    const ownerId = this.guard.requireUser(userId);
    await this.guard.assertSessionOwnerOrNotFound(input.sessionId, ownerId);

    const quizzes = await this.repo.findSessionQuizzesWithOptions(
      input.sessionId
    );
    const answers = await this.repo.findAnswersBySessionId(input.sessionId);
    const answerMap = new Map(answers.map((a) => [a.sessionQuizId, a]));

    const shuffled = new Rng(input.sessionId).shuffle(quizzes);

    return shuffled.map((quiz) => ({
      ...quiz,
      currentAnswer: answerMap.get(quiz.id)?.selectedOptionIds ?? null,
    }));
  }

  async getResults(
    input: GetQuizSessionResultsInput,
    userId: string | null | undefined
  ): Promise<{
    correctCount: number;
    failingChapterIds: string[];
    incorrectQuestions: QuizSessionQuestionItem[];
    score: number;
    totalQuestions: number;
  }> {
    const ownerId = this.guard.requireUser(userId);
    const session = await this.guard.assertSessionOwnerOrNotFound(
      input.sessionId,
      ownerId
    );

    if (session.status === "COMPLETED") {
      const answers = await this.repo.findAnswersBySessionId(session.id);
      const answerMap = new Map(answers.map((a) => [a.sessionQuizId, a]));
      const storedIncorrectIds = session.incorrectQuizIds ?? [];
      const incorrectSet = new Set(storedIncorrectIds);
      const quizzes = await this.repo.findSessionQuizzesWithOptions(session.id);

      const incorrectQuestions = quizzes
        .filter((q) => incorrectSet.has(q.id))
        .map((q) => ({
          ...q,
          currentAnswer: answerMap.get(q.id)?.selectedOptionIds ?? null,
        }));

      return {
        correctCount: session.correctCount ?? 0,
        failingChapterIds: session.failingChapterIds ?? [],
        incorrectQuestions,
        score: session.score ?? 0,
        totalQuestions: session.totalQuestions ?? 0,
      };
    }

    const answers = await this.repo.findAnswersBySessionId(session.id);
    const quizzes = await this.repo.findSessionQuizzesWithOptions(session.id);

    const answerMap = new Map(answers.map((a) => [a.sessionQuizId, a]));
    let correctCount = 0;
    const incorrectQuestions: QuizSessionQuestionItem[] = [];
    const incorrectQuizIds: string[] = [];

    for (const quiz of quizzes) {
      const answer = answerMap.get(quiz.id);
      const selectedOptionIds = answer?.selectedOptionIds ?? null;

      if (
        !answer ||
        !scoreAnswer(quiz.type, quiz.options, answer.selectedOptionIds)
      ) {
        incorrectQuestions.push({
          ...quiz,
          currentAnswer: selectedOptionIds,
        });
        incorrectQuizIds.push(quiz.id);
      } else {
        correctCount += 1;
      }
    }

    const totalQuestions = quizzes.length;
    const score = computeScore(correctCount, totalQuestions);
    const failingChapterIds =
      session.chapterId === null || session.chapterId === undefined
        ? []
        : computeFailingChapters(incorrectQuizIds, quizzes);

    return {
      correctCount,
      failingChapterIds,
      incorrectQuestions,
      score,
      totalQuestions,
    };
  }

  async listSessions(
    input: ListQuizSessionsInput,
    userId: string | null | undefined
  ): Promise<QuizSession[]> {
    const ownerId = this.guard.requireUser(userId);
    return await this.repo.findSessionsByStudySet(input.studySetId, ownerId);
  }

  async adminDeleteExpiredSessions(): Promise<{
    deletedCount: number;
  }> {
    const beforeTimestamp = Date.now() - 7_776_000_000;
    const deletedCount = await this.repo.deleteExpiredSessions(beforeTimestamp);
    return { deletedCount };
  }
}
