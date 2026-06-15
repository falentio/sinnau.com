import {
  adminDeleteExpiredSessionsInputSchema,
  adminDeleteExpiredSessionsOutputSchema,
} from "$lib/schemas/quiz-session";
import { adminProcedure } from "$lib/server/api/base";

import { quizSessionService } from "../index";

const ERRORS = {} as const;

export const quizSessionAdminDeleteExpired = adminProcedure
  .errors(ERRORS)
  .input(adminDeleteExpiredSessionsInputSchema)
  .output(adminDeleteExpiredSessionsOutputSchema)
  .handler(async () => await quizSessionService.adminDeleteExpiredSessions());
