import { QuizDrizzleRepository } from './quiz.repository.drizzle.ts';
import { QuizGuard } from './quiz.guard.ts';
import { QuizService } from './quiz.service.ts';
import { studySetGuard } from '../study-set/index.ts';
import { chapterGuard } from '../chapter/index.ts';

const quizRepo = new QuizDrizzleRepository();
export const quizGuard = new QuizGuard(quizRepo, studySetGuard, chapterGuard);
export const quizService = new QuizService(quizRepo, quizGuard);
