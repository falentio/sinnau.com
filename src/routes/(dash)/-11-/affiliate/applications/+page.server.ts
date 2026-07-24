import { createServerClient } from "$lib/orpc.server";
import { AFFILIATE_APPLICATION_STATUSES } from "$lib/schemas/affiliate.constant";
import { parsePage } from "$lib/utils/pagination";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ depends, url }) => {
  depends("affiliate:applications");

  const page = parsePage(url.searchParams.get("page"));
  const statusRaw = url.searchParams.get("status");
  const status =
    statusRaw !== null && statusRaw !== ""
      ? (AFFILIATE_APPLICATION_STATUSES.find((s) => s === statusRaw) ??
        undefined)
      : undefined;

  const client = createServerClient();
  const result = await client.affiliate.admin.listApplications({
    page,
    status,
  });

  return {
    applications: result.data,
    pagination: result.pagination,
  };
};
