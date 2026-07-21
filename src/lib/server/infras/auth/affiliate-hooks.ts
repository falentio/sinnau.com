import { AFFILIATE_COOKIE_NAME } from "$lib/schemas/affiliate.constant";
import { eq } from "drizzle-orm";

import { db } from "../db/client.ts";
import { user as userTable } from "../db/schema/auth-schema.ts";

export const resolveAffiliateReferrer = async (ctx: {
  getCookie: (name: string) => string | undefined;
}): Promise<{ affiliatedBy: string } | Record<string, never>> => {
  const referrerId = ctx.getCookie(AFFILIATE_COOKIE_NAME);
  if (referrerId === undefined) {
    return {};
  }

  const [row] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.id, referrerId))
    .limit(1);

  if (!row) {
    return {};
  }

  return { affiliatedBy: referrerId };
};
