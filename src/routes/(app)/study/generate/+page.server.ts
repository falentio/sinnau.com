import { createServerClient } from "$lib/orpc.server";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  const client = createServerClient();
  const [languageStyles, outputLanguages, hasAccessResult] = await Promise.all([
    client.generate.languageStyles(),
    client.generate.outputLanguages(),
    client.generate.hasAccess(),
  ]);
  return { hasAccess: hasAccessResult, languageStyles, outputLanguages };
};
