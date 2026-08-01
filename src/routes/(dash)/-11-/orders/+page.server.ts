import { createServerClient } from "$lib/orpc.server";
import { ORDER_STATUSES } from "$lib/schemas/plan.constant";
import { parsePage } from "$lib/utils/pagination";

import type { PageServerLoad } from "./$types";

const isOrderStatus = (
  value: string | null
): value is (typeof ORDER_STATUSES)[number] =>
  value !== null && (ORDER_STATUSES as readonly string[]).includes(value);

export const load: PageServerLoad = async ({ depends, url }) => {
  depends("plan:orders");

  const page = parsePage(url.searchParams.get("page"));
  const statusParam = url.searchParams.get("status");
  const status = isOrderStatus(statusParam) ? statusParam : undefined;

  const client = createServerClient();
  const result = await client.plan.admin.listOrders({ page, status });

  return {
    orders: result.data,
    pagination: result.pagination,
  };
};
