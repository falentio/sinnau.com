import { dev } from "$app/environment";
import { client } from "$lib/orpc";
import { getFlashcardStubs } from "$lib/server/services/flashcard/flashcard.utils";
import { error } from "@sveltejs/kit";

import type { PageServerLoad } from "./$types";

const VALID_SORTS = new Set([
  "newest",
  "oldest",
  "alphabetical",
  "reverse-alphabetical",
  "most-important",
]);
const DEV_STUB_SORTS = new Set(["empty", "paginated", "unpaginated", "500"]);

export const load: PageServerLoad = async ({
  depends,
  url,
  params,
  locals,
}) => {
  const user = locals.mustGetUser();
  const sort = url.searchParams.get("sort");

  depends(`flashcard:list:${params.studySetId}`);

  if (
    sort !== null &&
    !VALID_SORTS.has(sort) &&
    !(dev && DEV_STUB_SORTS.has(sort))
  ) {
    error(400, { message: "sort unknown" });
  }

  if (dev) {
    if (sort === "empty") {
      return { flashcards: [], sort };
    }
    if (sort === "500") {
      await client.unimplemented();
    }
    if (sort === "paginated") {
      return {
        flashcards: getFlashcardStubs(50, params.studySetId, user.id),
        sort,
      };
    }
    if (sort === "unpaginated") {
      return {
        flashcards: getFlashcardStubs(9, params.studySetId, user.id),
        sort,
      };
    }
  }

  const flashcards = await client.flashcard.list({
    studySetId: params.studySetId,
  });
  return { flashcards, sort };
};
