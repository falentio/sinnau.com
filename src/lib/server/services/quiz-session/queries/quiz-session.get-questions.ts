import {
  getQuizSessionQuestionsInputSchema,
  quizSessionQuestionItemSchema,
} from "$lib/schemas/quiz-session";
import { authorizedProcedure } from "$lib/server/api/base";
import * as v from "valibot";

import { quizSessionService } from "../index";

const ERRORS = {
  NOT_FOUND: {
    message: "Quiz session not found",
  },
} as const;

export const quizSessionGetQuestions = authorizedProcedure
  .errors(ERRORS)
  .input(getQuizSessionQuestionsInputSchema)
  .output(v.array(quizSessionQuestionItemSchema))
  .handler(
    async ({ input, context }) =>
      await quizSessionService.getQuestions(input, context.user.id)
  );
