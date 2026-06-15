import { client } from "$lib/orpc";
import { redirect } from "@sveltejs/kit";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url, params, locals }) => {
  locals.mustGetUser();
  const quizId = url.searchParams.get("quizId");
  if (quizId === null) {
    redirect(302, `/study/${params.studySetId}/quiz`);
  }

  const quiz = await client.quiz.get({ id: quizId });
  return { quiz };
};
