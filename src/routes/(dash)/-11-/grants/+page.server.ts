import { createServerClient } from "$lib/orpc.server";
import { PLAN_KEYS } from "$lib/schemas/plan.constant";
import { parsePage } from "$lib/utils/pagination";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ depends, url }) => {
  depends("plan:grants");

  const page = parsePage(url.searchParams.get("page"));
  const planKeyRaw = url.searchParams.get("planKey");
  const planKey =
    planKeyRaw !== null && planKeyRaw !== ""
      ? (PLAN_KEYS.find((k) => k === planKeyRaw) ?? undefined)
      : undefined;
  const userId = url.searchParams.get("userId") ?? undefined;
  const grantedBy = url.searchParams.get("grantedBy") ?? undefined;

  const client = createServerClient();
  const result = await client.plan.admin.listGrants({
    grantedBy,
    page,
    planKey,
    userId,
  });

  return {
    grants: result.data,
    pagination: result.pagination,
  };
};
