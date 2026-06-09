import {
  quizOptionSchema,
  updateQuizOptionInputSchema,
} from "$lib/schemas/quiz";
import { authorizedProcedure } from "$lib/server/api/base";

import { quizService } from "../index";

const ERRORS = {
  FORBIDDEN: { message: "Cannot modify a quiz option you do not own" },
  NOT_FOUND: { message: "Quiz option not found" },
  VALIDATION_FAILED: { message: "Quiz options violate type constraints" },
} as const;

export const quizOptionUpdate = authorizedProcedure
  .errors(ERRORS)
  .input(updateQuizOptionInputSchema)
  .output(quizOptionSchema)
  .handler(
    async ({ input, context }) =>
      await quizService.updateQuizOption(input, context.user.id)
  );
