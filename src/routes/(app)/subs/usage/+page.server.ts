import { createServerClient } from "$lib/orpc.server";
import { error } from "@sveltejs/kit";

import type { PageServerLoad } from "./$types";

const parsePage = (raw: string | null): number => {
  if (raw === null || raw === "") {
    return 1;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    error(400, { message: "page invalid" });
  }
  return parsed;
};

export const load: PageServerLoad = async ({ depends, url }) => {
  depends("plan:ai-limit");
  depends("plan:orders");

  const page = parsePage(url.searchParams.get("page"));

  const client = createServerClient();
  const [activePlan, ordersResult] = await Promise.all([
    // oxlint-disable-next-line no-warning-comments
    // TODO: refactor getAiLimit to return null instead of throwing NO_ACTIVE_PLAN,
    // then remove this catch so unexpected errors propagate to the error boundary
    client.plan.getAiLimit().catch(() => null),
    client.plan.listOrders({ excludeStatuses: ["PENDING"], page }),
  ]);

  return {
    activePlan,
    orders: ordersResult.data,
    pagination: ordersResult.pagination,
  };
};
