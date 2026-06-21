import {
  adminListSessionsInputSchema,
  flashcardSessionListResultSchema,
} from "$lib/schemas/flashcard-session";
import { adminProcedure } from "$lib/server/api/base";

import { flashcardSessionService } from "../index";

const ERRORS = {
  VALIDATION_FAILED: {
    message:
      "At least one of userId or studySetId must be provided to list admin sessions",
  },
} as const;

export const flashcardSessionAdminListSessions = adminProcedure
  .errors(ERRORS)
  .input(adminListSessionsInputSchema)
  .output(flashcardSessionListResultSchema)
  .handler(
    async ({ input }) => await flashcardSessionService.adminListSessions(input)
  );
