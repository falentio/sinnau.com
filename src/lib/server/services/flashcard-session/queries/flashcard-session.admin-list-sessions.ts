import {
  adminListSessionsInputSchema,
  flashcardSessionSchema,
} from "$lib/schemas/flashcard-session";
import { adminProcedure } from "$lib/server/api/base";
import * as v from "valibot";

import { flashcardSessionService } from "../index";

const ERRORS = {} as const;

export const flashcardSessionAdminListSessions = adminProcedure
  .errors(ERRORS)
  .input(adminListSessionsInputSchema)
  .output(v.array(flashcardSessionSchema))
  .handler(
    async ({ input }) => await flashcardSessionService.adminListSessions(input)
  );
