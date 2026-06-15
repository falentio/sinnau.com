import * as v from "valibot";

import { CHAPTER_ID_PREFIX } from "./chapter.ts";
import { createPrefixedIdSchema } from "./id-schema.ts";
import {
  QUIZ_SESSION_ID_PREFIX,
  QUIZ_SESSION_QUIZ_ID_PREFIX,
  QUIZ_SESSION_QUIZ_OPTION_ID_PREFIX,
  QUIZ_SESSION_STATUSES,
} from "./quiz-session.constant.ts";
import { QUIZ_TYPES } from "./quiz.constant.ts";
import { STUDY_SET_ID_PREFIX } from "./study-set.ts";

const quizSessionIdSchema = createPrefixedIdSchema(QUIZ_SESSION_ID_PREFIX);
const sessionQuizIdSchema = createPrefixedIdSchema(QUIZ_SESSION_QUIZ_ID_PREFIX);
const sessionQuizOptionIdSchema = createPrefixedIdSchema(
  QUIZ_SESSION_QUIZ_OPTION_ID_PREFIX
);
const studySetIdSchema = createPrefixedIdSchema(STUDY_SET_ID_PREFIX);
const chapterIdSchema = createPrefixedIdSchema(CHAPTER_ID_PREFIX);

const statusSchema = v.picklist(QUIZ_SESSION_STATUSES);

export const createQuizSessionInputSchema = v.object({
  chapterId: v.optional(chapterIdSchema),
  studySetId: studySetIdSchema,
});

export const submitAnswerInputSchema = v.object({
  selectedOptionIds: v.array(sessionQuizOptionIdSchema),
  sessionId: quizSessionIdSchema,
  sessionQuizId: sessionQuizIdSchema,
});

export const completeQuizSessionInputSchema = v.object({
  sessionId: quizSessionIdSchema,
});

export const adminDeleteExpiredSessionsInputSchema = v.object({});

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

export const countQuizSessionInScopeInputSchema = v.object({
  chapterId: v.optional(chapterIdSchema),
  studySetId: studySetIdSchema,
});

export const countQuizSessionInScopeOutputSchema = v.object({
  count: v.number(),
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
  status: statusSchema,
  studySetId: v.string(),
  totalQuestions: v.nullable(v.number()),
  updatedAt: v.date(),
  userId: v.string(),
});

export const quizSessionQuizOptionSchema = v.object({
  explanation: v.nullable(v.string()),
  id: v.string(),
  isCorrect: v.boolean(),
  optionText: v.string(),
  position: v.number(),
  sessionQuizId: v.string(),
});

export const quizSessionQuizSchema = v.object({
  chapterId: v.nullable(v.string()),
  id: v.string(),
  options: v.array(quizSessionQuizOptionSchema),
  originalQuizId: v.nullable(v.string()),
  position: v.number(),
  questionText: v.string(),
  sessionId: v.string(),
  type: v.picklist(QUIZ_TYPES),
});

export const quizSessionQuestionItemSchema = v.object({
  chapterId: v.nullable(v.string()),
  currentAnswer: v.nullable(v.array(v.string())),
  id: v.string(),
  options: v.array(quizSessionQuizOptionSchema),
  originalQuizId: v.nullable(v.string()),
  position: v.number(),
  questionText: v.string(),
  sessionId: v.string(),
  type: v.picklist(QUIZ_TYPES),
});

export const quizSessionAnswerSchema = v.object({
  createdAt: v.date(),
  id: v.string(),
  selectedOptionIds: v.array(v.string()),
  sessionId: v.string(),
  sessionQuizId: v.string(),
  updatedAt: v.date(),
});

export const quizSessionResultsSchema = v.object({
  correctCount: v.number(),
  failingChapterIds: v.array(v.string()),
  incorrectQuestions: v.array(quizSessionQuestionItemSchema),
  score: v.number(),
  totalQuestions: v.number(),
});

export const listQuizSessionsResponseSchema = v.object({
  chapterId: v.nullable(v.string()),
  completedAt: v.nullable(v.date()),
  createdAt: v.date(),
  id: v.string(),
  lastAnsweredAt: v.nullable(v.date()),
  lastQuestionText: v.nullable(v.string()),
  quizCount: v.number(),
  score: v.nullable(v.number()),
  status: statusSchema,
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
export type AdminDeleteExpiredSessionsInput = v.InferOutput<
  typeof adminDeleteExpiredSessionsInputSchema
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
export type CountQuizSessionInScopeInput = v.InferOutput<
  typeof countQuizSessionInScopeInputSchema
>;
export type CountQuizSessionInScopeOutput = v.InferOutput<
  typeof countQuizSessionInScopeOutputSchema
>;
export type QuizSession = v.InferOutput<typeof quizSessionSchema>;
export type QuizSessionQuizOption = v.InferOutput<
  typeof quizSessionQuizOptionSchema
>;
export type QuizSessionQuiz = v.InferOutput<typeof quizSessionQuizSchema>;
export type QuizSessionQuestionItem = v.InferOutput<
  typeof quizSessionQuestionItemSchema
>;
export type QuizSessionAnswer = v.InferOutput<typeof quizSessionAnswerSchema>;
export type QuizSessionResults = v.InferOutput<typeof quizSessionResultsSchema>;
export type ListQuizSessionsResponse = v.InferOutput<
  typeof listQuizSessionsResponseSchema
>;
