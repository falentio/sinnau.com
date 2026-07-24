import { affiliateAcceptApplication } from "./commands/affiliate.accept-application";
import { affiliateApply } from "./commands/affiliate.apply";
import { affiliateBackfillCommissions } from "./commands/affiliate.backfill-commissions";
import { affiliateRecordConversion } from "./commands/affiliate.record-conversion";
import { affiliateRecordPayout } from "./commands/affiliate.record-payout";
import { affiliateRejectApplication } from "./commands/affiliate.reject-application";
import { affiliateSetReferrer } from "./commands/affiliate.set-referrer";
import { affiliateSubmitPayoutAccount } from "./commands/affiliate.submit-payout-account";
import { affiliateGetDashboardSummary } from "./queries/affiliate.get-dashboard-summary";
import { affiliateGetMyApplication } from "./queries/affiliate.get-my-application";
import { affiliateGetMyPayoutAccount } from "./queries/affiliate.get-my-payout-account";
import { affiliateGetMyProfile } from "./queries/affiliate.get-my-profile";
import { affiliateListApplications } from "./queries/affiliate.list-applications";
import { affiliateListPendingPayouts } from "./queries/affiliate.list-pending-payouts";
import { affiliateReconcileCommissions } from "./queries/affiliate.reconcile-commissions";
import { affiliateResolveSlug } from "./queries/affiliate.resolve-slug";

export const affiliateRouter = {
  admin: {
    acceptApplication: affiliateAcceptApplication,
    backfillCommissions: affiliateBackfillCommissions,
    listApplications: affiliateListApplications,
    listPendingPayouts: affiliateListPendingPayouts,
    reconcileCommissions: affiliateReconcileCommissions,
    recordConversion: affiliateRecordConversion,
    recordPayout: affiliateRecordPayout,
    rejectApplication: affiliateRejectApplication,
    setReferrer: affiliateSetReferrer,
  },
  apply: affiliateApply,
  getDashboardSummary: affiliateGetDashboardSummary,
  getMyApplication: affiliateGetMyApplication,
  getMyPayoutAccount: affiliateGetMyPayoutAccount,
  getMyProfile: affiliateGetMyProfile,
  resolveSlug: affiliateResolveSlug,
  submitPayoutAccount: affiliateSubmitPayoutAccount,
};

export type AffiliateRouter = typeof affiliateRouter;
