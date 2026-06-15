import { chapterGuard } from "../chapter/index.ts";
import { studySetGuard } from "../study-set/index.ts";
import { QuizGuard } from "./quiz.guard.ts";
import { QuizDrizzleRepository } from "./quiz.repository.drizzle.ts";
import { QuizService } from "./quiz.service.ts";

const quizRepo = new QuizDrizzleRepository();
export { quizRepo };
export const quizGuard = new QuizGuard(quizRepo, studySetGuard, chapterGuard);
export const quizService = new QuizService(quizRepo, quizGuard);
