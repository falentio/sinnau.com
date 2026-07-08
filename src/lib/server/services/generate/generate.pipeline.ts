import type {
  GenerationStorage,
  SuccessRecord,
} from "../../infras/generate/generate";

export type ParseLiteparseFn = (input: {
  pdf: File;
}) => Promise<{ text: string }>;

export type RunLLMFn = (input: {
  pdfText: string;
  languageStyle: string;
  extractionType: string;
  storage: GenerationStorage;
  generateId: string;
}) => Promise<{ totalChunkCount: number; successCount: number }>;

export type FinalizeTransactionFn = (input: {
  generateId: string;
  ownerId: string;
  studySetId: string;
  successfulChunks: SuccessRecord[];
}) => Promise<void>;

export interface GenerationPipeline {
  parseLiteparse: ParseLiteparseFn;
  runLLM: RunLLMFn;
  finalizeTransaction: FinalizeTransactionFn;
}
