import {
  deleteQuizOptionsInputSchema,
  quizOptionsDeleteOutputSchema,
} from "$lib/schemas/quiz";
import { authorizedProcedure } from "$lib/server/api/base";

import { quizService } from "../index";

const ERRORS = {
  CANNOT_DELETE_LAST_CORRECT: {
    message: "Cannot leave a quiz without its required correct option",
  },
  NOT_FOUND: { message: "Some quiz options could not be found" },
  VALIDATION_FAILED: { message: "Quiz options violate type constraints" },
} as const;

export const quizOptionDelete = authorizedProcedure
  .errors(ERRORS)
  .input(deleteQuizOptionsInputSchema)
  .output(quizOptionsDeleteOutputSchema)
  .handler(async ({ input, context }) => {
    await quizService.deleteQuizOptions(input, context.user.id);
    return { success: true } as const;
  });
