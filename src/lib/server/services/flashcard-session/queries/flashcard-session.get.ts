import {
  getFlashcardSessionInputSchema,
  flashcardSessionSchema,
} from "$lib/schemas/flashcard-session";
import { authorizedProcedure } from "$lib/server/api/base";

import { flashcardSessionService } from "../index";

const ERRORS = {
  NOT_FOUND: {
    message: "Flashcard session not found",
  },
} as const;

export const flashcardSessionGet = authorizedProcedure
  .errors(ERRORS)
  .input(getFlashcardSessionInputSchema)
  .output(flashcardSessionSchema)
  .handler(
    async ({ input, context }) =>
      await flashcardSessionService.getSession(input, context.user.id)
  );
