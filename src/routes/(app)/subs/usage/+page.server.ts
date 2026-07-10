import { client } from "$lib/orpc";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ depends }) => {
  depends("plan:ai-limit");
  depends("plan:orders");

  const [activePlan, ordersResult] = await Promise.all([
    client.plan.getAiLimit().catch(() => null),
    client.plan.listOrders({ page: 1 }),
  ]);

  const orders = ordersResult.data.filter((o) => o.status !== "PENDING");

  return {
    activePlan,
    orders,
  };
};
