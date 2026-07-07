import { apiKey } from "@better-auth/api-key";
import { dash } from "@better-auth/infra";
import { betterAuth } from "better-auth";
import type { BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, lastLoginMethod } from "better-auth/plugins";
import Database from "better-sqlite3";

export const config = {
  advanced: {
    ipAddress: {
      ipAddressHeaders: ["cf-connecting-ip"],
    },
  },
  database: drizzleAdapter(new Database(":memory:"), { provider: "sqlite" }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    admin(),
    apiKey({}),
    lastLoginMethod({
      storeInDatabase: true,
    }),
    dash({
      apiKey: process.env.BETTER_AUTH_API_KEY ?? "",
    }),
  ],
  rateLimit: {
    customRules: {
      "/change-password": { max: 9, window: 600 },
      "/forget-password": { max: 9, window: 600 },
      "/reset-password": { max: 9, window: 600 },
      "/send-verification-email": { max: 9, window: 600 },
      "/sign-in/email": { max: 15, window: 300 },
      "/sign-up/email": { max: 15, window: 300 },
      "/verify-email": { max: 9, window: 600 },
    },
    max: 100,
    window: 60,
  },
} satisfies BetterAuthOptions;

export const auth = betterAuth(config);
