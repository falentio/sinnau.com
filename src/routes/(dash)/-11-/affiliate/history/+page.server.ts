import { createServerClient } from "$lib/orpc.server";
import { parsePage } from "$lib/utils/pagination";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ depends, url }) => {
  depends("affiliate:history");

  const page = parsePage(url.searchParams.get("page"));

  const client = createServerClient();
  const result = await client.affiliate.admin.listPayouts({ page });

  return {
    history: result.data,
    pagination: result.pagination,
  };
};
