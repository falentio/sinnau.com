import { client } from "$lib/orpc";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ depends }) => {
  depends("plans:catalog");
  depends("plan:ai-limit");

  const [plans, activePlan] = await Promise.all([
    client.plan.listPlans(),
    // oxlint-disable-next-line no-warning-comments
    // TODO: refactor getAiLimit to return null instead of throwing NO_ACTIVE_PLAN,
    // then remove this catch so unexpected errors propagate to the error boundary
    client.plan.getAiLimit().catch(() => null),
  ]);

  return { activePlan, plans };
};
