import * as v from "valibot";

import { CHAPTER_ID_PREFIX } from "./chapter.ts";
import { createPrefixedIdSchema } from "./id-schema.ts";
import {
  FITB_OPTION_EXACT,
  MCQ_OPTION_MAX,
  MCQ_OPTION_MIN,
  MS_OPTION_MAX,
  MS_OPTION_MIN,
  QUIZ_OPTION_EXPLANATION_MAX_LENGTH,
  QUIZ_OPTION_TEXT_MAX_LENGTH,
  QUIZ_OPTION_TEXT_MIN_LENGTH,
  QUIZ_QUESTION_TEXT_MAX_LENGTH,
  QUIZ_QUESTION_TEXT_MIN_LENGTH,
  QUIZ_TYPES,
} from "./quiz.constant.ts";
import type { QuizType } from "./quiz.constant.ts";
import { STUDY_SET_ID_PREFIX } from "./study-set.ts";

export const QUIZ_ID_PREFIX = "qiz";
export const QUIZ_OPTION_ID_PREFIX = "qzo";

const quizIdSchema = createPrefixedIdSchema(QUIZ_ID_PREFIX);
const quizOptionIdSchema = createPrefixedIdSchema(QUIZ_OPTION_ID_PREFIX);
const studySetIdSchema = createPrefixedIdSchema(STUDY_SET_ID_PREFIX);
const chapterIdSchema = createPrefixedIdSchema(CHAPTER_ID_PREFIX);

const quizTypeSchema = v.picklist(QUIZ_TYPES);

const questionTextSchema = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(
    QUIZ_QUESTION_TEXT_MIN_LENGTH,
    "Teks pertanyaan tidak boleh kosong"
  ),
  v.maxLength(QUIZ_QUESTION_TEXT_MAX_LENGTH, "Teks pertanyaan terlalu panjang")
);

const optionTextSchema = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(QUIZ_OPTION_TEXT_MIN_LENGTH, "Teks opsi tidak boleh kosong"),
  v.maxLength(QUIZ_OPTION_TEXT_MAX_LENGTH, "Teks opsi terlalu panjang")
);

const optionExplanationSchema = v.optional(
  v.pipe(
    v.string(),
    v.maxLength(
      QUIZ_OPTION_EXPLANATION_MAX_LENGTH,
      "Penjelasan opsi terlalu panjang"
    )
  )
);

const embeddedCreateOptionInputSchema = v.object({
  explanation: optionExplanationSchema,
  isCorrect: v.boolean(),
  optionText: optionTextSchema,
});

export const validateQuizOptions = (
  type: QuizType,
  options: { isCorrect: boolean }[]
): boolean => {
  switch (type) {
    case "MULTIPLE_CHOICE": {
      return (
        options.length >= MCQ_OPTION_MIN &&
        options.length <= MCQ_OPTION_MAX &&
        options.filter((o) => o.isCorrect).length === 1
      );
    }
    case "MULTIPLE_SELECT": {
      return (
        options.length >= MS_OPTION_MIN &&
        options.length <= MS_OPTION_MAX &&
        options.some((o) => o.isCorrect)
      );
    }
    case "FILL_IN_THE_BLANK": {
      return (
        options.length === FITB_OPTION_EXACT && options[0]?.isCorrect === true
      );
    }
    default: {
      return false;
    }
  }
};

export const createQuizInputSchema = v.pipe(
  v.object({
    chapterId: v.optional(chapterIdSchema),
    options: v.array(embeddedCreateOptionInputSchema),
    questionText: questionTextSchema,
    studySetId: studySetIdSchema,
    type: quizTypeSchema,
  }),
  v.forward(
    v.check(
      (input) => validateQuizOptions(input.type, input.options),
      "Quiz options violate type constraints"
    ),
    ["options"]
  )
);

export const updateQuizInputSchema = v.object({
  chapterId: v.optional(v.union([chapterIdSchema, v.null()])),
  id: quizIdSchema,
  options: v.optional(
    v.array(
      v.object({
        explanation: v.optional(
          v.union([
            v.pipe(v.string(), v.maxLength(QUIZ_OPTION_EXPLANATION_MAX_LENGTH)),
            v.literal(""),
            v.null(),
          ])
        ),
        id: v.optional(quizOptionIdSchema),
        isCorrect: v.boolean(),
        optionText: optionTextSchema,
      })
    )
  ),
  questionText: v.optional(questionTextSchema),
});

export const deleteQuizzesInputSchema = v.object({
  ids: v.pipe(
    v.array(quizIdSchema),
    v.minLength(1, "Minimal satu id diperlukan"),
    v.maxLength(100, "Maksimal 100 id per batch")
  ),
});

export const deleteQuizOptionsInputSchema = v.object({
  ids: v.pipe(
    v.array(quizOptionIdSchema),
    v.minLength(1, "Minimal satu id diperlukan"),
    v.maxLength(100, "Maksimal 100 id per batch")
  ),
});

export const getQuizInputSchema = v.object({
  id: quizIdSchema,
});

export const getQuizzesInputSchema = v.object({
  studySetId: studySetIdSchema,
});

const quizTypeOutputSchema = v.picklist(QUIZ_TYPES);

const quizOptionOutputSchema = v.object({
  createdAt: v.date(),
  explanation: v.nullable(v.string()),
  id: v.string(),
  isCorrect: v.boolean(),
  optionText: v.string(),
  quizId: v.string(),
  updatedAt: v.date(),
});

export const quizOptionSchema = quizOptionOutputSchema;

export const quizSchema = v.object({
  chapterId: v.nullable(v.string()),
  createdAt: v.date(),
  id: v.string(),
  options: v.array(quizOptionOutputSchema),
  ownerId: v.string(),
  questionText: v.string(),
  studySetId: v.string(),
  type: quizTypeOutputSchema,
  updatedAt: v.date(),
});

export const quizDeleteOutputSchema = v.object({ success: v.literal(true) });
export const quizOptionsDeleteOutputSchema = v.object({
  success: v.literal(true),
});

export const partialForbiddenErrorSchema = v.object({
  code: v.literal("PARTIAL_FORBIDDEN"),
  data: v.object({ ids: v.array(v.string()) }),
});

export const quizOptionWithErrorsSchema = v.object({
  index: v.number(),
  reason: v.string(),
});

export type CreateQuizInput = v.InferOutput<typeof createQuizInputSchema>;
export type UpdateQuizInput = v.InferOutput<typeof updateQuizInputSchema>;
export type DeleteQuizzesInput = v.InferOutput<typeof deleteQuizzesInputSchema>;
export type DeleteQuizOptionsInput = v.InferOutput<
  typeof deleteQuizOptionsInputSchema
>;
export type GetQuizInput = v.InferOutput<typeof getQuizInputSchema>;
export type GetQuizzesInput = v.InferOutput<typeof getQuizzesInputSchema>;

export const MCQ_OPTION_COUNT_HINT = {
  max: MCQ_OPTION_MAX,
  min: MCQ_OPTION_MIN,
} as const;
export const MS_OPTION_COUNT_HINT = {
  max: MS_OPTION_MAX,
  min: MS_OPTION_MIN,
} as const;
