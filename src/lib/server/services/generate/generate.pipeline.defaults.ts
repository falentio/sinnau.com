import { defaultModel } from "$lib/server/infras/ai";
import type {
  GenerationStorage,
  SuccessRecord,
} from "$lib/server/infras/generate/generate";
import { generate as runGenerate } from "$lib/server/infras/generate/generate";
import type { LanguageStyleId } from "$lib/server/infras/generate/language-style";
import type { LiteparseClient } from "@falentio/liteparse-client";

import type { GenerateRepository } from "./generate.repository.ts";

type ParseLiteparseImpl = (input: { pdf: File }) => Promise<{ text: string }>;

export const createParseLiteparseDefault =
  (client: LiteparseClient): ParseLiteparseImpl =>
  async (input: { pdf: File }) => {
    const result = await client.parse(input.pdf);
    if (!result.ok) {
      throw new Error(`LITEPARSE_FAILED: ${JSON.stringify(result.error)}`);
    }
    return { text: result.value };
  };

type RunLLMImpl = (input: {
  pdfText: string;
  languageStyle: string;
  extractionType: string;
  storage: GenerationStorage;
}) => Promise<{ totalChunkCount: number; successCount: number }>;

export const createRunLLMDefault =
  (_repo: GenerateRepository): RunLLMImpl =>
  async (input) => {
    const result = await runGenerate({
      content: input.pdfText,
      extractionType:
        input.extractionType === "exhaustive" ? "exhaustive" : "normal",
      languageModel: defaultModel,
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      languageStyle: input.languageStyle as LanguageStyleId | undefined,
      storage: input.storage,
    });

    return {
      successCount: result.processedChunks - result.failedChunks.length,
      totalChunkCount: result.totalChunks,
    };
  };

type FinalizeTransactionImpl = (input: {
  generateId: string;
  ownerId: string;
  studySetId: string;
  successfulChunks: SuccessRecord[];
}) => Promise<void>;

export const createFinalizeTransactionDefault =
  (repo: GenerateRepository): FinalizeTransactionImpl =>
  async (input) => {
    await repo.finalizeGenerateTransaction(input);
  };
