import {
  adminListSessionsInputSchema,
  flashcardSessionListResultSchema,
} from "$lib/schemas/flashcard-session";
import { adminProcedure } from "$lib/server/api/base";

import { flashcardSessionService } from "../index";

export const flashcardSessionAdminListSessions = adminProcedure
  .input(adminListSessionsInputSchema)
  .output(flashcardSessionListResultSchema)
  .handler(
    async ({ input }) => await flashcardSessionService.adminListSessions(input)
  );
