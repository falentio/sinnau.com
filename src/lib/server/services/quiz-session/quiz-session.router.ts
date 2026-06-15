import { quizSessionAdminDeleteExpired } from "./commands/quiz-session.admin-delete-expired.ts";
import { quizSessionComplete } from "./commands/quiz-session.complete.ts";
import { quizSessionCreate } from "./commands/quiz-session.create.ts";
import { quizSessionSubmitAnswer } from "./commands/quiz-session.submit-answer.ts";
import { quizSessionGetQuestions } from "./queries/quiz-session.get-questions.ts";
import { quizSessionGetResults } from "./queries/quiz-session.get-results.ts";
import { quizSessionGet } from "./queries/quiz-session.get.ts";
import { quizSessionList } from "./queries/quiz-session.list.ts";

export const quizSessionRouter = {
  admin: {
    deleteExpired: quizSessionAdminDeleteExpired,
  },
  complete: quizSessionComplete,
  create: quizSessionCreate,
  get: quizSessionGet,
  getQuestions: quizSessionGetQuestions,
  getResults: quizSessionGetResults,
  list: quizSessionList,
  submitAnswer: quizSessionSubmitAnswer,
};

export type QuizSessionRouter = typeof quizSessionRouter;
