import { client } from "$lib/orpc";

import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ params }) => {
  const [studySet, chapters] = await Promise.all([
    client.studySet.get({ id: params.studySetId }),
    client.chapter.list({ studySetId: params.studySetId }),
  ]);
  return { chapters, studySet };
};
