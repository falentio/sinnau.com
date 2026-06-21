import { dev } from "$app/environment";
import { client } from "$lib/orpc";
import { FLASHCARD_SESSION_QUEUE_BUCKET_LIMIT } from "$lib/schemas/flashcard-session.constant";
import {
  getReviewStub,
  isReviewStubFilter,
} from "$lib/server/services/flashcard-session/flashcard-session.utils";
import { error } from "@sveltejs/kit";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ depends, params, url }) => {
  depends(`flashcard-session:queue:${params.studySetId}`);

  const stubFilter = url.searchParams.get("filter");
  if (dev && stubFilter !== null) {
    if (!isReviewStubFilter(stubFilter)) {
      error(400, { message: "Unknown dev stub filter" });
    }
    const stub = getReviewStub(stubFilter, params.studySetId);
    if (stub === null) {
      error(400, { message: "Unknown dev stub filter" });
    }
    return stub;
  }

  const session = await client.flashcardSession.session.get({
    sessionId: params.sessionId,
  });
  const queue = await client.flashcardSession.queue.get({
    studySetId: session.studySetId,
  });

  const cards = [...queue.overdue, ...queue.dueToday, ...queue.new].slice(
    0,
    FLASHCARD_SESSION_QUEUE_BUCKET_LIMIT
  );

  return { cards, session };
};
