import { createServerClient } from "$lib/orpc.server";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ depends, url }) => {
  depends("affiliate:summary");

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

  let payoutAccount: Awaited<
    ReturnType<typeof client.affiliate.getMyPayoutAccount>
  > | null = null;
  if (summary.profile) {
    try {
      payoutAccount = await client.affiliate.getMyPayoutAccount({});
    } catch {
      payoutAccount = null;
    }
  }

  return { application, origin: url.origin, payoutAccount, summary };
};
