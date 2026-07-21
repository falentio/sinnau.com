import { affiliateClaim } from "./commands/affiliate.claim";
import { affiliateRecordConversion } from "./commands/affiliate.record-conversion";
import { affiliateRecordPayout } from "./commands/affiliate.record-payout";
import { affiliateGetDashboardSummary } from "./queries/affiliate.get-dashboard-summary";
import { affiliateListPendingPayouts } from "./queries/affiliate.list-pending-payouts";
import { affiliateResolveSlug } from "./queries/affiliate.resolve-slug";

export const affiliateRouter = {
  claim: affiliateClaim,
  getDashboardSummary: affiliateGetDashboardSummary,
  listPendingPayouts: affiliateListPendingPayouts,
  recordConversion: affiliateRecordConversion,
  recordPayout: affiliateRecordPayout,
  resolveSlug: affiliateResolveSlug,
};

export type AffiliateRouter = typeof affiliateRouter;
