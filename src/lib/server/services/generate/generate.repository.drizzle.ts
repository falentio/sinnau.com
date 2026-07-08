import { CHAPTER_ID_PREFIX } from "$lib/schemas/chapter";
import { FLASHCARD_ID_PREFIX } from "$lib/schemas/flashcard";
import { QUIZ_ID_PREFIX, QUIZ_OPTION_ID_PREFIX } from "$lib/schemas/quiz";
import type {
  ChunkRecord,
  SuccessRecord,
} from "$lib/server/infras/generate/generate";
import { getLogger } from "@logtape/logtape";
import { ORPCError } from "@orpc/server";
import { and, eq, gt, inArray, lt } from "drizzle-orm";

import type { DB } from "../../infras/db/client.ts";
import { db as defaultDb } from "../../infras/db/client.ts";
import { chapter } from "../../infras/db/schema/chapter.ts";
import { flashcard } from "../../infras/db/schema/flashcard.ts";
import {
  generate,
  generateChunkResult,
  generateInput,
} from "../../infras/db/schema/generate.ts";
import type {
  Generate,
  GenerateChunkResult,
  GenerateInput,
} from "../../infras/db/schema/generate.ts";
import { quiz, quizOption } from "../../infras/db/schema/quiz.ts";
import { studySet } from "../../infras/db/schema/study-set.ts";
import { generateId as createId } from "../../utils/nanoid.ts";
import type {
  ChunkSummary,
  GenerateRepository,
} from "./generate.repository.ts";

const logger = getLogger(["sinnau.com", "generate", "repo"]);

export class GenerateDrizzleRepository implements GenerateRepository {
  private readonly dbInstance: DB;

  constructor(db: DB = defaultDb) {
    this.dbInstance = db;
  }

  static withDatabase(db: DB): GenerateDrizzleRepository {
    return new GenerateDrizzleRepository(db);
  }

  async insertGenerate(
    row: Omit<Generate, "createdAt" | "updatedAt">
  ): Promise<Generate> {
    const [created] = await this.dbInstance
      .insert(generate)
      .values(row)
      .returning();
    if (!created) {
      throw new Error("Failed to insert generate");
    }
    return created;
  }

  async updateGenerateStatus(
    id: string,
    status: Generate["status"],
    completedAt?: number
  ): Promise<Generate | null> {
    const updateValues: {
      status: typeof status;
      completedAt?: Date;
    } = {
      status,
    };
    if (completedAt !== undefined) {
      updateValues.completedAt = new Date(completedAt);
    }
    const [updated] = await this.dbInstance
      .update(generate)
      .set(updateValues)
      .where(eq(generate.id, id))
      .returning();
    return updated ?? null;
  }

  async findGenerateById(id: string): Promise<Generate | null> {
    const [row] = await this.dbInstance
      .select()
      .from(generate)
      .where(eq(generate.id, id));
    return row ?? null;
  }

  async findActiveByStudySetId(studySetId: string): Promise<Generate | null> {
    const [row] = await this.dbInstance
      .select()
      .from(generate)
      .where(
        and(
          eq(generate.studySetId, studySetId),
          inArray(generate.status, ["CREATED", "ONGOING"])
        )
      )
      .orderBy(generate.startedAt)
      .limit(1);
    return row ?? null;
  }

  async finalizeStuckAsFailed(_reason: string): Promise<number> {
    const result = await this.dbInstance
      .update(generate)
      .set({ completedAt: new Date(), status: "FAILED" })
      .where(inArray(generate.status, ["CREATED", "ONGOING"]));
    return result.changes;
  }

  async insertGenerateInput(
    row: Omit<GenerateInput, "id">
  ): Promise<GenerateInput> {
    const [created] = await this.dbInstance
      .insert(generateInput)
      .values({ ...row, id: crypto.randomUUID() })
      .returning();
    if (!created) {
      throw new Error("Failed to insert generate_input");
    }
    return created;
  }

  async findGenerateInputByGenerateId(
    genId: string
  ): Promise<GenerateInput | null> {
    const [row] = await this.dbInstance
      .select()
      .from(generateInput)
      .where(eq(generateInput.generateId, genId));
    return row ?? null;
  }

  async appendChunkResult(params: {
    generateId: string;
    record: ChunkRecord;
  }): Promise<void> {
    try {
      const { generateId, record } = params;
      this.dbInstance.transaction((tx) => {
        tx.delete(generateChunkResult)
          .where(
            and(
              eq(generateChunkResult.generateId, generateId),
              eq(generateChunkResult.index, record.index)
            )
          )
          .run();

        tx.insert(generateChunkResult)
          .values({
            generateId,
            id: crypto.randomUUID(),
            index: record.index,
            kind: record.kind,
            payload: JSON.stringify(record),
          })
          .run();
      });
    } catch (error) {
      logger.error("Error occurred while appending chunk result:", {
        error,
        params,
      });
      throw error;
    }
  }

  async loadChunkResults(generateId: string): Promise<GenerateChunkResult[]> {
    return await this.dbInstance
      .select()
      .from(generateChunkResult)
      .where(eq(generateChunkResult.generateId, generateId))
      .orderBy(generateChunkResult.index);
  }

