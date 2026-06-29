import type { ChunkSummaryItem } from "$lib/schemas/generate";

import type { UnstampedGenerationItem } from "./waiting-room.types.ts";

export const FEED_ITEM_LIMIT = 10;

export const flattenChunk = (
  chunk: ChunkSummaryItem
): UnstampedGenerationItem[] => {
  if (chunk.payload.kind === "failure") {
    return [];
  }

  const { content } = chunk.payload;
  const items: UnstampedGenerationItem[] = [];

  for (const chapter of content.chapter) {
    items.push({ data: chapter, type: "chapter" });
  }

  for (const flashcard of content.flashcard) {
    items.push({ data: flashcard, type: "flashcard" });
  }

  for (const quiz of content.quiz) {
    items.push({ data: quiz, type: "quiz" });
  }

  return items;
};

export const capItems = <T>(items: T[], limit = FEED_ITEM_LIMIT): T[] => {
  if (items.length <= limit) {
    return items;
  }

  return items.slice(0, limit);
};
