import {
  getQuizSessionResultsInputSchema,
  quizSessionResultsSchema,
} from "$lib/schemas/quiz-session";
import { authorizedProcedure } from "$lib/server/api/base";

import { quizSessionService } from "../index";

const ERRORS = {
  NOT_FOUND: {
    message: "Quiz session not found",
  },
} as const;

export const quizSessionGetResults = authorizedProcedure
  .errors(ERRORS)
  .input(getQuizSessionResultsInputSchema)
  .output(quizSessionResultsSchema)
  .handler(
    async ({ input, context }) =>
      await quizSessionService.getResults(input, context.user.id)
  );
