import { quizSchema, updateQuizInputSchema } from "$lib/schemas/quiz";
import { authorizedProcedure } from "$lib/server/api/base";

import { quizService } from "../index";

const ERRORS = {
  FORBIDDEN: { message: "Cannot modify a quiz you do not own" },
  NOT_FOUND: { message: "Quiz not found" },
} as const;

export const quizUpdate = authorizedProcedure
  .errors(ERRORS)
  .input(updateQuizInputSchema)
  .output(quizSchema)
  .handler(async ({ input, context }) =>
    quizService.updateQuiz(input, context.user.id)
  );
