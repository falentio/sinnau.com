import type { Flashcard } from "../../infras/db/schema/flashcard.ts";

export type FlashcardUpdatePatch = Partial<
  Pick<Flashcard, "front" | "back" | "hint" | "importance" | "updatedAt">
>;

export interface FlashcardChapterRef {
  id: string;
  studySetId: string;
  ownerId: string;
}

export interface FlashcardRepository {
  insertFlashcards(
    rows: Omit<Flashcard, "createdAt" | "updatedAt" | "isAiGenerated">[]
  ): Promise<Flashcard[]>;
  updateFlashcard(
    id: string,
    ownerId: string,
    patch: FlashcardUpdatePatch
  ): Promise<Flashcard | null>;
  deleteFlashcards(ids: string[], ownerId: string): Promise<boolean>;
  findFlashcardById(id: string): Promise<Flashcard | null>;
  findFlashcardsByIds(ids: string[]): Promise<Flashcard[]>;
  findFlashcardsByStudySet(studySetId: string): Promise<Flashcard[]>;
  findChapter(chapterId: string): Promise<FlashcardChapterRef | null>;
}
