import {
  deleteExpiredInputSchema,
  deleteExpiredOutputSchema,
} from "$lib/schemas/flashcard-session";
import { adminProcedure } from "$lib/server/api/base";

import { flashcardSessionService } from "../index";

const ERRORS = {} as const;

export const flashcardSessionDeleteExpired = adminProcedure
  .errors(ERRORS)
  .input(deleteExpiredInputSchema)
  .output(deleteExpiredOutputSchema)
  .handler(async () => await flashcardSessionService.adminDeleteExpired({}));
