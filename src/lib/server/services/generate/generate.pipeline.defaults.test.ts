import type {
  ChunkRecord,
  GenerationStorage,
  SuccessRecord,
} from "$lib/server/infras/generate/generate";
import {
  ChapterSchema,
  QuizSchema,
} from "$lib/server/infras/generate/generate";
import * as v from "valibot";
import { describe, it, vi } from "vitest";

import {
  createParseLiteparseMock,
  createRunLLMMock,
} from "./generate.pipeline.defaults.ts";

// oxlint-disable-next-line vitest/prefer-import-in-mock
vi.mock("node:timers/promises", () => ({
  setTimeout: async () => {},
}));

const createMemoryStorage = (): {
  storage: GenerationStorage;
  records: ChunkRecord[];
} => {
  const records: ChunkRecord[] = [];
  return {
    records,
    storage: {
      // oxlint-disable-next-line typescript/promise-function-async
      appendChunkResult(record: ChunkRecord): Promise<void> {
        records.push(record);
        return Promise.resolve();
      },
      // oxlint-disable-next-line typescript/promise-function-async
      loadChunkResults(): Promise<readonly ChunkRecord[]> {
        return Promise.resolve([...records]);
      },
    },
  };
};

const runMockPipeline = async () => {
  const parse = createParseLiteparseMock();
  const { storage, records } = createMemoryStorage();
  const runLLM = createRunLLMMock();

  const { text } = await parse({ pdf: new File([], "test.pdf") });
  const result = await runLLM({
    extractionType: "normal",
    languageStyle: "student-friendly",
    pdfText: text,
    storage,
  });

  const successes = records.filter(
    (r): r is SuccessRecord => r.kind === "success"
  );

  return { result, successes, totalChunks: records.length };
};

describe.concurrent("parseLiteparse mock", () => {
  it("returns non-empty text", async ({ expect }) => {
    const parse = createParseLiteparseMock();
    const result = await parse({ pdf: new File([], "test.pdf") });
    expect(result.text).toBeTruthy();
    expect(result.text.length).toBeGreaterThan(1000);
  });
});

describe.concurrent("runLLM mock", () => {
  it("writes one SuccessRecord per chunk to storage", async ({ expect }) => {
    const { result, successes, totalChunks } = await runMockPipeline();

    expect(result.totalChunkCount).toBeGreaterThan(0);
    expect(result.successCount).toBe(result.totalChunkCount);
    expect(totalChunks).toBe(result.totalChunkCount);
    expect(successes.length).toBe(result.totalChunkCount);
  });

  it("produces records with valid SuccessRecord shape", async ({ expect }) => {
    const { successes } = await runMockPipeline();

    for (const success of successes) {
      expect(success.kind).toBe("success");
      expect(success.index).toBeGreaterThanOrEqual(0);
      expect(success.stepCount).toBe(1);
      expect(success.tokenUsage.input).toBe(500);
      expect(success.tokenUsage.output).toBe(200);
    }
  });

  it("produces unique chunk indices", async ({ expect }) => {
    const { successes } = await runMockPipeline();

    const indices = successes.map((s) => s.index);
    const unique = new Set(indices);
    expect(unique.size).toBe(indices.length);
  });

  it("produces chapter slugs matching lowercase alphanumeric + underscore pattern", async ({
    expect,
  }) => {
    const { successes } = await runMockPipeline();

    for (const success of successes) {
      for (const chapter of success.content.chapter) {
        expect(chapter.slug).toMatch(/^[a-z0-9_]+$/u);
      }
    }
  });

  it("produces chapters that satisfy ChapterSchema", async ({ expect }) => {
    const { successes } = await runMockPipeline();

    for (const success of successes) {
      for (const chapter of success.content.chapter) {
        const result = v.safeParse(ChapterSchema, chapter);
        expect(result.success).toBe(true);
      }
    }
  });

  it("produces quizzes that satisfy QuizSchema with at least 4 options", async ({
    expect,
  }) => {
    const { successes } = await runMockPipeline();

    for (const success of successes) {
      for (const quiz of success.content.quiz) {
        expect(quiz.options.length).toBeGreaterThanOrEqual(4);
        const result = v.safeParse(QuizSchema, quiz);
        expect(result.success).toBe(true);
      }
    }
  });

  it("produces flashcards with numeric importance and matching chapterSlug", async ({
    expect,
  }) => {
    const { successes } = await runMockPipeline();

    for (const success of successes) {
      const slugSet = new Set(success.content.chapter.map((c) => c.slug));
      for (const flashcard of success.content.flashcard) {
        expect(typeof flashcard.importance).toBe("number");
        expect(slugSet.has(flashcard.chapterSlug)).toBe(true);
      }
    }
  });

  it("produces quiz chapterSlug referencing an existing chapter slug", async ({
    expect,
  }) => {
    const { successes } = await runMockPipeline();

    for (const success of successes) {
      const slugSet = new Set(success.content.chapter.map((c) => c.slug));
      for (const quiz of success.content.quiz) {
        expect(slugSet.has(quiz.chapterSlug)).toBe(true);
      }
    }
  });
});