  async findChunkSummaries(
    generateId: string,
    since: number | null,
    limit: number,
    cutoffMs: number
  ): Promise<ChunkSummary[]> {
    const [firstChunk] = await this.dbInstance
      .select({ createdAt: generateChunkResult.createdAt })
      .from(generateChunkResult)
      .where(eq(generateChunkResult.generateId, generateId))
      .orderBy(generateChunkResult.createdAt)
      .limit(1);

    if (!firstChunk) {
      return [];
    }

    if (firstChunk.createdAt.getTime() < Date.now() - cutoffMs) {
      return [];
    }

    const conditions = [eq(generateChunkResult.generateId, generateId)];
    if (since !== null) {
      conditions.push(gt(generateChunkResult.createdAt, new Date(since)));
    }

    const rows = await this.dbInstance
      .select()
      .from(generateChunkResult)
      .where(and(...conditions))
      .orderBy(generateChunkResult.createdAt)
      .limit(limit);

    return rows.map((r) => ({
      createdAt: r.createdAt.getTime(),
      index: r.index,
      kind: r.kind,
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      payload: JSON.parse(r.payload) as ChunkSummary["payload"],
    }));
  }

  async deleteOldChunks(olderThanDays: number): Promise<number> {
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    const result = await this.dbInstance
      .delete(generateChunkResult)
      .where(lt(generateChunkResult.createdAt, new Date(cutoff)));
    return result.changes;
  }

  async finalizeGenerateTransaction(params: {
    generateId: string;
    ownerId: string;
    studySetId: string;
    successfulChunks: SuccessRecord[];
  }): Promise<void> {
    const { ownerId, studySetId, successfulChunks } = params;

    const rollbackErrors: unknown[] = [];

    try {
      const existingRows = await this.dbInstance
        .select({ id: chapter.id, slug: chapter.slug })
        .from(chapter)
        .where(eq(chapter.studySetId, studySetId));

      const slugToId = new Map<string, string>();
      for (const row of existingRows) {
        slugToId.set(row.slug, row.id);
      }

      const seenSlugs = new Set(slugToId.keys());
      const chapterRows: (typeof chapter.$inferInsert)[] = [];
      const quizRows: (typeof quiz.$inferInsert)[] = [];
      const optionRows: (typeof quizOption.$inferInsert)[] = [];
      const flashcardRows: (typeof flashcard.$inferInsert)[] = [];

      for (const chunk of successfulChunks) {
        const { content } = chunk;

        for (const genChapter of content.chapter) {
          if (seenSlugs.has(genChapter.slug)) {
            continue;
          }
          seenSlugs.add(genChapter.slug);
          const id = createId(CHAPTER_ID_PREFIX);
          slugToId.set(genChapter.slug, id);
          chapterRows.push({
            id,
            isAiGenerated: true,
            ownerId,
            slug: genChapter.slug,
            studySetId,
            title: genChapter.title,
          });
        }

        for (const genQuiz of content.quiz) {
          const quizId = createId(QUIZ_ID_PREFIX);
          quizRows.push({
            chapterId: slugToId.get(genQuiz.chapterSlug) ?? null,
            id: quizId,
            isAiGenerated: true,
            ownerId,
            questionText: genQuiz.questionText,
            studySetId,
            type: genQuiz.type,
          });
          for (const genOption of genQuiz.options) {
            optionRows.push({
              explanation: genOption.explanation,
              id: createId(QUIZ_OPTION_ID_PREFIX),
              isCorrect: genOption.isCorrect,
              optionText: genOption.optionText,
              quizId,
            });
          }
        }

        for (const genFlashcard of content.flashcard) {
          flashcardRows.push({
            back: genFlashcard.back,
            chapterId: slugToId.get(genFlashcard.chapterSlug) ?? null,
            front: genFlashcard.front,
            hint: genFlashcard.hint,
            id: createId(FLASHCARD_ID_PREFIX),
            importance: genFlashcard.importance,
            isAiGenerated: true,
            ownerId,
            studySetId,
          });
        }
      }

      if (chapterRows.length > 0) {
        await this.dbInstance.insert(chapter).values(chapterRows);
      }
      if (quizRows.length > 0) {
        await this.dbInstance.insert(quiz).values(quizRows);
      }
      if (optionRows.length > 0) {
        await this.dbInstance.insert(quizOption).values(optionRows);
      }
      if (flashcardRows.length > 0) {
        await this.dbInstance.insert(flashcard).values(flashcardRows);
      }

      await this.dbInstance
        .update(studySet)
        .set({ isAiGenerated: true })
        .where(eq(studySet.id, studySetId));
    } catch (error) {
      try {
        await this.dbInstance
          .delete(flashcard)
          .where(eq(flashcard.studySetId, studySetId));
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
      try {
        await this.dbInstance
          .delete(quiz)
          .where(eq(quiz.studySetId, studySetId));
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
      try {
        await this.dbInstance
          .delete(chapter)
          .where(eq(chapter.studySetId, studySetId));
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }

      if (error instanceof ORPCError) {
        throw error;
      }

      if (rollbackErrors.length > 0) {
        logger.error("Saga rollback failed", { rollbackErrors });
      }

      throw error;
    }
  }
}
