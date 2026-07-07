import { dev } from "$app/environment";
import { config } from "$lib/server/infras/auth/config";
import { betterAuth } from "better-auth";
import type { BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "../db/client.ts";
import { env } from "../env.ts";

const getBaseUrl = (): BetterAuthOptions["baseURL"] => {
  if (dev) {
    return {
      allowedHosts: [
        "*.localhost:*",
        "localhost:*",
        "*.ts.net:*",
        "*.falentio:*",
      ],
    };
  }
  return env.BETTER_AUTH_URL;
};

export const auth = betterAuth({
  ...config,
  baseURL: getBaseUrl(),
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: () => (dev ? ["*://*"] : []),
});

export type Auth = typeof auth;
