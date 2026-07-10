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
        "*.trycloudflare.com",
      ],
    };
  }
  return env.BETTER_AUTH_URL;
};

const socialProviders: BetterAuthOptions["socialProviders"] = {};
if (
  env.GOOGLE_CLIENT_ID !== undefined &&
  env.GOOGLE_CLIENT_SECRET !== undefined
) {
  socialProviders.google = {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  };
}
if (
  env.GITHUB_CLIENT_ID !== undefined &&
  env.GITHUB_CLIENT_SECRET !== undefined
) {
  socialProviders.github = {
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
  };
}

export const auth = betterAuth({
  ...config,
  baseURL: getBaseUrl(),
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const email = user.email.toLowerCase();
          const isAdmin =
            env.AUTH_ADMIN_EMAILS.includes(email) ||
            env.AUTH_ADMIN_EMAIL_DOMAINS.some((domain) =>
              email.endsWith(`@${domain}`)
            );
          return {
            data: {
              ...user,
              role: isAdmin ? "admin" : "user",
            },
          };
        },
      },
    },
  },
  secret: env.BETTER_AUTH_SECRET,
  socialProviders,
  trustedOrigins: () => (dev ? ["*://*"] : []),
});

export type Auth = typeof auth;
