import {
  CHUNK_CLEANUP_AGE_DAYS,
  CHUNK_POLL_LIMIT,
  GENERATE_CHUNK_QUERY_CUTOFF_MS,
  GENERATE_ID_PREFIX,
  GENERATE_INPUT_MAX_CHARS,
} from "$lib/schemas/generate.constant";
import { getLogger } from "@logtape/logtape";
import { ORPCError } from "@orpc/server";

import type {
  CheckGenerateContentInput,
  CheckGenerateContentOutput,
  CreateGenerateInput,
  CreateGenerateOutput,
} from "../../../schemas/generate.ts";
import type { Generate } from "../../infras/db/schema/generate.ts";
import type {
  ChunkRecord,
  GenerationStorage,
  SuccessRecord,
} from "../../infras/generate/generate";
import type { LanguageStyleId } from "../../infras/generate/language-style";
import { waitUntil } from "../../utils/background-jobs.ts";
import { generateId } from "../../utils/nanoid.ts";
import type { GenerateGuard } from "./generate.guard.ts";
import type { GenerationPipeline } from "./generate.pipeline.ts";
import type { GenerateRepository } from "./generate.repository.ts";

export type { CreateGenerateInput, CreateGenerateOutput };
export type { Generate };

const logger = getLogger(["sinnau.com", "generate", "service"]);

const MAX_RETRIES = 3;

interface StudySetServiceClient {
  createStudySet(
    input: {
      title: string;
      description?: string;
      visibility?: string;
      files?: string[];
    },
    ownerId: string
  ): Promise<{ id: string }>;
}

interface StudySetGuardClient {
  assertStudySetVisibleByIdOrNotFound(
    studySetId: string,
    userId: string
  ): Promise<unknown>;
}

export interface LanguageStyleItem {
  value: LanguageStyleId;
  label: string;
  isDefault: boolean;
}

export class GenerateService {
  private readonly activeOwners = new Set<string>();

  private readonly repo: GenerateRepository;

  private readonly guard: GenerateGuard;

  private readonly pipeline: GenerationPipeline;

  private readonly studySetService: StudySetServiceClient;

  private readonly studySetGuard: StudySetGuardClient;

  constructor(
    repo: GenerateRepository,
    guard: GenerateGuard,
    pipeline: GenerationPipeline,
    studySetService: StudySetServiceClient,
    studySetGuard: StudySetGuardClient
  ) {
    this.repo = repo;
    this.guard = guard;
    this.pipeline = pipeline;
    this.studySetService = studySetService;
    this.studySetGuard = studySetGuard;
  }

  async findActiveByStudySet(
    studySetId: string,
    userId: string
  ): Promise<Generate | null> {
    await this.studySetGuard.assertStudySetVisibleByIdOrNotFound(
      studySetId,
      userId
    );
    return await this.repo.findActiveByStudySetId(studySetId);
  }

  async createGenerate(
    input: CreateGenerateInput,
    ownerId: string | null | undefined
  ): Promise<CreateGenerateOutput> {
    const owner = this.guard.requireOwner(ownerId);

    if (this.activeOwners.has(owner)) {
      throw new ORPCError("CONCURRENCY_LIMIT", {
        message: "A generation is already in progress",
      });
    }

    let pdfText: string;
    try {
      const result = await this.pipeline.parseLiteparse({ pdf: input.pdf });
      pdfText = result.text;
    } catch {
      throw new ORPCError("LITEPARSE_FAILED", {
        message: "Failed to parse the PDF file",
      });
    }

    const studySet = await this.studySetService.createStudySet(
      {
        description: input.description,
        files: [input.pdf.name],
        title: input.title,
        visibility: input.visibility,
      },
      owner
    );

    const newId = generateId(GENERATE_ID_PREFIX);
    const generateRow = await this.repo.insertGenerate({
      completedAt: null,
      id: newId,
      ownerId: owner,
      startedAt: new Date(),
      status: "CREATED",
      studySetId: studySet.id,
    });

    const truncated = pdfText.length > GENERATE_INPUT_MAX_CHARS;
    const inputText = truncated
      ? pdfText.slice(0, GENERATE_INPUT_MAX_CHARS)
      : pdfText;

    await this.repo.insertGenerateInput({
      generateId: generateRow.id,
      input: inputText,
      isInputTruncated: truncated,
    });

    this.activeOwners.add(owner);

    const pipelinePromise = this.runPipeline({
      extractionType: input.extractionType ?? "normal",
      generateId: generateRow.id,
      languageStyle: input.languageStyle ?? "student-friendly",
      ownerId: owner,
      pdfText,
      studySetId: studySet.id,
    });

    waitUntil(
      // oxlint-disable-next-line promise/prefer-await-to-then
      pipelinePromise.finally(() => {
        this.activeOwners.delete(owner);
      })
    );

    return {
      generateId: generateRow.id,
      studySetId: studySet.id,
    };
  }

