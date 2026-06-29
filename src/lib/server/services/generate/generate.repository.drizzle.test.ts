import {
  CHUNK_CLEANUP_AGE_DAYS,
  GENERATE_CHUNK_QUERY_CUTOFF_MS,
} from "$lib/schemas/generate.constant";
import { chapter } from "$lib/server/infras/db/schema/chapter";
import { flashcard } from "$lib/server/infras/db/schema/flashcard";
import {
  generate,
  generateChunkResult,
  generateInput,
} from "$lib/server/infras/db/schema/generate";
import { quiz, quizOption } from "$lib/server/infras/db/schema/quiz";
import type {
  ChunkRecord,
  FailureRecord,
  SuccessRecord,
} from "$lib/server/infras/generate/generate";
import { eq } from "drizzle-orm";
import { describe, it } from "vitest";

import { GenerateTestEnv } from "./generate.testing";

const makeSuccessRecord = (
  index: number,
  content: SuccessRecord["content"]
): SuccessRecord => ({
  chaptersSlugs: content.chapter.map((c) => c.slug),
  content,
  index,
  kind: "success",
  stepCount: 1,
  tokenUsage: {
    cacheRead: 0,
    cacheWrite: 0,
    input: 100,
    output: 50,
    reasoning: 0,
  },
});

const makeFailureRecord = (index: number, message: string): FailureRecord => ({
  error: { message, name: "Error" },
  index,
  kind: "failure",
});

const insertChunkDirectly = (
  env: GenerateTestEnv,
  generateId: string,
  record: ChunkRecord,
  createdAt: Date = new Date()
): void => {
  env.db
    .insert(generateChunkResult)
    .values({
      createdAt,
      generateId,
      id: crypto.randomUUID(),
      index: record.index,
      kind: record.kind,
      payload: JSON.stringify(record),
    })
    .run();
};

