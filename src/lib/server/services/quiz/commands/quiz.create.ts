import { createQuizInputSchema, quizSchema } from "$lib/schemas/quiz";
import { authorizedProcedure } from "$lib/server/api/base";

import { quizService } from "../index";

const ERRORS = {
  CANNOT_DELETE_LAST_CORRECT: {
    message: "Cannot leave a quiz without its required correct option",
  },
  FITB_MULTIPLE_OPTIONS: {
    message: "Fill-in-the-blank quiz cannot have multiple options",
  },
  FORBIDDEN: { message: "Cannot create a quiz in a study set you do not own" },
  MC_ALREADY_HAS_CORRECT: {
    message: "Multiple choice quiz already has a correct option",
  },
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
