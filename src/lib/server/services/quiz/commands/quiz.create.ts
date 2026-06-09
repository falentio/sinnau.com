import { createQuizInputSchema, quizSchema } from "$lib/schemas/quiz";
import { authorizedProcedure } from "$lib/server/api/base";

import { quizService } from "../index";

const ERRORS = {
  FORBIDDEN: { message: "Cannot create a quiz in a study set you do not own" },
  NOT_FOUND: { message: "Study set or chapter not found" },
  VALIDATION_FAILED: { message: "Quiz options violate type constraints" },
} as const;

export const quizCreate = authorizedProcedure
  .errors(ERRORS)
  .input(createQuizInputSchema)
  .output(quizSchema)
  .handler(
    async ({ input, context }) =>
      await quizService.createQuiz(input, context.user.id)
  );