describe.concurrent("GenerateDrizzleRepository", () => {
  describe("insertGenerate", () => {
    it("persists the row and returns it with timestamps", async ({
      expect,
    }) => {
      await using env = new GenerateTestEnv();
      const before = Date.now();
      const created = await env.repo.insertGenerate({
        completedAt: null,
        id: "gen-1",
        ownerId: env.ownerId,
        startedAt: new Date(),
        status: "CREATED",
        studySetId: env.studySetId,
      });
      const after = Date.now();

      expect(created.id).toBe("gen-1");
      expect(created.status).toBe("CREATED");
      expect(created.ownerId).toBe(env.ownerId);
      expect(created.studySetId).toBe(env.studySetId);
      expect(created.completedAt).toBeNull();
      expect(created.createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(created.createdAt.getTime()).toBeLessThanOrEqual(after);

      const rows = env.db
        .select()
        .from(generate)
        .where(eq(generate.id, "gen-1"))
        .all();
      expect(rows).toHaveLength(1);
    });
  });

  describe("updateGenerateStatus", () => {
    it("updates the status and returns the row", async ({ expect }) => {
      await using env = new GenerateTestEnv();
      const created = await env.seedGenerate({
        id: "gen-1",
        status: "CREATED",
      });
      const updated = await env.repo.updateGenerateStatus("gen-1", "ONGOING");

      expect(updated).not.toBeNull();
      expect(updated?.id).toBe("gen-1");
      expect(updated?.status).toBe("ONGOING");
      expect(updated?.completedAt).toBeNull();
      expect(updated?.createdAt).toEqual(created.createdAt);
    });

    it("sets completedAt when a completedAt timestamp is provided", async ({
      expect,
    }) => {
      await using env = new GenerateTestEnv();
      await env.seedGenerate({ id: "gen-1", status: "ONGOING" });
      const completedAtMs = Date.now();
      const updated = await env.repo.updateGenerateStatus(
        "gen-1",
        "COMPLETED",
        completedAtMs
      );

      expect(updated).not.toBeNull();
      expect(updated?.status).toBe("COMPLETED");
      expect(updated?.completedAt).toBeInstanceOf(Date);
      expect(updated?.completedAt?.getTime()).toBe(completedAtMs);
    });

    it("leaves completedAt unchanged when completedAt is omitted", async ({
      expect,
    }) => {
      await using env = new GenerateTestEnv();
      const completedAtMs = Date.now();
      await env.seedGenerate({
        completedAt: new Date(completedAtMs),
        id: "gen-1",
        status: "COMPLETED",
      });
      const updated = await env.repo.updateGenerateStatus("gen-1", "FAILED");

      expect(updated).not.toBeNull();
      expect(updated?.status).toBe("FAILED");
      expect(updated?.completedAt?.getTime()).toBe(completedAtMs);
    });

    it("returns null when the id does not exist", async ({ expect }) => {
      await using env = new GenerateTestEnv();
      const result = await env.repo.updateGenerateStatus("missing", "ONGOING");
      expect(result).toBeNull();
    });
  });

  describe("findGenerateById", () => {
    it("returns the row when it exists", async ({ expect }) => {
      await using env = new GenerateTestEnv();
      await env.seedGenerate({ id: "gen-1", status: "ONGOING" });
      const result = await env.repo.findGenerateById("gen-1");
      expect(result?.id).toBe("gen-1");
      expect(result?.status).toBe("ONGOING");
    });

    it("returns null when the id does not exist", async ({ expect }) => {
      await using env = new GenerateTestEnv();
      expect(await env.repo.findGenerateById("missing")).toBeNull();
    });
  });

  describe("finalizeStuckAsFailed", () => {
    it("marks CREATED and ONGOING rows as FAILED and returns the count", async ({
      expect,
    }) => {
      await using env = new GenerateTestEnv();
      await env.seedGenerate({ id: "gen-1", status: "CREATED" });
      await env.seedGenerate({ id: "gen-2", status: "ONGOING" });
      await env.seedGenerate({ id: "gen-3", status: "COMPLETED" });
      await env.seedGenerate({
        id: "gen-4",
        status: "PARTIAL_COMPLETED",
      });
      await env.seedGenerate({ id: "gen-5", status: "FAILED" });

      const count = await env.repo.finalizeStuckAsFailed("Server restarted");
      expect(count).toBe(2);

      const failed = env.db
        .select()
        .from(generate)
        .where(eq(generate.status, "FAILED"))
        .all();
      const failedIds = failed.map((r) => r.id).toSorted();
      expect(failedIds).toEqual(["gen-1", "gen-2", "gen-5"]);
    });

    it("sets completedAt on finalized rows", async ({ expect }) => {
      await using env = new GenerateTestEnv();
      const before = Date.now();
      await env.seedGenerate({ id: "gen-1", status: "CREATED" });
      await env.repo.finalizeStuckAsFailed("test");
      const after = Date.now();

      const [row] = env.db
        .select()
        .from(generate)
        .where(eq(generate.id, "gen-1"))
        .all();
      expect(row?.status).toBe("FAILED");
      expect(row?.completedAt).toBeInstanceOf(Date);
      expect(row?.completedAt?.getTime()).toBeGreaterThanOrEqual(before);
      expect(row?.completedAt?.getTime()).toBeLessThanOrEqual(after);
    });

    it("returns 0 when no rows are stuck", async ({ expect }) => {
      await using env = new GenerateTestEnv();
      await env.seedGenerate({ id: "gen-1", status: "COMPLETED" });
      await env.seedGenerate({ id: "gen-2", status: "FAILED" });
      const count = await env.repo.finalizeStuckAsFailed("test");
      expect(count).toBe(0);
    });
  });

  describe("insertGenerateInput", () => {
    it("persists the row and returns it with a generated id", async ({
      expect,
    }) => {
      await using env = new GenerateTestEnv();
      const gen = await env.seedGenerate();
      const created = await env.repo.insertGenerateInput({
        generateId: gen.id,
        input: "parsed text",
        isInputTruncated: false,
      });

      expect(created.id).toBeTruthy();
      expect(created.generateId).toBe(gen.id);
      expect(created.input).toBe("parsed text");
      expect(created.isInputTruncated).toBe(false);

      const rows = env.db
        .select()
        .from(generateInput)
        .where(eq(generateInput.generateId, gen.id))
        .all();
      expect(rows).toHaveLength(1);
    });
  });

  describe("findGenerateInputByGenerateId", () => {
    it("returns the row when it exists", async ({ expect }) => {
      await using env = new GenerateTestEnv();
      const gen = await env.seedGenerate();
      await env.repo.insertGenerateInput({
        generateId: gen.id,
        input: "parsed text",
        isInputTruncated: true,
      });
      const result = await env.repo.findGenerateInputByGenerateId(gen.id);
      expect(result?.input).toBe("parsed text");
      expect(result?.isInputTruncated).toBe(true);
    });

    it("returns null when the generateId does not exist", async ({
      expect,
    }) => {
      await using env = new GenerateTestEnv();
      expect(
        await env.repo.findGenerateInputByGenerateId("missing")
      ).toBeNull();
    });
  });

  describe("appendChunkResult", () => {
    it("inserts a new chunk result", async ({ expect }) => {
      await using env = new GenerateTestEnv();
      const gen = await env.seedGenerate();
      const record = makeSuccessRecord(0, {
        chapter: [],
        flashcard: [],
        quiz: [],
      });
      await env.repo.appendChunkResult({
        generateId: gen.id,
        record,
      });

      const rows = env.db
        .select()
        .from(generateChunkResult)
        .where(eq(generateChunkResult.generateId, gen.id))
        .all();
      expect(rows).toHaveLength(1);
      expect(rows[0]?.index).toBe(0);
      expect(rows[0]?.kind).toBe("success");
    });

    it("replaces an existing chunk with the same index", async ({ expect }) => {
      await using env = new GenerateTestEnv();
      const gen = await env.seedGenerate();
      const success = makeSuccessRecord(0, {
        chapter: [],
        flashcard: [],
        quiz: [],
      });
      const failure = makeFailureRecord(0, "LLM timed out");
      await env.repo.appendChunkResult({
        generateId: gen.id,
        record: success,
      });
      await env.repo.appendChunkResult({
        generateId: gen.id,
        record: failure,
      });

      const rows = env.db
        .select()
        .from(generateChunkResult)
        .where(eq(generateChunkResult.generateId, gen.id))
        .all();
      expect(rows).toHaveLength(1);
      expect(rows[0]?.kind).toBe("failure");
      expect(JSON.parse(rows[0]?.payload ?? "{}")).toEqual(failure);
    });

    it("keeps separate indices untouched when appending a new index", async ({
      expect,
    }) => {
      await using env = new GenerateTestEnv();
      const gen = await env.seedGenerate();
      await env.repo.appendChunkResult({
        generateId: gen.id,
        record: makeSuccessRecord(0, {
          chapter: [],
          flashcard: [],
          quiz: [],
        }),
      });
      await env.repo.appendChunkResult({
        generateId: gen.id,
        record: makeFailureRecord(1, "error"),
      });
      await env.repo.appendChunkResult({
        generateId: gen.id,
        record: makeSuccessRecord(2, {
          chapter: [],
          flashcard: [],
          quiz: [],
        }),
      });

      const rows = env.db
        .select()
        .from(generateChunkResult)
        .where(eq(generateChunkResult.generateId, gen.id))
        .all();
      expect(rows).toHaveLength(3);
      expect(rows.map((r) => r.index)).toEqual([0, 1, 2]);
    });
  });

  describe("loadChunkResults", () => {
    it("returns all chunk results ordered by index ascending", async ({
      expect,
    }) => {
      await using env = new GenerateTestEnv();
      const gen = await env.seedGenerate();
      await env.repo.appendChunkResult({
        generateId: gen.id,
        record: makeSuccessRecord(2, {
          chapter: [],
          flashcard: [],
          quiz: [],
        }),
      });
      await env.repo.appendChunkResult({
        generateId: gen.id,
        record: makeSuccessRecord(0, {
          chapter: [],
          flashcard: [],
          quiz: [],
        }),
      });
      await env.repo.appendChunkResult({
        generateId: gen.id,
        record: makeFailureRecord(1, "err"),
      });

      const rows = await env.repo.loadChunkResults(gen.id);
      expect(rows).toHaveLength(3);
      expect(rows.map((r) => r.index)).toEqual([0, 1, 2]);
    });

    it("returns an empty array when no chunks exist", async ({ expect }) => {
      await using env = new GenerateTestEnv();
      const gen = await env.seedGenerate();
      const rows = await env.repo.loadChunkResults(gen.id);
      expect(rows).toEqual([]);
    });

    it("stores payload as a JSON string", async ({ expect }) => {
      await using env = new GenerateTestEnv();
      const gen = await env.seedGenerate();
      const record = makeSuccessRecord(0, {
        chapter: [{ slug: "ch1", title: "Chapter 1" }],
        flashcard: [],
        quiz: [],
      });
      await env.repo.appendChunkResult({
        generateId: gen.id,
        record,
      });
      const [row] = await env.repo.loadChunkResults(gen.id);
      expect(typeof row?.payload).toBe("string");
      expect(JSON.parse(row?.payload ?? "")).toEqual(record);
    });
  });

  describe("findChunkSummaries", () => {
    it("returns an empty array when no chunks exist", async ({ expect }) => {
      await using env = new GenerateTestEnv();
      const gen = await env.seedGenerate();
      const summaries = await env.repo.findChunkSummaries(
        gen.id,
        null,
        10,
        GENERATE_CHUNK_QUERY_CUTOFF_MS
      );
      expect(summaries).toEqual([]);
    });

    it("returns an empty array when the first chunk is older than the cutoff", async ({
      expect,
    }) => {
      await using env = new GenerateTestEnv();
      const gen = await env.seedGenerate();
      const old = new Date(
        Date.now() - GENERATE_CHUNK_QUERY_CUTOFF_MS - 60_000
      );
      insertChunkDirectly(
        env,
        gen.id,
        makeSuccessRecord(0, {
          chapter: [],
          flashcard: [],
          quiz: [],
        }),
        old
      );

      const summaries = await env.repo.findChunkSummaries(
        gen.id,
        null,
        10,
        GENERATE_CHUNK_QUERY_CUTOFF_MS
      );
      expect(summaries).toEqual([]);
    });

    it("returns chunks ordered by createdAt ascending when since is null", async ({
      expect,
    }) => {
      await using env = new GenerateTestEnv();
      const gen = await env.seedGenerate();
      const t0 = Date.now() - 20 * 60 * 1000;
      const t1 = Date.now() - 10 * 60 * 1000;
      const t2 = Date.now();
      insertChunkDirectly(
        env,
        gen.id,
        makeSuccessRecord(2, {
          chapter: [],
          flashcard: [],
          quiz: [],
        }),
        new Date(t0)
      );
      insertChunkDirectly(
        env,
        gen.id,
        makeSuccessRecord(0, {
          chapter: [],
          flashcard: [],
          quiz: [],
        }),
        new Date(t1)
      );
      insertChunkDirectly(
        env,
        gen.id,
        makeFailureRecord(1, "err"),
        new Date(t2)
      );

      const summaries = await env.repo.findChunkSummaries(
        gen.id,
        null,
        10,
        GENERATE_CHUNK_QUERY_CUTOFF_MS
      );
      expect(summaries.map((s) => s.index)).toEqual([2, 0, 1]);
    });

    it("filters to chunks with createdAt greater than since", async ({
      expect,
    }) => {
      await using env = new GenerateTestEnv();
      const gen = await env.seedGenerate();
      const t0 = Date.now() - 10 * 60 * 1000;
      const t1 = Date.now() - 5 * 60 * 1000;
      const t2 = Date.now();
      insertChunkDirectly(
        env,
        gen.id,
        makeSuccessRecord(2, {
          chapter: [],
          flashcard: [],
          quiz: [],
        }),
        new Date(t0)
      );
      insertChunkDirectly(
        env,
        gen.id,
        makeSuccessRecord(1, {
          chapter: [],
          flashcard: [],
          quiz: [],
        }),
        new Date(t1)
      );
      insertChunkDirectly(
        env,
        gen.id,
        makeSuccessRecord(0, {
          chapter: [],
          flashcard: [],
          quiz: [],
        }),
        new Date(t2)
      );

      const summaries = await env.repo.findChunkSummaries(
        gen.id,
        t0,
        10,
        GENERATE_CHUNK_QUERY_CUTOFF_MS
      );
      expect(summaries.map((s) => s.index)).toEqual([1, 0]);
    });

    it("respects the limit parameter", async ({ expect }) => {
      await using env = new GenerateTestEnv();
      const gen = await env.seedGenerate();
      const base = Date.now();
      for (let i = 0; i < 5; i += 1) {
        insertChunkDirectly(
          env,
          gen.id,
          makeSuccessRecord(4 - i, {
            chapter: [],
            flashcard: [],
            quiz: [],
          }),
          new Date(base + i * 60_000)
        );
      }

      const summaries = await env.repo.findChunkSummaries(
        gen.id,
        null,
        3,
        GENERATE_CHUNK_QUERY_CUTOFF_MS
      );
      expect(summaries).toHaveLength(3);
      expect(summaries.map((s) => s.index)).toEqual([4, 3, 2]);
    });

    it("parses the JSON payload into a ChunkRecord", async ({ expect }) => {
      await using env = new GenerateTestEnv();
      const gen = await env.seedGenerate();
      const successRecord = makeSuccessRecord(0, {
        chapter: [{ slug: "ch1", title: "Chapter 1" }],
        flashcard: [],
        quiz: [],
      });
      const failureRecord = makeFailureRecord(1, "LLM error");
      insertChunkDirectly(
        env,
        gen.id,
        failureRecord,
        new Date(Date.now() - 60_000)
      );
      insertChunkDirectly(env, gen.id, successRecord, new Date());

      const summaries = await env.repo.findChunkSummaries(
        gen.id,
        null,
        10,
        GENERATE_CHUNK_QUERY_CUTOFF_MS
      );
      expect(summaries).toHaveLength(2);
      expect(summaries[0]?.kind).toBe("failure");
      expect(summaries[0]?.payload).toEqual(failureRecord);
      expect(summaries[0]?.createdAt).toBeTypeOf("number");
      expect(summaries[1]?.kind).toBe("success");
      expect(summaries[1]?.payload).toEqual(successRecord);
    });
  });

  describe("deleteOldChunks", () => {
    it("deletes only chunks older than the cutoff and returns the count", async ({
      expect,
    }) => {
      await using env = new GenerateTestEnv();
      const gen = await env.seedGenerate();
      const oldDate = new Date(
        Date.now() - (CHUNK_CLEANUP_AGE_DAYS + 1) * 24 * 60 * 60 * 1000
      );
      insertChunkDirectly(
        env,
        gen.id,
        makeSuccessRecord(0, {
          chapter: [],
          flashcard: [],
          quiz: [],
        }),
        oldDate
      );
      insertChunkDirectly(
        env,
        gen.id,
        makeSuccessRecord(1, {
          chapter: [],
          flashcard: [],
          quiz: [],
        }),
        new Date()
      );

      const deleted = await env.repo.deleteOldChunks(CHUNK_CLEANUP_AGE_DAYS);
      expect(deleted).toBe(1);

      const remaining = env.db
        .select()
        .from(generateChunkResult)
        .where(eq(generateChunkResult.generateId, gen.id))
        .all();
      expect(remaining).toHaveLength(1);
      expect(remaining[0]?.index).toBe(1);
    });

    it("returns 0 when no chunks are old enough", async ({ expect }) => {
      await using env = new GenerateTestEnv();
      const gen = await env.seedGenerate();
      insertChunkDirectly(
        env,
        gen.id,
        makeSuccessRecord(0, {
          chapter: [],
          flashcard: [],
          quiz: [],
        }),
        new Date()
      );
      const deleted = await env.repo.deleteOldChunks(CHUNK_CLEANUP_AGE_DAYS);
      expect(deleted).toBe(0);
    });

    it("returns 0 when there are no chunks at all", async ({ expect }) => {
      await using env = new GenerateTestEnv();
      const deleted = await env.repo.deleteOldChunks(CHUNK_CLEANUP_AGE_DAYS);
      expect(deleted).toBe(0);
    });
  });

  describe("finalizeGenerateTransaction", () => {
    it("inserts chapters, quizzes, options and flashcards from successful chunks", async ({
      expect,
    }) => {
      await using env = new GenerateTestEnv();

      const successfulChunks: SuccessRecord[] = [
        makeSuccessRecord(0, {
          chapter: [{ slug: "intro", title: "Introduction" }],
          flashcard: [
            {
              back: "Answer 1",
              chapterSlug: "intro",
              front: "Question 1",
              hint: "Think about it",
              importance: 5,
            },
          ],
          quiz: [
            {
              chapterSlug: "intro",
              options: [
                {
                  explanation: "Correct",
                  isCorrect: true,
                  optionText: "Option A",
                },
                {
                  explanation: "Wrong",
                  isCorrect: false,
                  optionText: "Option B",
                },
              ],
              questionText: "What is this?",
              type: "MULTIPLE_CHOICE",
            },
          ],
        }),
      ];

      await env.repo.finalizeGenerateTransaction({
        generateId: "gen-1",
        ownerId: env.ownerId,
        studySetId: env.studySetId,
        successfulChunks,
      });

      const chapters = env.db
        .select()
        .from(chapter)
        .where(eq(chapter.studySetId, env.studySetId))
        .all();
      expect(chapters).toHaveLength(1);
      expect(chapters[0]?.title).toBe("Introduction");

      const quizzes = env.db
        .select()
        .from(quiz)
        .where(eq(quiz.studySetId, env.studySetId))
        .all();
      expect(quizzes).toHaveLength(1);
      expect(quizzes[0]?.questionText).toBe("What is this?");

      const options = env.db
        .select()
        .from(quizOption)
        .where(eq(quizOption.quizId, quizzes[0]?.id ?? ""))
        .all();
      expect(options).toHaveLength(2);

      const flashcards = env.db
        .select()
        .from(flashcard)
        .where(eq(flashcard.studySetId, env.studySetId))
        .all();
      expect(flashcards).toHaveLength(1);
      expect(flashcards[0]?.front).toBe("Question 1");
    });

    it("deduplicates chapters by slug across chunks", async ({ expect }) => {
      await using env = new GenerateTestEnv();

      const successfulChunks: SuccessRecord[] = [
        makeSuccessRecord(0, {
          chapter: [{ slug: "intro", title: "Introduction" }],
          flashcard: [],
          quiz: [],
        }),
        makeSuccessRecord(1, {
          chapter: [{ slug: "intro", title: "Introduction Duplicate" }],
          flashcard: [],
          quiz: [],
        }),
      ];

      await env.repo.finalizeGenerateTransaction({
        generateId: "gen-1",
        ownerId: env.ownerId,
        studySetId: env.studySetId,
        successfulChunks,
      });

      const chapters = env.db
        .select()
        .from(chapter)
        .where(eq(chapter.studySetId, env.studySetId))
        .all();
      expect(chapters).toHaveLength(1);
      expect(chapters[0]?.title).toBe("Introduction");
    });

    it("links quizzes and flashcards to their chapters by chapterId", async ({
      expect,
    }) => {
      await using env = new GenerateTestEnv();

      const successfulChunks: SuccessRecord[] = [
        makeSuccessRecord(0, {
          chapter: [{ slug: "ch1", title: "Chapter 1" }],
          flashcard: [
            {
              back: "Answer",
              chapterSlug: "ch1",
              front: "Question",
              hint: "",
              importance: 3,
            },
          ],
          quiz: [
            {
              chapterSlug: "ch1",
              options: [
                {
                  explanation: "",
                  isCorrect: true,
                  optionText: "A",
                },
              ],
              questionText: "Quiz Q",
              type: "MULTIPLE_CHOICE",
            },
          ],
        }),
      ];

      await env.repo.finalizeGenerateTransaction({
        generateId: "gen-1",
        ownerId: env.ownerId,
        studySetId: env.studySetId,
        successfulChunks,
      });

      const chapters = env.db
        .select()
        .from(chapter)
        .where(eq(chapter.studySetId, env.studySetId))
        .all();
      expect(chapters).toHaveLength(1);
      const chapterId = chapters[0]?.id;

      const flashcards = env.db
        .select()
        .from(flashcard)
        .where(eq(flashcard.studySetId, env.studySetId))
        .all();
      expect(flashcards).toHaveLength(1);
      expect(flashcards[0]?.chapterId).toBe(chapterId);

      const quizzes = env.db
        .select()
        .from(quiz)
        .where(eq(quiz.studySetId, env.studySetId))
        .all();
      expect(quizzes).toHaveLength(1);
      expect(quizzes[0]?.chapterId).toBe(chapterId);
    });

    it("skips chapters whose slug already exists in DB", async ({ expect }) => {
      await using env = new GenerateTestEnv();

      const existingChapterId = "ch-existing";
      env.db
        .insert(chapter)
        .values({
          id: existingChapterId,
          ownerId: env.ownerId,
          slug: "intro",
          studySetId: env.studySetId,
          title: "Pre-existing",
        })
        .run();

      const successfulChunks: SuccessRecord[] = [
        makeSuccessRecord(0, {
          chapter: [{ slug: "intro", title: "Introduction" }],
          flashcard: [],
          quiz: [],
        }),
      ];

      await env.repo.finalizeGenerateTransaction({
        generateId: "gen-1",
        ownerId: env.ownerId,
        studySetId: env.studySetId,
        successfulChunks,
      });

      const chapters = env.db
        .select()
        .from(chapter)
        .where(eq(chapter.studySetId, env.studySetId))
        .all();
      expect(chapters).toHaveLength(1);
      expect(chapters[0]?.id).toBe(existingChapterId);
      expect(chapters[0]?.title).toBe("Pre-existing");
    });

    it("links entities from a chunk with no new chapters to existing chapter slugs", async ({
      expect,
    }) => {
      await using env = new GenerateTestEnv();

      const existingChapterId = "ch-existing";
      env.db
        .insert(chapter)
        .values({
          id: existingChapterId,
          ownerId: env.ownerId,
          slug: "existing-ch",
          studySetId: env.studySetId,
          title: "Existing Chapter",
        })
        .run();

      const successfulChunks: SuccessRecord[] = [
        makeSuccessRecord(0, {
          chapter: [],
          flashcard: [
            {
              back: "B",
              chapterSlug: "existing-ch",
              front: "F",
              hint: "",
              importance: 1,
            },
          ],
          quiz: [
            {
              chapterSlug: "existing-ch",
              options: [],
              questionText: "Using existing chapter",
              type: "MULTIPLE_CHOICE",
            },
          ],
        }),
      ];

      await env.repo.finalizeGenerateTransaction({
        generateId: "gen-1",
        ownerId: env.ownerId,
        studySetId: env.studySetId,
        successfulChunks,
      });

      const flashcards = env.db
        .select()
        .from(flashcard)
        .where(eq(flashcard.studySetId, env.studySetId))
        .all();
      expect(flashcards).toHaveLength(1);
      expect(flashcards[0]?.chapterId).toBe(existingChapterId);

      const quizzes = env.db
        .select()
        .from(quiz)
        .where(eq(quiz.studySetId, env.studySetId))
        .all();
      expect(quizzes).toHaveLength(1);
      expect(quizzes[0]?.chapterId).toBe(existingChapterId);
    });

    it("does nothing when successfulChunks is empty", async ({ expect }) => {
      await using env = new GenerateTestEnv();

      await env.repo.finalizeGenerateTransaction({
        generateId: "gen-1",
        ownerId: env.ownerId,
        studySetId: env.studySetId,
        successfulChunks: [],
      });

      expect(
        env.db
          .select()
          .from(chapter)
          .where(eq(chapter.studySetId, env.studySetId))
          .all()
      ).toHaveLength(0);
      expect(
        env.db
          .select()
          .from(quiz)
          .where(eq(quiz.studySetId, env.studySetId))
          .all()
      ).toHaveLength(0);
      expect(
        env.db
          .select()
          .from(flashcard)
          .where(eq(flashcard.studySetId, env.studySetId))
          .all()
      ).toHaveLength(0);
    });

    it("leaves chapterId null when a quiz references an unknown chapter slug", async ({
      expect,
    }) => {
      await using env = new GenerateTestEnv();

      const successfulChunks: SuccessRecord[] = [
        makeSuccessRecord(0, {
          chapter: [],
          flashcard: [],
          quiz: [
            {
              chapterSlug: "does-not-exist",
              options: [],
              questionText: "Orphan quiz",
              type: "MULTIPLE_CHOICE",
            },
          ],
        }),
      ];

      await env.repo.finalizeGenerateTransaction({
        generateId: "gen-1",
        ownerId: env.ownerId,
        studySetId: env.studySetId,
        successfulChunks,
      });

      const quizzes = env.db
        .select()
        .from(quiz)
        .where(eq(quiz.studySetId, env.studySetId))
        .all();
      expect(quizzes).toHaveLength(1);
      expect(quizzes[0]?.chapterId).toBeNull();
    });

    it("rolls back pre-existing content when an insert fails", async ({
      expect,
    }) => {
      await using env = new GenerateTestEnv();

      env.db
        .insert(chapter)
        .values({
          id: "ch-preexisting",
          ownerId: env.ownerId,
          slug: "preexisting-ch",
          studySetId: env.studySetId,
          title: "Pre-existing",
        })
        .run();

      const successfulChunks: SuccessRecord[] = [
        makeSuccessRecord(0, {
          chapter: [{ slug: "new-ch", title: "New Chapter" }],
          flashcard: [],
          quiz: [],
        }),
      ];

      const promise = env.repo.finalizeGenerateTransaction({
        generateId: "gen-1",
        ownerId: "non-existent-user",
        studySetId: env.studySetId,
        successfulChunks,
      });

      await expect(promise).rejects.toThrow();

      const chapters = env.db
        .select()
        .from(chapter)
        .where(eq(chapter.studySetId, env.studySetId))
        .all();
      expect(chapters).toHaveLength(0);
    });
  });
});

describe.concurrent("GenerateDrizzleRepository (schema constraints)", () => {
  describe("foreign keys", () => {
    it("rejects inserting a generate for a non-existent owner", async ({
      expect,
    }) => {
      await using env = new GenerateTestEnv();
      const insertOrphan = async () =>
        await env.repo.insertGenerate({
          completedAt: null,
          id: "gen-orphan",
          ownerId: "does-not-exist",
          startedAt: new Date(),
          status: "CREATED",
          studySetId: env.studySetId,
        });
      await expect(insertOrphan()).rejects.toThrow();
    });

    it("rejects inserting a generate for a non-existent study set", async ({
      expect,
    }) => {
      await using env = new GenerateTestEnv();
      const insertOrphan = async () =>
        await env.repo.insertGenerate({
          completedAt: null,
          id: "gen-orphan",
          ownerId: env.ownerId,
          startedAt: new Date(),
          status: "CREATED",
          studySetId: "does-not-exist",
        });
      await expect(insertOrphan()).rejects.toThrow();
    });

    it("rejects inserting a generate_input for a non-existent generate", async ({
      expect,
    }) => {
      await using env = new GenerateTestEnv();
      const insertOrphan = async () =>
        await env.repo.insertGenerateInput({
          generateId: "does-not-exist",
          input: "text",
          isInputTruncated: false,
        });
      await expect(insertOrphan()).rejects.toThrow();
    });

    it("rejects appending a chunk result for a non-existent generate", async ({
      expect,
    }) => {
      await using env = new GenerateTestEnv();
      const appendOrphan = async () => {
        await env.repo.appendChunkResult({
          generateId: "does-not-exist",
          record: makeSuccessRecord(0, {
            chapter: [],
            flashcard: [],
            quiz: [],
          }),
        });
      };
      await expect(appendOrphan()).rejects.toThrow();
    });
  });

  describe("generate_input unique generateId", () => {
    it("rejects inserting a second input for the same generate", async ({
      expect,
    }) => {
      await using env = new GenerateTestEnv();
      const gen = await env.seedGenerate();
      await env.repo.insertGenerateInput({
        generateId: gen.id,
        input: "first",
        isInputTruncated: false,
      });
      const insertDup = async () =>
        await env.repo.insertGenerateInput({
          generateId: gen.id,
          input: "second",
          isInputTruncated: true,
        });
      await expect(insertDup()).rejects.toThrow();
    });
  });

  describe("chunk result dedupe-on-write", () => {
    it("keeps at most one row per (generateId, index) after duplicate append", async ({
      expect,
    }) => {
      await using env = new GenerateTestEnv();
      const gen = await env.seedGenerate();
      const record = makeSuccessRecord(0, {
        chapter: [],
        flashcard: [],
        quiz: [],
      });

      await env.repo.appendChunkResult({
        generateId: gen.id,
        record,
      });
      await env.repo.appendChunkResult({
        generateId: gen.id,
        record,
      });
      await env.repo.appendChunkResult({
        generateId: gen.id,
        record,
      });

      const rows = env.db
        .select()
        .from(generateChunkResult)
        .where(eq(generateChunkResult.generateId, gen.id))
        .all();
      expect(rows).toHaveLength(1);
    });
  });

  describe("findChunkSummaries cutoff boundary", () => {
    it("returns chunks when the first chunk is within the cutoff", async ({
      expect,
    }) => {
      await using env = new GenerateTestEnv();
      const gen = await env.seedGenerate();
      insertChunkDirectly(
        env,
        gen.id,
        makeSuccessRecord(0, {
          chapter: [],
          flashcard: [],
          quiz: [],
        }),
        new Date()
      );

      const summaries = await env.repo.findChunkSummaries(
        gen.id,
        null,
        10,
        GENERATE_CHUNK_QUERY_CUTOFF_MS
      );
      expect(summaries).toHaveLength(1);
    });

    it("returns empty when the first chunk is beyond the cutoff", async ({
      expect,
    }) => {
      await using env = new GenerateTestEnv();
      const gen = await env.seedGenerate();
      insertChunkDirectly(
        env,
        gen.id,
        makeSuccessRecord(0, {
          chapter: [],
          flashcard: [],
          quiz: [],
        }),
        new Date(Date.now() - GENERATE_CHUNK_QUERY_CUTOFF_MS - 1)
      );
      insertChunkDirectly(
        env,
        gen.id,
        makeSuccessRecord(1, {
          chapter: [],
          flashcard: [],
          quiz: [],
        }),
        new Date()
      );

      const summaries = await env.repo.findChunkSummaries(
        gen.id,
        null,
        10,
        GENERATE_CHUNK_QUERY_CUTOFF_MS
      );
      expect(summaries).toEqual([]);
    });
  });
});
