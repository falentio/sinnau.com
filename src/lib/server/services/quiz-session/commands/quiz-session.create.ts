import {
  createQuizSessionInputSchema,
  quizSessionSchema,
} from "$lib/schemas/quiz-session";
import { authorizedProcedure } from "$lib/server/api/base";

import { quizSessionService } from "../index";

const ERRORS = {
  FORBIDDEN: {
    message: "Cannot view the study set",
  },
  NOT_FOUND: {
    message: "Study set or chapter not found",
  },
  VALIDATION_FAILED: {
    message: "Chapter does not belong to the study set",
  },
} as const;

export const quizSessionCreate = authorizedProcedure
  .errors(ERRORS)
  .input(createQuizSessionInputSchema)
  .output(quizSessionSchema)
  .handler(
    async ({ input, context }) =>
      await quizSessionService.createSession(input, context.user.id)
  );
