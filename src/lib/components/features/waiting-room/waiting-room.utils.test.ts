import type { ChunkSummaryItem } from "$lib/schemas/generate";
import { describe, expect, it } from "vitest";

import { appendChunks, capItems, flattenChunk } from "./waiting-room.utils.ts";

const makeChapter = (title: string) => ({
  slug: title.toLowerCase().replace(/\s+/g, "_"),
  title,
});

const makeFlashcard = (front: string) => ({
  back: `${front} back`,
  chapterSlug: "chapter_1",
  front,
  hint: "",
  importance: 1,
});

const makeQuiz = (questionText: string) => ({
  chapterSlug: "chapter_1",
  options: [],
  questionText,
  type: "MULTIPLE_CHOICE" as const,
});

const makeSuccessChunk = (
  chapterTitles: string[],
  flashcardFronts: string[],
  quizQuestions: string[]
): ChunkSummaryItem => ({
  index: 0,
  kind: "success",
  payload: {
    chaptersSlugs: chapterTitles.map((title) => title.toLowerCase()),
    content: {
      chapter: chapterTitles.map(makeChapter),
      flashcard: flashcardFronts.map(makeFlashcard),
      quiz: quizQuestions.map(makeQuiz),
    },
    index: 0,
    kind: "success",
    stepCount: 1,
    tokenUsage: {
      cacheRead: 0,
      cacheWrite: 0,
      input: 0,
      output: 0,
      reasoning: 0,
    },
  },
});

const makeFailureChunk = (): ChunkSummaryItem => ({
  index: 0,
  kind: "failure",
  payload: {
    error: { message: "timeout", name: "Error" },
    index: 0,
    kind: "failure",
  },
});

describe("flattenChunk", () => {
  it("returns items in chapter -> flashcard -> quiz order", () => {
    const chunk = makeSuccessChunk(
      ["Introduction", "Variables"],
      ["What is x?"],
      ["Solve for x"]
    );
    const items = flattenChunk(chunk);

    expect(items).toHaveLength(4);
    expect(items[0]).toMatchObject({
      type: "chapter",
      data: { title: "Introduction" },
    });
    expect(items[1]).toMatchObject({
      type: "chapter",
      data: { title: "Variables" },
    });
    expect(items[2]).toMatchObject({
      type: "flashcard",
      data: { front: "What is x?" },
    });
    expect(items[3]).toMatchObject({
      type: "quiz",
      data: { questionText: "Solve for x" },
    });
  });

  it("returns empty array for failure chunks", () => {
    expect(flattenChunk(makeFailureChunk())).toEqual([]);
  });
});

describe("capItems", () => {
  it("keeps all items when under limit", () => {
    const items = Array.from({ length: 5 }, (_, index) => ({
      data: makeChapter(`Chapter ${index}`),
      type: "chapter" as const,
    }));
    expect(capItems(items)).toHaveLength(5);
  });

  it("keeps only the latest items when over limit", () => {
    const items = Array.from({ length: 15 }, (_, index) => ({
      data: makeChapter(`Chapter ${index}`),
      type: "chapter" as const,
    }));
    const result = capItems(items);
    expect(result).toHaveLength(10);
    expect(result[0]).toMatchObject({ data: { title: "Chapter 5" } });
    expect(result[9]).toMatchObject({ data: { title: "Chapter 14" } });
  });
});

describe("appendChunks", () => {
  it("prepends new items and caps at limit", () => {
    const existing = Array.from({ length: 8 }, (_, index) => ({
      data: makeChapter(`Existing ${index}`),
      type: "chapter" as const,
    }));
    const chunks = [makeSuccessChunk(["New"], [], [])];
    const result = appendChunks(existing, chunks);

    expect(result).toHaveLength(9);
    expect(result[0]).toMatchObject({ data: { title: "New" } });
    expect(result[8]).toMatchObject({ data: { title: "Existing 7" } });
  });

  it("drops oldest items when total exceeds limit", () => {
    const existing = Array.from({ length: 8 }, (_, index) => ({
      data: makeChapter(`Existing ${index}`),
      type: "chapter" as const,
    }));
    const chunks = [makeSuccessChunk(["A", "B", "C"], ["D"], ["E"])];
    const result = appendChunks(existing, chunks);

    expect(result).toHaveLength(10);
    expect(result[0]).toMatchObject({
      type: "flashcard",
      data: { front: "D" },
    });
    expect(result[9]).toMatchObject({ data: { title: "Existing 7" } });
  });
});
