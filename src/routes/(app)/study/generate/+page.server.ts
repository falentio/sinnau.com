import { createServerClient } from "$lib/orpc.server";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  const client = createServerClient();
  const languageStyles = await client.generate.languageStyles();
  return { languageStyles };
};
