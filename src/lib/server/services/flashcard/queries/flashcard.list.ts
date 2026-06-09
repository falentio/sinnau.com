import {
  flashcardListOutputSchema,
  getFlashcardsInputSchema,
} from "$lib/schemas/flashcard";
import { authorizedProcedure } from "$lib/server/api/base";

import { flashcardService } from "../index";

const ERRORS = {
  NOT_FOUND: { message: "Study set not found" },
} as const;

export const flashcardList = authorizedProcedure
  .errors(ERRORS)
  .input(getFlashcardsInputSchema)
  .output(flashcardListOutputSchema)
  .handler(async ({ input, context }) =>
    flashcardService.getFlashcards(input, context.user.id)
  );
