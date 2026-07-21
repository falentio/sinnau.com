import { env } from "$lib/server/infras/env";
import { LiteparseClient } from "@falentio/liteparse-client";

export const liteparseClient = new LiteparseClient({
  apiKey: env.LITEPARSE_APIKEY,
  baseUrl: env.LITEPARSE_BASEURL,
  endpoint: "parse-stream",
});
