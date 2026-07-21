import { referralGetOrCreateProfile } from "./commands/referral.get-or-create-profile.ts";
import { referralResolveSlug } from "./queries/referral.resolve-slug.ts";

export const referralRouter = {
  getOrCreateProfile: referralGetOrCreateProfile,
  resolveSlug: referralResolveSlug,
};

export type ReferralRouter = typeof referralRouter;
