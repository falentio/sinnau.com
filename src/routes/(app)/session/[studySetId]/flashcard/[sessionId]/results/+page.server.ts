import { dev } from "$app/environment";
import { client } from "$lib/orpc";
import { FLASHCARD_SESSION_REVIEW_LIST_DEFAULT } from "$lib/schemas/flashcard-session.constant";
import {
  getResultsStub,
  isResultsStubFilter,
} from "$lib/server/services/flashcard-session/flashcard-session.utils";
import { error } from "@sveltejs/kit";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ depends, params, url }) => {
  depends(`flashcard-session:reviews:${params.studySetId}`);

  const stubFilter = url.searchParams.get("filter");
  if (dev && stubFilter !== null) {
    if (!isResultsStubFilter(stubFilter)) {
      error(400, { message: "Unknown dev stub filter" });
    }
    const stub = getResultsStub(stubFilter, params.studySetId);
    if (stub === null) {
      error(400, { message: "Unknown dev stub filter" });
    }
    return stub;
  }

  const session = await client.flashcardSession.session.get({
    sessionId: params.sessionId,
  });
  const reviews = await client.flashcardSession.review.list({
    limit: FLASHCARD_SESSION_REVIEW_LIST_DEFAULT,
    studySetId: session.studySetId,
  });

  return { reviews, session };
};
