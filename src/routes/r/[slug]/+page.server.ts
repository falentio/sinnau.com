import { createServerClient } from "$lib/orpc.server";
import {
  AFFILIATE_COOKIE_MAX_AGE_SECONDS,
  AFFILIATE_COOKIE_NAME,
} from "$lib/schemas/affiliate.constant";
import { redirect } from "@sveltejs/kit";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, cookies }) => {
  const client = createServerClient();

  const { userId } = await client.affiliate.resolveSlug({ slug: params.slug });

  cookies.set(AFFILIATE_COOKIE_NAME, userId, {
    maxAge: AFFILIATE_COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });

  redirect(302, "/");
};
