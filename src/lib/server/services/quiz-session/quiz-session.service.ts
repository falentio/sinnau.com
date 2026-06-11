import {
  QUIZ_SESSION_MAX_FAILING_CHAPTERS,
  QUIZ_SESSION_TTL_MS,
} from "$lib/schemas/quiz-session.constant";
import { ORPCError } from "@orpc/server";

import type {
  CompleteQuizSessionInput,
  CreateQuizSessionInput,
  GetQuizSessionInput,
  GetQuizSessionQuestionsInput,
  GetQuizSessionResultsInput,
  ListQuizSessionsInput,
  SubmitAnswerInput,
} from "../../../schemas/quiz-session.ts";
import { Rng } from "../../../utils/rng.ts";
import type { QuizSession } from "../../infras/db/schema/quiz-session.ts";
import { generateId } from "../../utils/nanoid.ts";
import type { QuizWithOptions } from "../quiz/quiz.repository.ts";
import type { QuizSessionGuard } from "./quiz-session.guard.ts";
import type { QuizSessionRepository } from "./quiz-session.repository.ts";

export type { QuizSession };

const getCorrectOptionIds = (quiz: QuizWithOptions): Set<string> =>
  new Set(quiz.options.filter((o) => o.isCorrect).map((o) => o.id));

const isAnswerCorrect = (
  quiz: QuizWithOptions,
  selectedOptionIds: string[]
): boolean => {
  const correctIds = getCorrectOptionIds(quiz);
  const selectedSet = new Set(selectedOptionIds);
  if (correctIds.size !== selectedSet.size) {
    return false;
  }
  for (const id of correctIds) {
    if (!selectedSet.has(id)) {
      return false;
    }
  }
  return true;
};

const computeFailingChapters = (
  incorrectQuizIds: string[],
  quizzes: QuizWithOptions[],
  maxCount: number
): string[] => {
  const chapterCounts = new Map<string, number>();
  const quizById = new Map(quizzes.map((q) => [q.id, q]));
  for (const quizId of incorrectQuizIds) {
    const quiz = quizById.get(quizId);
    if (
      quiz !== undefined &&
      quiz.chapterId !== null &&
      quiz.chapterId !== ""
    ) {
      chapterCounts.set(
        quiz.chapterId,
        (chapterCounts.get(quiz.chapterId) ?? 0) + 1
      );
    }
  }
  const sorted = [...chapterCounts.entries()].toSorted((a, b) => b[1] - a[1]);
  return sorted.slice(0, maxCount).map(([id]) => id);
};

export class QuizSessionService {
  private readonly repo: QuizSessionRepository;

  private readonly guard: QuizSessionGuard;

  constructor(repo: QuizSessionRepository, guard: QuizSessionGuard) {
    this.repo = repo;
    this.guard = guard;
  }

  async createQuizSession(
    input: CreateQuizSessionInput,
    userId: string | null | undefined
  ): Promise<QuizSession> {
    const user = this.guard.requireUser(userId);
    await this.guard.assertStudySetVisibleOrNotFound(input.studySetId, user);
    if (input.chapterId !== undefined) {
      await this.guard.assertChapterInStudySetOrValidationFailed(
        input.chapterId,
        input.studySetId
      );
    }
    const quizCount = await this.repo.countQuizzesInScope(
      input.studySetId,
      input.chapterId ?? null
    );
    return await this.repo.insertSession({
      chapterId: input.chapterId ?? null,
      completedAt: null,
      correctCount: null,
      failingChapterIds: null,
      id: generateId("qse"),
      incorrectQuizIds: null,
      lastAnsweredAt: null,
      lastQuestionText: null,
      quizCount,
      score: null,
      status: "ACTIVE",
      studySetId: input.studySetId,
      totalQuestions: null,
      userId: user,
    });
  }

