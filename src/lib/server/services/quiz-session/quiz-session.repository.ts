import type { Chapter } from "../../infras/db/schema/chapter.ts";
import type {
  QuizSession,
  QuizSessionAnswer,
} from "../../infras/db/schema/quiz-session.ts";
import type { QuizOption } from "../../infras/db/schema/quiz.ts";
import type { QuizWithOptions } from "../quiz/quiz.repository.ts";

export type QuizSessionUpdatePatch = Partial<
  Pick<
    QuizSession,
    | "status"
    | "score"
    | "totalQuestions"
    | "correctCount"
    | "incorrectQuizIds"
    | "failingChapterIds"
    | "completedAt"
    | "lastAnsweredAt"
    | "lastQuestionText"
    | "updatedAt"
  >
>;

export interface QuizSessionRepository {
  insertSession(
    row: Omit<QuizSession, "createdAt" | "updatedAt">
  ): Promise<QuizSession>;
  updateSession(
    id: string,
    userId: string,
    patch: QuizSessionUpdatePatch
  ): Promise<QuizSession | null>;
  findSessionById(id: string): Promise<QuizSession | null>;
  findSessionsByStudySetAndUser(
    studySetId: string,
    userId: string
  ): Promise<QuizSession[]>;
  countQuizzesInScope(
    studySetId: string,
    chapterId: string | null
  ): Promise<number>;
  findQuizzesWithOptionsInScope(
    studySetId: string,
    chapterId: string | null
  ): Promise<QuizWithOptions[]>;
  findQuizById(quizId: string): Promise<QuizWithOptions | null>;
  findQuizByIdInScope(
    quizId: string,
    studySetId: string,
    chapterId: string | null
  ): Promise<QuizWithOptions | null>;
  findQuizOptionsByQuizId(quizId: string): Promise<QuizOption[]>;
  findChapterById(id: string): Promise<Chapter | null>;
  upsertAnswer(
    row: Omit<QuizSessionAnswer, "createdAt" | "updatedAt">
  ): Promise<QuizSessionAnswer>;
  findAnswersBySession(sessionId: string): Promise<QuizSessionAnswer[]>;
  findAnswerBySessionAndQuiz(
    sessionId: string,
    quizId: string
  ): Promise<QuizSessionAnswer | null>;
  deleteExpiredSessionsAndOrphans(cutoffMs: number): Promise<number>;
}
