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
  get APP_BUILD_DATE() {
    const value = read("APP_BUILD_DATE");
    if (value === undefined) {
      return new Date().toISOString();
    }
    return value;
  },
  get APP_SHA() {
    const value = read("APP_SHA");
    if (value === undefined) {
      return "<unknown>";
    }
    return value;
  },
  get APP_VERSION() {
    const version = read("APP_VERSION");
    return version ?? "0.0.0";
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
  get AXIOM_DATASET() {
    return read("AXIOM_DATASET");
  },
  get AXIOM_TOKEN() {
    return read("AXIOM_TOKEN");
  },
  get AXIOM_URL() {
    return read("AXIOM_URL") ?? "https://api.axiom.co";
  },
  get BETTER_AUTH_API_KEY() {
    return read("BETTER_AUTH_API_KEY");
  },
  get BETTER_AUTH_SECRET() {
    if (building) {
      return "danksndkasndnasndkk";
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
  get GITHUB_CLIENT_ID() {
    return read("GITHUB_CLIENT_ID");
  },
  get GITHUB_CLIENT_SECRET() {
    return read("GITHUB_CLIENT_SECRET");
  },
  get GOOGLE_CLIENT_ID() {
    return read("GOOGLE_CLIENT_ID");
  },
  get GOOGLE_CLIENT_SECRET() {
    return read("GOOGLE_CLIENT_SECRET");
  },
  get LITEPARSE_APIKEY() {
    return required("LITEPARSE_APIKEY");
  },
  get LITEPARSE_BASEURL() {
    return required("LITEPARSE_BASEURL");
  },
  get MIDTRANS_IS_PRODUCTION() {
    return (read("MIDTRANS_IS_PRODUCTION") ?? "false") === "true";
  },
  get MIDTRANS_SERVER_KEY() {
    if (building) {
      return "";
    }
    return required("MIDTRANS_SERVER_KEY");
  },
} as const;

export type Env = typeof env;
