import { dev } from "$app/environment";
import { client } from "$lib/orpc";
import {
  getHubStub,
  isHubStubFilter,
} from "$lib/server/services/flashcard-session/flashcard-session.utils";
import { error as svelteError, fail, redirect } from "@sveltejs/kit";

import type { Actions, PageServerLoad } from "./$types";

const isRedirect = (cause: unknown): cause is Response =>
  cause instanceof Response && [301, 302, 303, 307, 308].includes(cause.status);

export const load: PageServerLoad = async ({ depends, params, url }) => {
  depends(`flashcard-session:queue:${params.studySetId}`);

  const stubFilter = url.searchParams.get("filter");
  if (dev && stubFilter !== null) {
    if (!isHubStubFilter(stubFilter)) {
      svelteError(400, { message: "Unknown dev stub filter" });
    }
    const stub = getHubStub(stubFilter, params.studySetId);
    if (stub === null) {
      svelteError(400, { message: "Unknown dev stub filter" });
    }
    return stub;
  }

  const [flashcards, session, queue, recentReviews] = await Promise.all([
    client.flashcard.list({ studySetId: params.studySetId }),
    client.flashcardSession.session.getOrCreate({
      studySetId: params.studySetId,
    }),
    client.flashcardSession.queue.get({ studySetId: params.studySetId }),
    client.flashcardSession.review.list({
      limit: 5,
      studySetId: params.studySetId,
    }),
  ]);

  const pendingCount =
    queue.overdue.length + queue.dueToday.length + queue.new.length;
  const totalFlashcards = flashcards.length;

  return {
    pendingCount,
    queue,
    recentReviews,
    session,
    totalFlashcards,
  };
};

export const actions: Actions = {
  startSession: async ({ params }) => {
    try {
      const session = await client.flashcardSession.session.getOrCreate({
        studySetId: params.studySetId,
      });
      redirect(303, `/session/${params.studySetId}/flashcard/${session.id}/`);
      return { success: true as const };
    } catch (error) {
      if (isRedirect(error)) {
        throw error;
      }
      return fail(500, { message: "Gagal memulai sesi review" });
    }
  },
};
