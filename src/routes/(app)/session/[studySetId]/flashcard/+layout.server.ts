import { client } from "$lib/orpc";

import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ params }) => {
  const studySet = await client.studySet.get({ id: params.studySetId });
  return { studySet };
};
