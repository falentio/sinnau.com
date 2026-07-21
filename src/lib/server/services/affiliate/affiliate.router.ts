import { affiliateClaim } from "./commands/affiliate.claim";
import { affiliateRecordConversion } from "./commands/affiliate.record-conversion";
import { affiliateRecordPayout } from "./commands/affiliate.record-payout";
import { affiliateRecordRelationship } from "./commands/affiliate.record-relationship";
import { affiliateGetDashboardSummary } from "./queries/affiliate.get-dashboard-summary";
import { affiliateGetMyProfile } from "./queries/affiliate.get-my-profile";
import { affiliateGetRelationshipForUser } from "./queries/affiliate.get-relationship-for-user";
import { affiliateListPendingPayouts } from "./queries/affiliate.list-pending-payouts";
import { affiliateResolveSlug } from "./queries/affiliate.resolve-slug";

export const affiliateRouter = {
  claim: affiliateClaim,
  getDashboardSummary: affiliateGetDashboardSummary,
  getMyProfile: affiliateGetMyProfile,
  getRelationshipForUser: affiliateGetRelationshipForUser,
  listPendingPayouts: affiliateListPendingPayouts,
  recordConversion: affiliateRecordConversion,
  recordPayout: affiliateRecordPayout,
  recordRelationship: affiliateRecordRelationship,
  resolveSlug: affiliateResolveSlug,
};

export type AffiliateRouter = typeof affiliateRouter;
