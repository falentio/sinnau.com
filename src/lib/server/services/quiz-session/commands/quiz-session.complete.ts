import {
  completeQuizSessionInputSchema,
  quizSessionSchema,
} from "$lib/schemas/quiz-session";
import { authorizedProcedure } from "$lib/server/api/base";

import { quizSessionService } from "../index";

const ERRORS = {
  NOT_FOUND: {
    message: "Quiz session not found",
  },
} as const;

export const quizSessionComplete = authorizedProcedure
  .errors(ERRORS)
  .input(completeQuizSessionInputSchema)
  .output(quizSessionSchema)
  .handler(
    async ({ input, context }) =>
      await quizSessionService.completeSession(input, context.user.id)
  );
