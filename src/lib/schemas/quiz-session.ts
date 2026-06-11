import * as v from "valibot";

import { CHAPTER_ID_PREFIX } from "./chapter.ts";
import { createPrefixedIdSchema } from "./id-schema.ts";
import {
  QUIZ_SESSION_ID_PREFIX,
  QUIZ_SESSION_STATUSES,
} from "./quiz-session.constant.ts";
import { QUIZ_ID_PREFIX, QUIZ_OPTION_ID_PREFIX } from "./quiz.ts";
import { STUDY_SET_ID_PREFIX } from "./study-set.ts";

const quizSessionIdSchema = createPrefixedIdSchema(QUIZ_SESSION_ID_PREFIX);
const studySetIdSchema = createPrefixedIdSchema(STUDY_SET_ID_PREFIX);
const chapterIdSchema = createPrefixedIdSchema(CHAPTER_ID_PREFIX);
const quizIdSchema = createPrefixedIdSchema(QUIZ_ID_PREFIX);
const quizOptionIdSchema = createPrefixedIdSchema(QUIZ_OPTION_ID_PREFIX);

const quizSessionStatusSchema = v.picklist(QUIZ_SESSION_STATUSES);

const quizOptionOutputSchema = v.object({
  createdAt: v.date(),
  explanation: v.nullable(v.string()),
  id: v.string(),
  isCorrect: v.boolean(),
  optionText: v.string(),
  quizId: v.string(),
  updatedAt: v.date(),
});

const quizWithOptionsSchema = v.object({
  chapterId: v.nullable(v.string()),
  createdAt: v.date(),
  id: v.string(),
  options: v.array(quizOptionOutputSchema),
  ownerId: v.string(),
  questionText: v.string(),
  studySetId: v.string(),
  type: v.string(),
  updatedAt: v.date(),
});

export const createQuizSessionInputSchema = v.object({
  chapterId: v.optional(chapterIdSchema),
  studySetId: studySetIdSchema,
});

export const submitAnswerInputSchema = v.object({
  quizId: quizIdSchema,
  selectedOptionIds: v.array(quizOptionIdSchema),
  sessionId: quizSessionIdSchema,
});

export const completeQuizSessionInputSchema = v.object({
  sessionId: quizSessionIdSchema,
});

export const getQuizSessionInputSchema = v.object({
  sessionId: quizSessionIdSchema,
});

export const getQuizSessionQuestionsInputSchema = v.object({
  sessionId: quizSessionIdSchema,
});

export const getQuizSessionResultsInputSchema = v.object({
  sessionId: quizSessionIdSchema,
});

export const listQuizSessionsInputSchema = v.object({
  studySetId: studySetIdSchema,
});

export const quizSessionAnswerSchema = v.object({
  createdAt: v.date(),
  id: v.string(),
  quizId: v.nullable(v.string()),
  selectedOptionIds: v.array(v.string()),
  sessionId: v.string(),
  updatedAt: v.date(),
});

export const quizSessionSchema = v.object({
  chapterId: v.nullable(v.string()),
  completedAt: v.nullable(v.date()),
  correctCount: v.nullable(v.number()),
  createdAt: v.date(),
  failingChapterIds: v.nullable(v.array(v.string())),
  id: v.string(),
  incorrectQuizIds: v.nullable(v.array(v.string())),
  lastAnsweredAt: v.nullable(v.date()),
  lastQuestionText: v.nullable(v.string()),
  quizCount: v.number(),
  score: v.nullable(v.number()),
  status: quizSessionStatusSchema,
  studySetId: v.string(),
  totalQuestions: v.nullable(v.number()),
  updatedAt: v.date(),
  userId: v.string(),
});

export const quizSessionQuestionSchema = v.object({
  ...quizWithOptionsSchema.entries,
  currentAnswer: v.nullable(v.array(v.string())),
});

export const quizSessionResultsSchema = v.object({
  correctCount: v.number(),
  failingChapterIds: v.array(v.string()),
  incorrectQuestions: v.array(
    v.object({
      ...quizWithOptionsSchema.entries,
      selectedOptionIds: v.nullable(v.array(v.string())),
    })
  ),
  score: v.number(),
  totalQuestions: v.number(),
});

export const quizSessionListItemSchema = v.object({
  completedAt: v.nullable(v.date()),
  createdAt: v.date(),
  id: v.string(),
  lastAnsweredAt: v.nullable(v.date()),
  lastQuestionText: v.nullable(v.string()),
  quizCount: v.number(),
  score: v.nullable(v.number()),
  status: quizSessionStatusSchema,
  totalQuestions: v.nullable(v.number()),
});

export const adminDeleteExpiredSessionsOutputSchema = v.object({
  deletedCount: v.number(),
});

export type CreateQuizSessionInput = v.InferOutput<
  typeof createQuizSessionInputSchema
>;
export type SubmitAnswerInput = v.InferOutput<typeof submitAnswerInputSchema>;
export type CompleteQuizSessionInput = v.InferOutput<
  typeof completeQuizSessionInputSchema
>;
export type GetQuizSessionInput = v.InferOutput<
  typeof getQuizSessionInputSchema
>;
export type GetQuizSessionQuestionsInput = v.InferOutput<
  typeof getQuizSessionQuestionsInputSchema
>;
export type GetQuizSessionResultsInput = v.InferOutput<
  typeof getQuizSessionResultsInputSchema
>;
export type ListQuizSessionsInput = v.InferOutput<
  typeof listQuizSessionsInputSchema
>;
