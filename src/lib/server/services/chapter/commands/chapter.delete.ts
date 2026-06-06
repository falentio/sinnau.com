import {
  chapterDeleteOutputSchema,
  deleteChapterInputSchema,
} from "$lib/schemas/chapter";
import { authorizedProcedure } from "$lib/server/api/base";

import { chapterService } from "../index";

const ERRORS = {
  CHAPTER_NOT_EMPTY: {
    message:
      "Chapter cannot be deleted because it contains flashcards or quizzes",
  },
  FORBIDDEN: { message: "Cannot delete a chapter you do not own" },
  NOT_FOUND: { message: "Chapter not found" },
} as const;

export const chapterDelete = authorizedProcedure
  .errors(ERRORS)
  .input(deleteChapterInputSchema)
  .output(chapterDeleteOutputSchema)
  .handler(async ({ input, context }) => {
    await chapterService.deleteChapter(input, context.user.id);
    return { success: true } as const;
  });
