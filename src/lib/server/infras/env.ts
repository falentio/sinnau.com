import { building } from "$app/env";
import { env as privateEnv } from "$env/dynamic/private";

const read = (key: string): string | undefined => {
  const value = privateEnv[key];
  if (value === undefined || value === "") {
    return undefined;
  }
  return value;
};

const required = (key: string): string => {
  if (building) {
    return "";
  }
  const value = read(key);
  if (value === undefined) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
};

export const env = {
  get AI_APIKEY() {
    return required("AI_APIKEY");
  },
  get AI_BASEURL() {
    return required("AI_BASEURL");
  },
  get AI_COMPATIBILITY() {
    return required("AI_COMPATIBILITY");
  },
  get AI_MODEL() {
    return required("AI_MODEL");
  },
  get AI_PROVIDER_NAME() {
    return required("AI_PROVIDER_NAME");
  },
  get AUTH_ADMIN_EMAILS() {
    return (
      read("AUTH_ADMIN_EMAILS")
        ?.split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean) ?? []
    );
  },
  get AUTH_ADMIN_EMAIL_DOMAINS() {
    return (
      read("AUTH_ADMIN_EMAIL_DOMAINS")
        ?.split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean) ?? []
    );
  },
  get BETTER_AUTH_SECRET() {
    if (building) {
      return "dev-secret";
    }
    return required("BETTER_AUTH_SECRET");
  },
  get BETTER_AUTH_URL() {
    return required("BETTER_AUTH_URL");
  },
  get DB_FILE_NAME() {
    return read("DB_FILE_NAME") ?? ".data/data.db";
  },
  get GENERATE_USE_MOCK() {
    return read("GENERATE_USE_MOCK") ?? "false";
  },
  get LITEPARSE_APIKEY() {
    return required("LITEPARSE_APIKEY");
  },
  get LITEPARSE_BASEURL() {
    return required("LITEPARSE_BASEURL");
  },
} as const;

export type Env = typeof env;
