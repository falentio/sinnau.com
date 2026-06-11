import {
  getQuizSessionInputSchema,
  quizSessionSchema,
} from "$lib/schemas/quiz-session";
import { authorizedProcedure } from "$lib/server/api/base";

import { quizSessionService } from "../index";

const ERRORS = {
  NOT_FOUND: { message: "Quiz session not found" },
} as const;

export const quizSessionGet = authorizedProcedure
  .errors(ERRORS)
  .input(getQuizSessionInputSchema)
  .output(quizSessionSchema)
  .handler(
    async ({ input, context }) =>
      await quizSessionService.getQuizSession(input, context.user.id)
  );
