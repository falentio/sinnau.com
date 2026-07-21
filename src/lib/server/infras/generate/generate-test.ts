import { open, writeFile } from "node:fs/promises";

import { getDefaultModel } from "$lib/server/infras/ai";
import { generate } from "$lib/server/infras/generate/generate";
import type { ChunkRecord } from "$lib/server/infras/generate/generate";
import { getLogger } from "@logtape/logtape";

import matematika from "./prompt/matematika.md?raw";

const logger = getLogger(["sinnau.com", "generate", "script"]);

const id = Math.random().toString(36).slice(2, 4);

const startTime = new Date().toISOString();
const file = await open(`./data/generate-result-${startTime}-${id}.jsonl`, "w");

await file.writeFile(
  `${JSON.stringify({ timestamp: new Date().toISOString(), type: "start" })}\n`
);

const events: ChunkRecord[] = [];

const result = await generate({
  content: matematika,
  generateId: `dev-${id}`,
  languageModel: getDefaultModel(),
  storage: {
    appendChunkResult: async (record) => {
      events.push(record);
      await file.writeFile(
        `${JSON.stringify({
          record,
          timestamp: new Date().toISOString(),
          type: "chunk",
        })}\n`
      );
    },
    loadChunkResults: async () => {
      await Promise.resolve();
      return events;
    },
  },
});

await file.close();
await writeFile(
  `./data/generate-record-${startTime}-${id}.json`,
  JSON.stringify({ result }, null, 2)
);
logger.info("Generation result:", { result });
