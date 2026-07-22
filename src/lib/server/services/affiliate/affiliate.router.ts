import { affiliateBackfillCommissions } from "./commands/affiliate.backfill-commissions";
import { affiliateClaim } from "./commands/affiliate.claim";
import { affiliateRecordConversion } from "./commands/affiliate.record-conversion";
import { affiliateRecordPayout } from "./commands/affiliate.record-payout";
import { affiliateSetReferrer } from "./commands/affiliate.set-referrer";
import { affiliateGetDashboardSummary } from "./queries/affiliate.get-dashboard-summary";
import { affiliateGetMyProfile } from "./queries/affiliate.get-my-profile";
import { affiliateListPendingPayouts } from "./queries/affiliate.list-pending-payouts";
import { affiliateReconcileCommissions } from "./queries/affiliate.reconcile-commissions";
import { affiliateResolveSlug } from "./queries/affiliate.resolve-slug";

export const affiliateRouter = {
  backfillCommissions: affiliateBackfillCommissions,
  claim: affiliateClaim,
  getDashboardSummary: affiliateGetDashboardSummary,
  getMyProfile: affiliateGetMyProfile,
  listPendingPayouts: affiliateListPendingPayouts,
  reconcileCommissions: affiliateReconcileCommissions,
  recordConversion: affiliateRecordConversion,
  recordPayout: affiliateRecordPayout,
  resolveSlug: affiliateResolveSlug,
  setReferrer: affiliateSetReferrer,
};

export type AffiliateRouter = typeof affiliateRouter;
