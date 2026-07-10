import { client } from "$lib/orpc";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ depends }) => {
  depends("plans:catalog");

  const [plans, activePlan] = await Promise.all([
    client.plan.listPlans(),
    client.plan.getAiLimit().catch(() => null),
  ]);

  return { activePlan, plans };
};
