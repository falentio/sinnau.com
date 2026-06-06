import {
  flashcardSchema,
  updateFlashcardInputSchema,
} from "$lib/schemas/flashcard";
import { authorizedProcedure } from "$lib/server/api/base";

import { flashcardService } from "../index";

const ERRORS = {
  FORBIDDEN: { message: "Cannot modify a flashcard you do not own" },
  NOT_FOUND: { message: "Flashcard not found" },
} as const;

export const flashcardUpdate = authorizedProcedure
  .errors(ERRORS)
  .input(updateFlashcardInputSchema)
  .output(flashcardSchema)
  .handler(({ input, context }) =>
    flashcardService.updateFlashcard(input, context.user.id)
  );
