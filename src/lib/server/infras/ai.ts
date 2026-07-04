import { building } from "$app/env";
import { env } from "$lib/server/infras/env";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const getClient = () => {
  if (process.env.VITEST || building) {
    // oxlint-disable-next-line typescript/no-explicit-any
    return undefined as any;
  }
  if (env.AI_COMPATIBILITY === "openai") {
    return createOpenAICompatible({
      apiKey: env.AI_APIKEY,
      baseURL: env.AI_BASEURL,
      async fetch(...args) {
        const init: RequestInit = args[1] ?? {};
        const body = JSON.parse(init.body as string);
        console.log({
          keys: Object.keys(body),
          thinking: body.thinking,
        });
        return await fetch(...args);
      },
      name: env.AI_PROVIDER_NAME,
    });
  }
  throw new Error(`Unsupported AI_COMPATIBILITY: ${env.AI_COMPATIBILITY}`);
};

export const client = getClient();
export const getDefaultModel = () => client(env.AI_MODEL);
