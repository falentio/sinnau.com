import { createServerClient } from "$lib/orpc.server";
import { orderStatusSchema } from "$lib/schemas/plan";
import { parsePage } from "$lib/utils/pagination";
import * as v from "valibot";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ depends, url }) => {
  depends("plan:orders");

  const page = parsePage(url.searchParams.get("page"));
  const parsedStatus = v.safeParse(
    orderStatusSchema,
    url.searchParams.get("status")
  );
  const status = parsedStatus.success ? parsedStatus.output : undefined;

  const client = createServerClient();
  const result = await client.plan.admin.listOrders({ page, status });

  return {
    orders: result.data,
    pagination: result.pagination,
  };
};
