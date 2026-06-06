import { dev } from "$app/environment";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";

import { db } from "../db/client.ts";
import { env } from "../env.ts";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
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