  async submitAnswer(
    input: SubmitAnswerInput,
    userId: string | null | undefined
  ): Promise<QuizSession> {
    const user = this.guard.requireUser(userId);
    const session = await this.guard.assertSessionOwnerOrNotFound(
      input.sessionId,
      user
    );
    if (session.status === "COMPLETED") {
      throw new ORPCError("SESSION_ALREADY_COMPLETED", {
        message: "Session is already completed",
      });
    }
    await this.guard.assertQuizInSessionScopeOrValidationFailed(
      input.quizId,
      session.studySetId,
      session.chapterId
    );
    await this.guard.assertQuizOptionsValidOrValidationFailed(
      input.quizId,
      input.selectedOptionIds
    );
    const quiz = await this.repo.findQuizById(input.quizId);
    const questionText = quiz?.questionText ?? null;
    const now = new Date();
    await this.repo.upsertAnswer({
      id: generateId("qsa"),
      quizId: input.quizId,
      selectedOptionIds: input.selectedOptionIds,
      sessionId: input.sessionId,
    });
    const updated = await this.repo.updateSession(session.id, user, {
      lastAnsweredAt: now,
      lastQuestionText: questionText,
      updatedAt: now,
    });
    if (!updated) {
      throw new ORPCError("NOT_FOUND", {
        message: "Quiz session not found",
      });
    }
    return updated;
  }

  async completeQuizSession(
    input: CompleteQuizSessionInput,
    userId: string | null | undefined
  ): Promise<QuizSession> {
    const user = this.guard.requireUser(userId);
    const session = await this.guard.assertSessionOwnerOrNotFound(
      input.sessionId,
      user
    );
    if (session.status === "COMPLETED") {
      return session;
    }
    const quizzes = await this.repo.findQuizzesWithOptionsInScope(
      session.studySetId,
      session.chapterId
    );
    const answers = await this.repo.findAnswersBySession(session.id);
    const validAnswers = answers.filter(
      (a): a is typeof a & { quizId: string } => a.quizId !== null
    );
    const answerByQuizId = new Map(validAnswers.map((a) => [a.quizId, a]));
    const answeredQuizIds = new Set(validAnswers.map((a) => a.quizId));
    let correctCount = 0;
    const incorrectQuizIds: string[] = [];
    for (const quiz of quizzes) {
      const answer = answerByQuizId.get(quiz.id);
      if (answer && isAnswerCorrect(quiz, answer.selectedOptionIds)) {
        correctCount += 1;
      } else {
        incorrectQuizIds.push(quiz.id);
      }
    }
    const unansweredQuizIds = quizzes
      .map((q) => q.id)
      .filter((id) => !answeredQuizIds.has(id));
    incorrectQuizIds.push(...unansweredQuizIds);
    const totalQuestions = quizzes.length;
    const score =
      totalQuestions > 0
        ? Math.round((correctCount / totalQuestions) * 100)
        : 0;
    const failingChapterIds =
      session.chapterId === null
        ? computeFailingChapters(
            incorrectQuizIds,
            quizzes,
            QUIZ_SESSION_MAX_FAILING_CHAPTERS
          )
        : [];
    const completed = await this.repo.updateSession(session.id, user, {
      completedAt: new Date(),
      correctCount,
      failingChapterIds,
      incorrectQuizIds,
      score,
      status: "COMPLETED",
      totalQuestions,
      updatedAt: new Date(),
    });
    if (!completed) {
      throw new ORPCError("NOT_FOUND", {
        message: "Quiz session not found",
      });
    }
    return completed;
  }

  async getQuizSession(
    input: GetQuizSessionInput,
    userId: string | null | undefined
  ): Promise<QuizSession> {
    const user = this.guard.requireUser(userId);
    return await this.guard.assertSessionOwnerOrNotFound(input.sessionId, user);
  }

  async getQuizSessionQuestions(
    input: GetQuizSessionQuestionsInput,
    userId: string | null | undefined
  ): Promise<(QuizWithOptions & { currentAnswer: string[] | null })[]> {
    const user = this.guard.requireUser(userId);
    const session = await this.guard.assertSessionOwnerOrNotFound(
      input.sessionId,
      user
    );
    const quizzes = await this.repo.findQuizzesWithOptionsInScope(
      session.studySetId,
      session.chapterId
    );
    const answers = await this.repo.findAnswersBySession(session.id);
    const validAnswers = answers.filter(
      (a): a is typeof a & { quizId: string } => a.quizId !== null
    );
    const answerByQuizId = new Map(validAnswers.map((a) => [a.quizId, a]));
    const sorted = [...quizzes].toSorted((a, b) => a.id.localeCompare(b.id));
    const shuffled = new Rng(session.id).shuffle(sorted);
    return shuffled.map((quiz) => {
      const answer = answerByQuizId.get(quiz.id);
      return {
        ...quiz,
        currentAnswer: answer === undefined ? null : answer.selectedOptionIds,
      };
    });
  }

