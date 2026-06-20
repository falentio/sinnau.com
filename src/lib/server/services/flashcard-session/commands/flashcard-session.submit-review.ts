import {
  submitReviewInputSchema,
  flashcardSessionReviewSchema,
} from "$lib/schemas/flashcard-session";
import { authorizedProcedure } from "$lib/server/api/base";

import { flashcardSessionService } from "../index";

const ERRORS = {
  NOT_FOUND: {
    message: "Flashcard session or flashcard not found",
  },
  VALIDATION_FAILED: {
    message: "Flashcard does not belong to the study set",
  },
} as const;

export const flashcardSessionSubmitReview = authorizedProcedure
  .errors(ERRORS)
  .input(submitReviewInputSchema)
  .output(flashcardSessionReviewSchema)
  .handler(
    async ({ input, context }) =>
      await flashcardSessionService.submitReview(input, context.user.id)
  );
