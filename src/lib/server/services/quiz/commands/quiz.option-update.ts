import {
  quizOptionSchema,
  updateQuizOptionInputSchema,
} from "$lib/schemas/quiz";
import { authorizedProcedure } from "$lib/server/api/base";

import { quizService } from "../index";

const ERRORS = {
  CANNOT_DELETE_LAST_CORRECT: {
    message: "Cannot leave a quiz without its required correct option",
  },
  FITB_MULTIPLE_OPTIONS: {
    message: "Fill-in-the-blank quiz cannot have multiple options",
  },
  FORBIDDEN: { message: "Cannot modify a quiz option you do not own" },
  MC_ALREADY_HAS_CORRECT: {
    message: "Multiple choice quiz already has a correct option",
  },
  NOT_FOUND: { message: "Quiz option not found" },
  VALIDATION_FAILED: { message: "Quiz options violate type constraints" },
} as const;

export const quizOptionUpdate = authorizedProcedure
  .errors(ERRORS)
  .input(updateQuizOptionInputSchema)
  .output(quizOptionSchema)
  .handler(({ input, context }) =>
    quizService.updateQuizOption(input, context.user.id)
  );
