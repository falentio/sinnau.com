import { quizSchema, updateQuizInputSchema } from "$lib/schemas/quiz";
import { authorizedProcedure } from "$lib/server/api/base";

import { quizService } from "../index";

const ERRORS = {
  CHAPTER_NOT_BELONG_TO_STUDY_SET: {
    message: "Chapter does not belong to the target study set",
    status: 400,
  },
  CHAPTER_NOT_FOUND: { message: "Chapter not found", status: 404 },
  CHAPTER_NOT_OWNED: {
    message: "Cannot use a chapter you do not own",
    status: 403,
  },
  FORBIDDEN: { message: "Cannot modify a quiz you do not own", status: 403 },
  OPTION_NOT_BELONG_TO_QUIZ: {
    message: "Option does not belong to this quiz",
    status: 400,
  },
  OPTION_NOT_FOUND: { message: "Quiz option not found", status: 404 },
  VALIDATION_FAILED: {
    message: "Quiz options violate type constraints",
    status: 400,
  },
} as const;

export const quizUpdate = authorizedProcedure
  .errors(ERRORS)
  .input(updateQuizInputSchema)
  .output(quizSchema)
  .handler(
    async ({ input, context }) =>
      await quizService.updateQuiz(input, context.user.id)
  );
