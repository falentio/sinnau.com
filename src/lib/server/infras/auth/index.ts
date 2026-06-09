import { dev } from "$app/environment";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import type { BetterAuthOptions } from "better-auth/minimal";
import { admin } from "better-auth/plugins";

import { db } from "../db/client.ts";
import { env } from "../env.ts";

const getBaseUrl = (): BetterAuthOptions["baseURL"] => {
  if (dev) {
    return {
      allowedHosts: ["*.localhost:*", "localhost:*", "*.ts.net:*"],
    };
  }
  return env.BETTER_AUTH_URL;
};

export const auth = betterAuth({
  baseURL: getBaseUrl(),
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [admin()],
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: () => (dev ? ["*://*"] : []),
});

export type Auth = typeof auth;
