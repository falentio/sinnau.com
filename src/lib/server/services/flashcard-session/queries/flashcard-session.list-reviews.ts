import {
  listReviewsInputSchema,
  flashcardSessionReviewWithFrontSchema,
} from "$lib/schemas/flashcard-session";
import { authorizedProcedure } from "$lib/server/api/base";
import * as v from "valibot";

import { flashcardSessionService } from "../index";

const ERRORS = {
  NOT_FOUND: {
    message: "Study set not found",
  },
} as const;

export const flashcardSessionListReviews = authorizedProcedure
  .errors(ERRORS)
  .input(listReviewsInputSchema)
  .output(v.array(flashcardSessionReviewWithFrontSchema))
  .handler(
    async ({ input, context }) =>
      await flashcardSessionService.listReviews(input, context.user.id)
  );
