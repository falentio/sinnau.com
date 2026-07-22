import { dev } from "$app/environment";
import { config } from "$lib/server/infras/auth/config";
import { betterAuth } from "better-auth";
import type { BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";

import { db } from "../db/client.ts";
import { env } from "../env.ts";
import { resolveAffiliateReferrer } from "./affiliate-hooks.ts";

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
  account: {
    accountLinking: {
      disableImplicitLinking: false,
      enabled: true,
      trustedProviders: ["google", "github"],
    },
  },
  baseURL: getBaseUrl(),
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  databaseHooks: {
    user: {
      create: {
        before: async (user, ctx) => {
          const email = user.email.toLowerCase();
          const isAdmin = env.AUTH_ADMIN_EMAILS.includes(email);
          return {
            data: {
              ...user,
              ...(await resolveAffiliateReferrer(ctx)),
              emailVerified: true,
              role: isAdmin ? "admin" : "user",
            },
          };
        },
      },
    },
  },
  // oxlint-disable typescript/consistent-return typescript/no-unsafe-assignment
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/change-password") {
        return {
          context: {
            ...ctx,
            body: {
              ...ctx.body,
              revokeOtherSessions: true,
            },
          },
        };
      }
    }),
  },
  secret: env.BETTER_AUTH_SECRET,
  socialProviders,
  trustedOrigins: () => (dev ? ["*://*"] : []),
});

export type Auth = typeof auth;
