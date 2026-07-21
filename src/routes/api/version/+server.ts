import { env } from "$lib/server/infras/env";

export const GET = () =>
  Response.json({
    buildDate: env.APP_BUILD_DATE,
    sha: env.APP_SHA,
    version: env.APP_VERSION,
  });
