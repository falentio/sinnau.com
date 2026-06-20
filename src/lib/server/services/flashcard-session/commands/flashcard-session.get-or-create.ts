import {
  getOrCreateFlashcardSessionInputSchema,
  flashcardSessionSchema,
} from "$lib/schemas/flashcard-session";
import { authorizedProcedure } from "$lib/server/api/base";

import { flashcardSessionService } from "../index";

const ERRORS = {
  FORBIDDEN: {
    message: "Cannot view the study set",
  },
  NOT_FOUND: {
    message: "Study set not found",
  },
} as const;

export const flashcardSessionGetOrCreate = authorizedProcedure
  .errors(ERRORS)
  .input(getOrCreateFlashcardSessionInputSchema)
  .output(flashcardSessionSchema)
  .handler(
    async ({ input, context }) =>
      await flashcardSessionService.getOrCreateSession(input, context.user.id)
  );
