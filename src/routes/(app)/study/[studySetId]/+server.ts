import { redirect } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

export const GET: RequestHandler = ({ params }) => {
  redirect(307, `/study/${params.studySetId}/flashcard/`);
};
