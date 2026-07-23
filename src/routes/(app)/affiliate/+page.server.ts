import { createServerClient } from "$lib/orpc.server";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url }) => {
  const client = createServerClient();
  const summary = await client.affiliate.getDashboardSummary({});

  let application: Awaited<
    ReturnType<typeof client.affiliate.getMyApplication>
  > | null = null;
  if (!summary.profile) {
    try {
      application = await client.affiliate.getMyApplication({});
    } catch {
      application = null;
    }
  }

  return { application, origin: url.origin, summary };
};
