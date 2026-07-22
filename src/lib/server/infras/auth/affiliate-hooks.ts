import { AFFILIATE_COOKIE_NAME } from "$lib/schemas/affiliate.constant";
import { AffiliateDrizzleRepository } from "$lib/server/services/affiliate/affiliate.repository.drizzle";
import { userRepo } from "$lib/server/services/user/index";

const affiliateRepo = new AffiliateDrizzleRepository();

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

  const row = await userRepo.findUserById(referrerId);
  if (!row) {
    return {};
  }

  const profile = await affiliateRepo.findProfileByUserId(referrerId);
  if (!profile) {
    return {};
  }

  return { affiliatedBy: referrerId };
};
