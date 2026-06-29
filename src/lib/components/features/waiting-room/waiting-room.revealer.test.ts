import type { ChunkSummaryItem } from "$lib/schemas/generate";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createItemRevealer } from "./waiting-room.revealer.svelte";
import type { GenerationItem } from "./waiting-room.types.ts";
import { FEED_ITEM_LIMIT } from "./waiting-room.utils.ts";

const NOW = 10_000;

const makeChapter = (title: string) => ({
  slug: title.toLowerCase().replaceAll(/\s+/gu, "_"),
  title,
});

const makeSuccessChunk = (chapterTitles: string[]): ChunkSummaryItem => ({
  index: 0,
  kind: "success",
  payload: {
    chaptersSlugs: chapterTitles.map((title) => title.toLowerCase()),
    content: {
      chapter: chapterTitles.map(makeChapter),
      flashcard: [],
      quiz: [],
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

const hasChapter = (items: GenerationItem[], title: string): boolean =>
  items.some((i) => i.type === "chapter" && i.data.title === title);

describe(createItemRevealer, () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders initial chunks instantly in items", () => {
    const revealer = createItemRevealer({
      initialChunks: [makeSuccessChunk(["A", "B"])],
    });
    expect(revealer.items).toHaveLength(2);
    expect(revealer.items[0]).toMatchObject({
      data: { title: "B" },
      type: "chapter",
    });
  });

  it("caps initial items at the feed limit", () => {
    const many = Array.from({ length: FEED_ITEM_LIMIT + 5 }, (_, i) =>
      makeSuccessChunk([`Chapter ${i}`])
    );
    const revealer = createItemRevealer({ initialChunks: many });
    expect(revealer.items).toHaveLength(FEED_ITEM_LIMIT);
  });

  it("does nothing when enqueueing empty or failure chunks", () => {
    const revealer = createItemRevealer({ initialChunks: [] });
    revealer.enqueue([]);
    expect(revealer.items).toHaveLength(0);
    revealer.enqueue([makeFailureChunk()]);
    expect(revealer.items).toHaveLength(0);
  });

  it("reveals the first enqueued item immediately and staggers the rest", () => {
    const revealer = createItemRevealer({ initialChunks: [] });
    revealer.enqueue([makeSuccessChunk(["A", "B", "C"])], { since: 4000 });

    expect(revealer.items).toHaveLength(1);
    expect(revealer.items[0]).toMatchObject({ data: { title: "A" } });

    vi.advanceTimersByTime(1999);
    expect(revealer.items).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(revealer.items).toHaveLength(2);

    vi.advanceTimersByTime(2000);
    expect(revealer.items).toHaveLength(3);
  });

  it("merges new batches to the back of the queue (backpressure)", () => {
    const revealer = createItemRevealer({ initialChunks: [] });
    revealer.enqueue([makeSuccessChunk(["A", "B"])], { since: 6000 });
    expect(revealer.items).toHaveLength(1);

    revealer.enqueue([makeSuccessChunk(["C"])]);

    vi.advanceTimersByTime(2000);
    expect(revealer.items).toMatchObject([
      { data: { title: "B" } },
      { data: { title: "A" } },
    ]);

    vi.advanceTimersByTime(2000);
    expect(revealer.items).toMatchObject([
      { data: { title: "C" } },
      { data: { title: "B" } },
      { data: { title: "A" } },
    ]);
  });

  it("keeps the newest items when the list exceeds the cap", () => {
    const initial = Array.from({ length: FEED_ITEM_LIMIT }, (_, i) =>
      makeSuccessChunk([`Old ${i}`])
    );
    const revealer = createItemRevealer({ initialChunks: initial });
    expect(revealer.items).toHaveLength(FEED_ITEM_LIMIT);

    revealer.enqueue([makeSuccessChunk(["New"])]);
    expect(revealer.items).toHaveLength(FEED_ITEM_LIMIT);
    expect(hasChapter(revealer.items, "New")).toBeTruthy();
    expect(hasChapter(revealer.items, "Old 0")).toBeFalsy();
    expect(revealer.items[0]).toMatchObject({
      data: { title: "New" },
    });
  });

  it("assigns unique ids across batches with identical content", () => {
    const revealer = createItemRevealer({
      initialChunks: [makeSuccessChunk(["A"])],
    });
    const initialId = revealer.items[0]?.id;
    expect(initialId).toBeTruthy();

    revealer.enqueue([makeSuccessChunk(["A"])]);
    const newId = revealer.items[0]?.id;
    expect(newId).not.toBe(initialId);
  });

  it("preserves item ids through cap-trim shifts", () => {
    const initial = Array.from({ length: FEED_ITEM_LIMIT }, (_, i) =>
      makeSuccessChunk([`Old ${i}`])
    );
    const revealer = createItemRevealer({ initialChunks: initial });
    const survivingId = revealer.items[5]?.id;

    revealer.enqueue([makeSuccessChunk(["New"])]);
    const stillPresent = revealer.items.find((i) => i.id === survivingId);
    expect(stillPresent).toBeDefined();
    expect(stillPresent?.id).toBe(survivingId);
  });

  it("dispose halts further draining", () => {
    const revealer = createItemRevealer({ initialChunks: [] });
    revealer.enqueue([makeSuccessChunk(["A", "B", "C"])], { since: 5500 });
    expect(revealer.items).toHaveLength(1);

    revealer.dispose();
    vi.advanceTimersByTime(3000);
    expect(revealer.items).toHaveLength(1);
  });
});
