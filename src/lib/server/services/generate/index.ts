import { env } from "$lib/server/infras/env";
import { liteparseClient } from "$lib/server/infras/liteparse";
import {
  studySetGuard,
  studySetService,
} from "$lib/server/services/study-set/index";

import { GenerateGuard } from "./generate.guard.ts";
import {
  createFinalizeTransactionDefault,
  createParseLiteparseDefault,
  createParseLiteparseMock,
  createRunLLMDefault,
  createRunLLMMock,
} from "./generate.pipeline.defaults.ts";
import type { GenerationPipeline } from "./generate.pipeline.ts";
import { GenerateDrizzleRepository } from "./generate.repository.drizzle.ts";
import { GenerateService } from "./generate.service.ts";

const generateRepo = new GenerateDrizzleRepository();

const useMock = env.GENERATE_USE_MOCK === "true";

const pipeline: GenerationPipeline = {
  finalizeTransaction: createFinalizeTransactionDefault(generateRepo),
  parseLiteparse: useMock
    ? createParseLiteparseMock()
    : createParseLiteparseDefault(liteparseClient),
  runLLM: useMock ? createRunLLMMock() : createRunLLMDefault(generateRepo),
};

export const generateGuard = new GenerateGuard(generateRepo);
export const generateService = new GenerateService(
  generateRepo,
  generateGuard,
  pipeline,
  studySetService,
  studySetGuard
);
