import {
  listQuizSessionsInputSchema,
  quizSessionListItemSchema,
} from "$lib/schemas/quiz-session";
import { authorizedProcedure } from "$lib/server/api/base";
import * as v from "valibot";

import { quizSessionService } from "../index";

const ERRORS = {
  NOT_FOUND: { message: "Study set not found" },
} as const;

export const quizSessionList = authorizedProcedure
  .errors(ERRORS)
  .input(listQuizSessionsInputSchema)
  .output(v.array(quizSessionListItemSchema))
  .handler(
    async ({ input, context }) =>
      await quizSessionService.listQuizSessions(input, context.user.id)
  );
