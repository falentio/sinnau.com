import { dev } from "$app/environment";
import { client } from "$lib/orpc";
import { getFlashcardStubs } from "$lib/server/services/flashcard/flashcard.utils";
import { error } from "@sveltejs/kit";

import type { PageServerLoad } from "./$types";

const VALID_FILTERS = new Set(["latest"]);
const DEV_STUB_FILTERS = new Set(["empty", "paginated", "unpaginated", "500"]);

export const load: PageServerLoad = async ({
  depends,
  url,
  params,
  locals,
}) => {
  const user = locals.mustGetUser();
  const filter = url.searchParams.get("filter");

  depends(`flashcard:list:${params.studySetId}`);

  if (
    filter !== null &&
    !VALID_FILTERS.has(filter) &&
    !(dev && DEV_STUB_FILTERS.has(filter))
  ) {
    error(400, { message: "filter unknown" });
  }

  if (dev) {
    if (filter === "empty") {
      return { filter, flashcards: [] };
    }
    if (filter === "500") {
      await client.unimplemented();
    }
    if (filter === "paginated") {
      return {
        filter,
        flashcards: getFlashcardStubs(50, params.studySetId, user.id),
      };
    }
    if (filter === "unpaginated") {
      return {
        filter,
        flashcards: getFlashcardStubs(9, params.studySetId, user.id),
      };
    }
  }

  const flashcards = await client.flashcard.list({
    studySetId: params.studySetId,
  });
  return { filter, flashcards };
};
