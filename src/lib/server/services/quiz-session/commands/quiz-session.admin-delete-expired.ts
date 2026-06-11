import { adminDeleteExpiredSessionsOutputSchema } from "$lib/schemas/quiz-session";
import { adminProcedure } from "$lib/server/api/base";
import * as v from "valibot";

import { quizSessionService } from "../index";

const ERRORS = {} as const;

export const quizSessionAdminDeleteExpired = adminProcedure
  .errors(ERRORS)
  .input(v.object({}))
  .output(adminDeleteExpiredSessionsOutputSchema)
  .handler(async () => await quizSessionService.adminDeleteExpiredSessions());
