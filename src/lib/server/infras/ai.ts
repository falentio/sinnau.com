import { building } from "$app/env";
import { env } from "$lib/server/infras/env";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const getClient = () => {
  if (process.env.VITEST || building) {
    // oxlint-disable-next-line typescript/no-explicit-any
    return undefined as never;
  }
  if (env.AI_COMPATIBILITY === "openai") {
    return createOpenAICompatible({
      apiKey: env.AI_APIKEY,
      baseURL: env.AI_BASEURL,
      name: env.AI_PROVIDER_NAME,
    });
  }
  throw new Error(`Unsupported AI_COMPATIBILITY: ${env.AI_COMPATIBILITY}`);
};

export const client = getClient();
export const getDefaultModel = () => client(env.AI_MODEL);
