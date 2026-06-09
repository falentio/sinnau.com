import { getQuizzesInputSchema, quizSchema } from "$lib/schemas/quiz";
import { authorizedProcedure } from "$lib/server/api/base";
import * as v from "valibot";

import { quizService } from "../index";

const ERRORS = {
  NOT_FOUND: { message: "Study set not found" },
} as const;

export const quizList = authorizedProcedure
  .errors(ERRORS)
  .input(getQuizzesInputSchema)
  .output(v.array(quizSchema))
  .handler(async ({ input, context }) =>
    quizService.getQuizzes(input, context.user.id)
  );
