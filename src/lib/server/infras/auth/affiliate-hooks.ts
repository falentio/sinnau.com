import { AFFILIATE_COOKIE_NAME } from "$lib/schemas/affiliate.constant";
import { eq } from "drizzle-orm";

import { db } from "../db/client.ts";
import { user as userTable } from "../db/schema/auth-schema.ts";

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

  /* oxlint-disable typescript/no-unsafe-member-access, typescript/no-unsafe-assignment -- Drizzle types not resolvable by oxlint */
  const [row] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.id, referrerId))
    .limit(1);
  /* oxlint-enable typescript/no-unsafe-member-access, typescript/no-unsafe-assignment */

  if (!row) {
    return {};
  }

  return { affiliatedBy: referrerId };
};
