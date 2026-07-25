import { createServerClient } from "$lib/orpc.server";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ depends }) => {
  depends("admin:dashboard");

  const client = createServerClient();

  const [userResult, affiliateResult, orderResult, grantResult] =
    await Promise.all([
      client.user.admin.listUsers({ page: 1 }),
      client.affiliate.admin.listApplications({
        page: 1,
        status: "PENDING",
      }),
      client.plan.listOrders({ page: 1 }),
      client.plan.admin.listGrants({ page: 1 }),
    ]);

  const recentUsersResult = await client.user.admin.listUsers({
    page: 1,
  });

  return {
    recentUsers: recentUsersResult.data,
    stats: {
      pendingAffiliateApps: affiliateResult.pagination.total,
      totalGrants: grantResult.pagination.total,
      totalOrders: orderResult.pagination.total,
      totalUsers: userResult.pagination.total,
    },
  };
};
