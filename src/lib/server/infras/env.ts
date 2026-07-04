import { env as privateEnv } from "$env/dynamic/private";

const read = (key: string): string | undefined => {
  const value = privateEnv[key];
  if (value === undefined || value === "") {
    return undefined;
  }
  return value;
};

const required = (key: string): string => {
  const value = read(key);
  if (value === undefined) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
};

export const env = {
  AI_APIKEY: required("AI_APIKEY"),
  AI_BASEURL: required("AI_BASEURL"),
  AI_COMPATIBILITY: required("AI_COMPATIBILITY"),
  AI_MODEL: required("AI_MODEL"),
  AI_PROVIDER_NAME: required("AI_PROVIDER_NAME"),
  BETTER_AUTH_SECRET: required("BETTER_AUTH_SECRET"),
  BETTER_AUTH_URL: required("BETTER_AUTH_URL"),
  DB_FILE_NAME: read("DB_FILE_NAME") ?? ".data/data.db",
  GENERATE_USE_MOCK: read("GENERATE_USE_MOCK") ?? "false",
  LITEPARSE_APIKEY: required("LITEPARSE_APIKEY"),
  LITEPARSE_BASEURL: required("LITEPARSE_BASEURL"),
} as const;

export type Env = typeof env;
