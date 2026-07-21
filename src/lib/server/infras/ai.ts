import { building } from "$app/env";
import { env } from "$lib/server/infras/env";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const getClient = (): ReturnType<typeof createOpenAICompatible> => {
  if (process.env.VITEST !== undefined || building) {
    throw new Error("AI client cannot be created during test/build");
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
