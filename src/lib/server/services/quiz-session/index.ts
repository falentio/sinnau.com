/* eslint-disable promise-function-async, @typescript-eslint/no-unsafe-type-assertion */

import type {
  adminDeleteExpiredSessionsOutputSchema,
  quizSessionListItemSchema,
  quizSessionQuestionSchema,
  quizSessionResultsSchema,
  quizSessionSchema,
} from "$lib/schemas/quiz-session";
import type { InferOutput } from "valibot";

type QS = InferOutput<typeof quizSessionSchema>;
type QSQ = InferOutput<typeof quizSessionQuestionSchema>;
type QSR = InferOutput<typeof quizSessionResultsSchema>;
type QSLI = InferOutput<typeof quizSessionListItemSchema>;
type ADES = InferOutput<typeof adminDeleteExpiredSessionsOutputSchema>;

export const quizSessionService = {
  adminDeleteExpiredSessions: (): Promise<ADES> =>
    Promise.resolve({ deletedCount: 0 }),
  completeQuizSession: (..._args: unknown[]): Promise<QS> =>
    Promise.resolve({} as QS),
  createQuizSession: (..._args: unknown[]): Promise<QS> =>
    Promise.resolve({} as QS),
  getQuizSession: (..._args: unknown[]): Promise<QS> =>
    Promise.resolve({} as QS),
  getQuizSessionQuestions: (..._args: unknown[]): Promise<QSQ[]> =>
    Promise.resolve([]),
  getQuizSessionResults: (..._args: unknown[]): Promise<QSR> =>
    Promise.resolve({} as QSR),
  listQuizSessions: (..._args: unknown[]): Promise<QSLI[]> =>
    Promise.resolve([]),
  submitAnswer: (..._args: unknown[]): Promise<QS> => Promise.resolve({} as QS),
};
