import { chapterRepo } from "../chapter/index.ts";
import { quizRepo } from "../quiz/index.ts";
import { studySetGuard } from "../study-set/index.ts";
import { QuizSessionGuard } from "./quiz-session.guard.ts";
import { QuizSessionDrizzleRepository } from "./quiz-session.repository.drizzle.ts";
import { QuizSessionService } from "./quiz-session.service.ts";

const quizSessionRepo = new QuizSessionDrizzleRepository();
export const quizSessionGuard = new QuizSessionGuard(
  quizSessionRepo,
  studySetGuard,
  chapterRepo
);
export const quizSessionService = new QuizSessionService(
  quizSessionRepo,
  quizSessionGuard,
  quizRepo
);
