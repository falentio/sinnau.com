import { client } from "$lib/orpc";

import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ params, locals }) => {
  locals.mustGetUser();
  const [chapters, studySet] = await Promise.all([
    client.chapter.list({ studySetId: params.studySetId }),
    client.studySet.get({ id: params.studySetId }),
  ]);
  return { chapters, studySet };
};
