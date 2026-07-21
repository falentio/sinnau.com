import { createServerClient } from "$lib/orpc.server";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ depends, params }) => {
  depends(`plan:order:${params.orderId}`);

  const client = createServerClient();
  const order = await client.plan.getOrder({ orderId: params.orderId });

  return { order };
};
