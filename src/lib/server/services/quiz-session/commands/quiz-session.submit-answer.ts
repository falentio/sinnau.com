import {
  quizSessionAnswerSchema,
  submitAnswerInputSchema,
} from "$lib/schemas/quiz-session";
import { authorizedProcedure } from "$lib/server/api/base";

import { quizSessionService } from "../index";

const ERRORS = {
  NOT_FOUND: {
    message: "Quiz session or quiz not found",
  },
  SESSION_ALREADY_COMPLETED: {
    message: "Cannot modify a completed session",
  },
  VALIDATION_FAILED: {
    message: "Quiz not in session or options are invalid",
  },
} as const;

export const quizSessionSubmitAnswer = authorizedProcedure
  .errors(ERRORS)
  .input(submitAnswerInputSchema)
  .output(quizSessionAnswerSchema)
  .handler(
    async ({ input, context }) =>
      await quizSessionService.submitAnswer(input, context.user.id)
  );
