import { env } from "$lib/server/infras/env";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = () => {
  const oauthProviders: ("google" | "github")[] = [];
  if (
    env.GOOGLE_CLIENT_ID !== undefined &&
    env.GOOGLE_CLIENT_SECRET !== undefined
  ) {
    oauthProviders.push("google");
  }
  if (
    env.GITHUB_CLIENT_ID !== undefined &&
    env.GITHUB_CLIENT_SECRET !== undefined
  ) {
    oauthProviders.push("github");
  }
  return { oauthProviders };
};
