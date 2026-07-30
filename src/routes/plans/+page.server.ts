import { client } from "$lib/orpc";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  const plans = await client.plan.listPlans();

  return { plans };
};
