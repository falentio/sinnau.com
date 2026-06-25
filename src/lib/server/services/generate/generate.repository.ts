import type {
  ChunkRecord,
  SuccessRecord,
} from "$lib/server/infras/generate/generate";

import type {
  Generate,
  GenerateChunkResult,
  GenerateInput,
} from "../../infras/db/schema/generate.ts";

export interface ChunkSummary {
  index: number;
  kind: "success" | "failure";
  payload: ChunkRecord;
  createdAt: number;
}

export interface GenerateRepository {
  insertGenerate(
    row: Omit<Generate, "createdAt" | "updatedAt">
  ): Promise<Generate>;
  updateGenerateStatus(
    id: string,
    status: Generate["status"],
    completedAt?: number
  ): Promise<Generate | null>;
  findGenerateById(id: string): Promise<Generate | null>;
  finalizeStuckAsFailed(reason: string): Promise<number>;
  insertGenerateInput(row: Omit<GenerateInput, "id">): Promise<GenerateInput>;
  findGenerateInputByGenerateId(
    generateId: string
  ): Promise<GenerateInput | null>;
  appendChunkResult(params: {
    generateId: string;
    record: ChunkRecord;
  }): Promise<void>;
  loadChunkResults(generateId: string): Promise<GenerateChunkResult[]>;
  findChunkSummaries(
    generateId: string,
    since: number | null,
    limit: number,
    cutoffMs: number
  ): Promise<ChunkSummary[]>;
  deleteOldChunks(olderThanDays: number): Promise<number>;
  finalizeGenerateTransaction(params: {
    generateId: string;
    ownerId: string;
    studySetId: string;
    successfulChunks: SuccessRecord[];
  }): Promise<void>;
}
