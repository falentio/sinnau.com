import { client } from "$lib/orpc";
import { redirect } from "@sveltejs/kit";

import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ depends, params, locals }) => {
  locals.mustGetUser();
  depends(`study-set:${params.studySetId}`);

  const [chapters, studySet, activeGeneration] = await Promise.all([
    client.chapter.list({ studySetId: params.studySetId }),
    client.studySet.get({ id: params.studySetId }),
    client.generate.checkByStudySet({ studySetId: params.studySetId }),
    client.studySet.visit.refresh({ studySetId: params.studySetId }),
  ]);

  if (activeGeneration) {
    redirect(307, `/generate/${activeGeneration.generateId}/waiting-room`);
  }

  return { chapters, studySet };
};
