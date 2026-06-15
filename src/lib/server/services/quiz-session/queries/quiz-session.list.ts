import {
  listQuizSessionsInputSchema,
  listQuizSessionsResponseSchema,
} from "$lib/schemas/quiz-session";
import { authorizedProcedure } from "$lib/server/api/base";
import * as v from "valibot";

import { quizSessionService } from "../index";

const ERRORS = {
  NOT_FOUND: {
    message: "Study set not found",
  },
} as const;

export const quizSessionList = authorizedProcedure
  .errors(ERRORS)
  .input(listQuizSessionsInputSchema)
  .output(v.array(listQuizSessionsResponseSchema))
  .handler(
    async ({ input, context }) =>
      await quizSessionService.listSessions(input, context.user.id)
  );
