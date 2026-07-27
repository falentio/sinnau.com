import { redirect } from "@sveltejs/kit";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  const u = locals.mustGetUser();
  if (u.tosAcceptedAt) {
    redirect(302, "/home");
  }
  return { name: u.name };
};
