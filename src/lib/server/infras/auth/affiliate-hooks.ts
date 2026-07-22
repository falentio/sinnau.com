import { AFFILIATE_COOKIE_NAME } from "$lib/schemas/affiliate.constant";
import { affiliateService } from "$lib/server/services/affiliate/index";

export const resolveAffiliateReferrer = async (
  ctx: {
    getCookie: (name: string) => string | undefined | null;
  } | null,
  userId?: string
): Promise<{ affiliatedBy: string } | Record<string, never>> => {
  if (ctx === null) {
    return {};
  }

  const referrerId = ctx.getCookie(AFFILIATE_COOKIE_NAME) ?? undefined;
  if (referrerId === undefined) {
    return {};
  }

  if (userId !== undefined && userId === referrerId) {
    return {};
  }

  const hasProfile = await affiliateService
    .hasProfile(referrerId)
    .catch(() => false);
  if (!hasProfile) {
    return {};
  }

  return { affiliatedBy: referrerId };
};
