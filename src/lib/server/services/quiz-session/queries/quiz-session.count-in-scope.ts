import {
  countQuizSessionInScopeInputSchema,
  countQuizSessionInScopeOutputSchema,
} from "$lib/schemas/quiz-session";
import { authorizedProcedure } from "$lib/server/api/base";

import { quizSessionService } from "../index";

const ERRORS = {
  NOT_FOUND: {
    message: "Study set not found",
  },
} as const;

export const quizSessionCountInScope = authorizedProcedure
  .errors(ERRORS)
  .input(countQuizSessionInScopeInputSchema)
  .output(countQuizSessionInScopeOutputSchema)
  .handler(
    async ({ input, context }) =>
      await quizSessionService.countInScope(input, context.user.id)
  );
