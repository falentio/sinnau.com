import type { ChunkSummaryItem } from "$lib/schemas/generate";

import type { GenerationItem } from "./waiting-room.types.ts";

export const FEED_ITEM_LIMIT = 10;

export const flattenChunk = (chunk: ChunkSummaryItem): GenerationItem[] => {
  if (chunk.payload.kind === "failure") {
    return [];
  }

  const { content } = chunk.payload;
  const items: GenerationItem[] = [];

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

export const capItems = (
  items: GenerationItem[],
  limit = FEED_ITEM_LIMIT
): GenerationItem[] => {
  if (items.length <= limit) {
    return items;
  }

  return items.slice(items.length - limit);
};

export const appendChunks = (
  existing: GenerationItem[],
  chunks: ChunkSummaryItem[]
): GenerationItem[] => {
  const incoming = chunks.flatMap((chunk) => flattenChunk(chunk));
  if (incoming.length === 0) {
    return existing;
  }

  return capItems([...incoming, ...existing]);
};
