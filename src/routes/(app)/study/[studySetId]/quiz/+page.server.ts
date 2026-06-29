import { dev } from "$app/environment";
import { client } from "$lib/orpc";
import { getQuizStubs } from "$lib/server/services/quiz/quiz.utils";
import { error } from "@sveltejs/kit";

import type { PageServerLoad } from "./$types";

const VALID_SORTS = new Set([
  "newest",
  "oldest",
  "alphabetical",
  "reverse-alphabetical",
]);
const DEV_STUB_SORTS = new Set(["empty", "paginated", "unpaginated", "500"]);

export const load: PageServerLoad = async ({ url, params, locals }) => {
  const user = locals.mustGetUser();
  const sort = url.searchParams.get("sort");

  if (
    sort !== null &&
    !VALID_SORTS.has(sort) &&
    !(dev && DEV_STUB_SORTS.has(sort))
  ) {
    error(400, { message: "sort unknown" });
  }

  if (dev) {
    if (sort === "empty") {
      return { sort, quizzes: [] };
    }
    if (sort === "500") {
      await client.unimplemented();
    }
    if (sort === "paginated") {
      return { sort, quizzes: getQuizStubs(50, params.studySetId, user.id) };
    }
    if (sort === "unpaginated") {
      return { sort, quizzes: getQuizStubs(9, params.studySetId, user.id) };
    }
  }

  const quizzes = await client.quiz.list({ studySetId: params.studySetId });
  return { sort, quizzes };
};