  async getQuizSessionResults(
    input: GetQuizSessionResultsInput,
    userId: string | null | undefined
  ): Promise<{
    score: number;
    totalQuestions: number;
    correctCount: number;
    incorrectQuestions: (QuizWithOptions & {
      selectedOptionIds: string[] | null;
    })[];
    failingChapterIds: string[];
  }> {
    const user = this.guard.requireUser(userId);
    const session = await this.guard.assertSessionOwnerOrNotFound(
      input.sessionId,
      user
    );
    const quizzes = await this.repo.findQuizzesWithOptionsInScope(
      session.studySetId,
      session.chapterId
    );
    const answers = await this.repo.findAnswersBySession(session.id);
    const validAnswers = answers.filter(
      (a): a is typeof a & { quizId: string } => a.quizId !== null
    );
    const answerByQuizId = new Map(validAnswers.map((a) => [a.quizId, a]));
    if (session.status === "COMPLETED") {
      if (
        session.score === null ||
        session.totalQuestions === null ||
        session.correctCount === null ||
        session.incorrectQuizIds === null ||
        session.failingChapterIds === null
      ) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Internal server error",
        });
      }
      const incorrectQuizSet = new Set(session.incorrectQuizIds);
      const incorrectQuestions = quizzes
        .filter((q) => incorrectQuizSet.has(q.id))
        .map((q) => {
          const answer = answerByQuizId.get(q.id);
          return {
            ...q,
            selectedOptionIds:
              answer === undefined ? null : answer.selectedOptionIds,
          };
        });
      return {
        correctCount: session.correctCount,
        failingChapterIds: session.failingChapterIds,
        incorrectQuestions,
        score: session.score,
        totalQuestions: session.totalQuestions,
      };
    }
    // ACTIVE: compute live
    let correctCount = 0;
    const incorrectQuizIds: string[] = [];
    for (const quiz of quizzes) {
      const answer = answerByQuizId.get(quiz.id);
      if (answer && isAnswerCorrect(quiz, answer.selectedOptionIds)) {
        correctCount += 1;
      } else {
        incorrectQuizIds.push(quiz.id);
      }
    }
    const unansweredQuizIds = quizzes
      .map((q) => q.id)
      .filter((id) => !answerByQuizId.has(id));
    incorrectQuizIds.push(...unansweredQuizIds);
    const totalQuestions = quizzes.length;
    const score =
      totalQuestions > 0
        ? Math.round((correctCount / totalQuestions) * 100)
        : 0;
    const failingChapterIds =
      session.chapterId === null
        ? computeFailingChapters(
            incorrectQuizIds,
            quizzes,
            QUIZ_SESSION_MAX_FAILING_CHAPTERS
          )
        : [];
    const incorrectQuestions = quizzes
      .filter((q) => incorrectQuizIds.includes(q.id))
      .map((q) => {
        const answer = answerByQuizId.get(q.id);
        return {
          ...q,
          selectedOptionIds:
            answer === undefined ? null : answer.selectedOptionIds,
        };
      });
    return {
      correctCount,
      failingChapterIds,
      incorrectQuestions,
      score,
      totalQuestions,
    };
  }

  async listQuizSessions(
    input: ListQuizSessionsInput,
    userId: string | null | undefined
  ): Promise<QuizSession[]> {
    const user = this.guard.requireUser(userId);
    await this.guard.assertStudySetVisibleOrNotFound(input.studySetId, user);
    return await this.repo.findSessionsByStudySetAndUser(
      input.studySetId,
      user
    );
  }

  async adminDeleteExpiredSessions(): Promise<{ deletedCount: number }> {
    const cutoff = Date.now() - QUIZ_SESSION_TTL_MS;
    const deletedCount =
      await this.repo.deleteExpiredSessionsAndOrphans(cutoff);
    return { deletedCount };
  }
}
