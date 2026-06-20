import {
  listSessionsInputSchema,
  flashcardSessionSchema,
} from "$lib/schemas/flashcard-session";
import { authorizedProcedure } from "$lib/server/api/base";
import * as v from "valibot";

import { flashcardSessionService } from "../index";

const ERRORS = {} as const;

export const flashcardSessionList = authorizedProcedure
  .errors(ERRORS)
  .input(listSessionsInputSchema)
  .output(v.array(flashcardSessionSchema))
  .handler(
    async ({ context }) =>
      await flashcardSessionService.listSessions({}, context.user.id)
  );
