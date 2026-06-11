import { quizCreate } from "./commands/quiz.create.ts";
import { quizDelete } from "./commands/quiz.delete.ts";
import { quizOptionDelete } from "./commands/quiz.option-delete.ts";
import { quizUpdate } from "./commands/quiz.update.ts";
import { quizGet } from "./queries/quiz.get.ts";
import { quizList } from "./queries/quiz.list.ts";

export const quizRouter = {
  create: quizCreate,
  delete: quizDelete,
  get: quizGet,
  list: quizList,
  option: {
    delete: quizOptionDelete,
  },
  update: quizUpdate,
};

export type QuizRouter = typeof quizRouter;
