import { createServerClient } from "$lib/orpc.server";
import {
  AFFILIATE_COOKIE_MAX_AGE_SECONDS,
  AFFILIATE_COOKIE_NAME,
} from "$lib/schemas/affiliate.constant";
import { isHttpError, redirect } from "@sveltejs/kit";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, cookies }) => {
  const client = createServerClient();

  let resolved;
  try {
    resolved = await client.affiliate.resolveSlug({ slug: params.slug });
  } catch (error) {
    if (isHttpError(error, 404)) {
      redirect(302, "/");
    }
    throw error;
  }

  cookies.set(AFFILIATE_COOKIE_NAME, resolved.userId, {
    httpOnly: true,
    maxAge: AFFILIATE_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: true,
  });

  redirect(302, "/");
};
