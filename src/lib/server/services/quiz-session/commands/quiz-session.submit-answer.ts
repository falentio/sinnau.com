import {
  submitAnswerInputSchema,
  quizSessionSchema,
} from "$lib/schemas/quiz-session";
import { authorizedProcedure } from "$lib/server/api/base";

import { quizSessionService } from "../index";

const ERRORS = {
  NOT_FOUND: { message: "Quiz session or quiz not found" },
  SESSION_ALREADY_COMPLETED: { message: "Session is already completed" },
  VALIDATION_FAILED: { message: "Quiz or options are invalid" },
} as const;

export const quizSessionSubmitAnswer = authorizedProcedure
  .errors(ERRORS)
  .input(submitAnswerInputSchema)
  .output(quizSessionSchema)
  .handler(
    async ({ input, context }) =>
      await quizSessionService.submitAnswer(input, context.user.id)
  );
