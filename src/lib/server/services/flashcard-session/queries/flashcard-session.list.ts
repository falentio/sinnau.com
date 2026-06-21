import {
  flashcardSessionListResultSchema,
  listSessionsInputSchema,
} from "$lib/schemas/flashcard-session";
import { authorizedProcedure } from "$lib/server/api/base";

import { flashcardSessionService } from "../index";

const ERRORS = {} as const;

export const flashcardSessionList = authorizedProcedure
  .errors(ERRORS)
  .input(listSessionsInputSchema)
  .output(flashcardSessionListResultSchema)
  .handler(
    async ({ input, context }) =>
      await flashcardSessionService.listSessions(input, context.user.id)
  );
