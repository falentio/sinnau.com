import type {
  GeneratedChapter,
  GeneratedFlashcard,
  GeneratedQuiz,
} from "$lib/schemas/generate";

export type GenerationItemType = "chapter" | "flashcard" | "quiz";

export type UnstampedGenerationItem =
  | { data: GeneratedChapter; type: "chapter" }
  | { data: GeneratedFlashcard; type: "flashcard" }
  | { data: GeneratedQuiz; type: "quiz" };

export type GenerationItem = UnstampedGenerationItem & { id: string };
