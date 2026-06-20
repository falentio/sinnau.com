import {
  getReviewQueueInputSchema,
  bucketedQueueSchema,
} from "$lib/schemas/flashcard-session";
import { authorizedProcedure } from "$lib/server/api/base";

import { flashcardSessionService } from "../index";

const ERRORS = {
  NOT_FOUND: {
    message: "Study set not found",
  },
} as const;

export const flashcardSessionGetReviewQueue = authorizedProcedure
  .errors(ERRORS)
  .input(getReviewQueueInputSchema)
  .output(bucketedQueueSchema)
  .handler(
    async ({ input, context }) =>
      await flashcardSessionService.getReviewQueue(input, context.user.id)
  );
