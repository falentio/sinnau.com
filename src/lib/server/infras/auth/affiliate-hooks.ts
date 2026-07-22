import { AFFILIATE_COOKIE_NAME } from "$lib/schemas/affiliate.constant";
import { userRepo } from "$lib/server/services/user/index";

export const resolveAffiliateReferrer = async (
  ctx: {
    getCookie: (name: string) => string | undefined | null;
  } | null
): Promise<{ affiliatedBy: string } | Record<string, never>> => {
  if (ctx === null) {
    return {};
  }

  const referrerId = ctx.getCookie(AFFILIATE_COOKIE_NAME) ?? undefined;
  if (referrerId === undefined) {
    return {};
  }

  const row = await userRepo.findUserById(referrerId);
  if (!row) {
    return {};
  }

  return { affiliatedBy: referrerId };
};