  async checkGenerateContent(
    input: CheckGenerateContentInput,
    userId: string
  ): Promise<CheckGenerateContentOutput> {
    const row = await this.repo.findGenerateById(input.id);
    if (!row) {
      throw new ORPCError("NOT_FOUND", { message: "Generation not found" });
    }

    await this.studySetGuard.assertStudySetVisibleByIdOrNotFound(
      row.studySetId,
      userId
    );

    const generateInputRow = await this.repo.findGenerateInputByGenerateId(
      row.id
    );

    const summaries = await this.repo.findChunkSummaries(
      row.id,
      input.since ?? null,
      CHUNK_POLL_LIMIT,
      GENERATE_CHUNK_QUERY_CUTOFF_MS
    );

    let maxCreatedAt: number | null = null;
    if (summaries.length > 0) {
      const [first] = summaries;
      if (first) {
        maxCreatedAt = first.createdAt;
        for (const s of summaries) {
          if (s.createdAt > maxCreatedAt) {
            maxCreatedAt = s.createdAt;
          }
        }
      }
    }

    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const chunks = summaries.map((s) => ({
      index: s.index,
      kind: s.kind,
      payload: s.payload,
    })) as CheckGenerateContentOutput["chunks"];

    return {
      chunks,
      isInputTruncated: generateInputRow?.isInputTruncated ?? false,
      maxCreatedAt,
      startedAt: row.startedAt.getTime(),
      status: row.status,
      studySetId: row.studySetId,
    };
  }

  async cleanupChunks(
    olderThanDays?: number
  ): Promise<{ deletedCount: number }> {
    const days = olderThanDays ?? CHUNK_CLEANUP_AGE_DAYS;
    const deletedCount = await this.repo.deleteOldChunks(days);
    return { deletedCount };
  }

  async startupRecovery(): Promise<void> {
    await this.repo.finalizeStuckAsFailed("Server restarted during generation");
  }

  private async runPipeline(params: {
    extractionType: string;
    generateId: string;
    languageStyle: string;
    ownerId: string;
    pdfText: string;
    studySetId: string;
  }): Promise<void> {
    const {
      extractionType,
      generateId: gId,
      languageStyle,
      ownerId,
      pdfText,
      studySetId,
    } = params;

    await this.retryStatusUpdate(gId, "ONGOING");

    const { repo } = this;

    const storage = {
      // oxlint-disable-next-line typescript/promise-function-async
      appendChunkResult(record: ChunkRecord): Promise<void> {
        return repo.appendChunkResult({ generateId: gId, record });
      },
      async loadChunkResults() {
        const rows = await repo.loadChunkResults(gId);
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        return rows.map((r) => JSON.parse(r.payload) as ChunkRecord);
      },
    } satisfies GenerationStorage;

    let totalChunkCount = 0;
    let successCount = 0;
    let successfulChunks: SuccessRecord[] = [];

    try {
      const result = await this.pipeline.runLLM({
        extractionType,
        languageStyle,
        pdfText,
        storage,
      });
      const { successCount: sc, totalChunkCount: tc } = result;
      totalChunkCount = tc;
      successCount = sc;

      const rows = await this.repo.loadChunkResults(gId);
      successfulChunks = rows
        .filter((r) => r.kind === "success")
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        .map((r) => JSON.parse(r.payload) as SuccessRecord);
    } catch (error) {
      logger.error("Error occurred while running LLM: {error}", { error });
      const rows = await this.repo.loadChunkResults(gId);
      successfulChunks = rows
        .filter((r) => r.kind === "success")
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        .map((r) => JSON.parse(r.payload) as SuccessRecord);
      successCount = successfulChunks.length;
    }

    if (successCount === 0) {
      await this.retryStatusUpdate(gId, "FAILED", Date.now());
      return;
    }

    try {
      await this.pipeline.finalizeTransaction({
        generateId: gId,
        ownerId,
        studySetId,
        successfulChunks,
      });
    } catch {
      return;
    }

    const status =
      successCount === totalChunkCount ? "COMPLETED" : "PARTIAL_COMPLETED";
    await this.retryStatusUpdate(gId, status, Date.now());
  }

  // eslint-disable-next-line class-methods-use-this
  getLanguageStyles(): LanguageStyleItem[] {
    return [
      {
        isDefault: true,
        label: "Ramah Pelajar",
        value: "student-friendly",
      },
      { isDefault: false, label: "Akademik", value: "academic" },
      { isDefault: false, label: "Dasar", value: "elementary" },
    ];
  }

  private async retryStatusUpdate(
    gId: string,
    status: Generate["status"],
    completedAt?: number
  ): Promise<void> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
      const updated = await this.repo.updateGenerateStatus(
        gId,
        status,
        completedAt
      );
      if (updated) {
        return;
      }
    }
  }
}
