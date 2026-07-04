import { FLASHCARD_ID_PREFIX } from "$lib/schemas/flashcard";

import type { Flashcard } from "../../infras/db/schema/flashcard.ts";
import { generateId } from "../../utils/nanoid.ts";

let stubs: Flashcard[] | null = null;

export const getFlashcardStubs = (
  count: number,
  studySetId: string,
  ownerId: string
): Flashcard[] => {
  if (!stubs) {
    const now = new Date();
    stubs = Array.from({ length: count }, (_, i) => ({
      back: `Flashcard belakang #${i + 1}`,
      chapterId: null,
      createdAt: new Date(now.getTime() - (count - i) * 3_600_000),
      front: `Flashcard depan #${i + 1}`,
      hint: null,
      id: generateId(FLASHCARD_ID_PREFIX),
      importance: 0,
      isAiGenerated: false,
      ownerId,
      studySetId,
      updatedAt: new Date(now.getTime() - (count - i) * 1_800_000),
    }));
  }
  return stubs.slice(0, count);
};
