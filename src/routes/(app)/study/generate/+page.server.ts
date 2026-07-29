import { createServerClient } from "$lib/orpc.server";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  const client = createServerClient();
  const [languageStyles, hasAccessResult] = await Promise.all([
    client.generate.languageStyles(),
    client.generate.hasAccess(),
  ]);
  return { hasAccess: hasAccessResult, languageStyles };
};
