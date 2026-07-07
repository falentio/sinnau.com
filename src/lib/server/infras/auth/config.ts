import { apiKey } from "@better-auth/api-key";
import { betterAuth } from "better-auth";
import type { BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, lastLoginMethod } from "better-auth/plugins";
import Database from "better-sqlite3";

import { env } from "../env.ts";

export const config = {
  // oxlint-disable-next-line typescript/no-explicit-any
  database: drizzleAdapter(new Database(":memory:"), { provider: "sqlite" }),
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
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    admin(),
    apiKey({}),
    lastLoginMethod({
      storeInDatabase: true,
    }),
  ],
} satisfies BetterAuthOptions;

export const auth = betterAuth(config);
