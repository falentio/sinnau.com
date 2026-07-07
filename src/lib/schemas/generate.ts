import * as v from "valibot";

import {
  CHUNK_POLL_LIMIT,
  GENERATE_CHUNK_KINDS,
  GENERATE_EXTRACTION_TYPES,
  GENERATE_ID_PREFIX,
  GENERATE_LANGUAGE_STYLE_MAX_LENGTH,
  GENERATE_LANGUAGE_STYLE_PATTERN,
  GENERATE_PDF_MAX_SIZE_BYTES,
  GENERATE_STATUSES,
} from "./generate.constant.ts";
import { createPrefixedIdSchema } from "./id-schema.ts";
import { QUIZ_TYPES } from "./quiz.constant.ts";
import {
  STUDY_SET_VISIBILITIES,
  descriptionSchema,
  trimmedTitleSchema,
} from "./study-set.ts";

// ─── Shared sub-schemas ────────────────────────────────────────────────

const generateIdSchema = createPrefixedIdSchema(GENERATE_ID_PREFIX);

const generateStatusSchema = v.picklist(GENERATE_STATUSES);

const extractionTypeSchema = v.picklist(GENERATE_EXTRACTION_TYPES);

const generateQuizTypeSchema = v.picklist(QUIZ_TYPES);

// ─── TokenUsage ────────────────────────────────────────────────────────

export const tokenUsageSchema = v.object({
  cacheRead: v.number(),
  cacheWrite: v.number(),
  input: v.number(),
  output: v.number(),
  reasoning: v.number(),
});

// ─── Generated content schemas (AI output, not DB rows) ────────────────

export const generatedChapterSchema = v.object({
  slug: v.string(),
  title: v.string(),
});

export const generatedQuizOptionSchema = v.object({
  explanation: v.string(),
  isCorrect: v.boolean(),
  optionText: v.string(),
});

export const generatedQuizSchema = v.object({
  chapterSlug: v.string(),
  options: v.array(generatedQuizOptionSchema),
  questionText: v.string(),
  type: generateQuizTypeSchema,
});

export const generatedFlashcardSchema = v.object({
  back: v.string(),
  chapterSlug: v.string(),
  front: v.string(),
  hint: v.string(),
  importance: v.number(),
});

export const contentsSchema = v.object({
  chapter: v.array(generatedChapterSchema),
  flashcard: v.array(generatedFlashcardSchema),
  quiz: v.array(generatedQuizSchema),
});

// ─── Chunk records (poll payload) ──────────────────────────────────────

const chunkErrorSchema = v.object({
  message: v.string(),
  name: v.string(),
});

export const successRecordSchema = v.object({
  chaptersSlugs: v.array(v.string()),
  content: contentsSchema,
  index: v.number(),
  kind: v.literal("success"),
  stepCount: v.number(),
  tokenUsage: tokenUsageSchema,
});

export const failureRecordSchema = v.object({
  error: chunkErrorSchema,
  index: v.number(),
  kind: v.literal("failure"),
});

export const chunkRecordSchema = v.variant("kind", [
  successRecordSchema,
  failureRecordSchema,
]);

// ─── CheckGenerateContent ──────────────────────────────────────────────

export const checkGenerateContentInputSchema = v.object({
  id: generateIdSchema,
  since: v.optional(v.number()),
});

export const chunkSummaryItemSchema = v.object({
  index: v.number(),
  kind: v.picklist(GENERATE_CHUNK_KINDS),
  payload: chunkRecordSchema,
});

export const checkGenerateContentOutputSchema = v.object({
  chunks: v.pipe(
    v.array(chunkSummaryItemSchema),
    v.maxLength(CHUNK_POLL_LIMIT)
  ),
  isInputTruncated: v.boolean(),
  maxCreatedAt: v.nullable(v.number()),
  startedAt: v.number(),
  status: generateStatusSchema,
  studySetId: v.string(),
});

// ─── CreateGenerate ────────────────────────────────────────────────────

export const createGenerateInputSchema = v.object({
  description: descriptionSchema,
  extractionType: v.optional(extractionTypeSchema),
  languageStyle: v.optional(
    v.pipe(
      v.string(),
      v.regex(GENERATE_LANGUAGE_STYLE_PATTERN),
      v.maxLength(GENERATE_LANGUAGE_STYLE_MAX_LENGTH)
    )
  ),
  pdf: v.pipe(v.instance(File), v.maxSize(GENERATE_PDF_MAX_SIZE_BYTES)),
  title: trimmedTitleSchema,
  visibility: v.optional(v.picklist(STUDY_SET_VISIBILITIES)),
});

export const createGenerateOutputSchema = v.object({
  generateId: v.string(),
  studySetId: v.string(),
});

// ─── DeleteOldChunks (admin) ───────────────────────────────────────────

export const deleteOldChunksInputSchema = v.object({
  olderThanDays: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
});

export const deleteOldChunksOutputSchema = v.object({
  deletedCount: v.number(),
});

// ─── GetLanguageStyles ────────────────────────────────────────────────

export const languageStyleItemSchema = v.object({
  isDefault: v.boolean(),
  label: v.string(),
  value: v.string(),
});

export const getLanguageStylesOutputSchema = v.array(languageStyleItemSchema);

// ─── Inferred types ────────────────────────────────────────────────────

export type TokenUsage = v.InferOutput<typeof tokenUsageSchema>;
export type GeneratedChapter = v.InferOutput<typeof generatedChapterSchema>;
export type GeneratedQuizOption = v.InferOutput<
  typeof generatedQuizOptionSchema
>;
export type GeneratedQuiz = v.InferOutput<typeof generatedQuizSchema>;
export type GeneratedFlashcard = v.InferOutput<typeof generatedFlashcardSchema>;
export type Contents = v.InferOutput<typeof contentsSchema>;
export type SuccessRecord = v.InferOutput<typeof successRecordSchema>;
export type FailureRecord = v.InferOutput<typeof failureRecordSchema>;
export type ChunkRecord = v.InferOutput<typeof chunkRecordSchema>;
export type ChunkSummaryItem = v.InferOutput<typeof chunkSummaryItemSchema>;
export type CheckGenerateContentInput = v.InferOutput<
  typeof checkGenerateContentInputSchema
>;
export type CheckGenerateContentOutput = v.InferOutput<
  typeof checkGenerateContentOutputSchema
>;
export type CreateGenerateInput = v.InferOutput<
  typeof createGenerateInputSchema
>;
export type CreateGenerateOutput = v.InferOutput<
  typeof createGenerateOutputSchema
>;
export type DeleteOldChunksInput = v.InferOutput<
  typeof deleteOldChunksInputSchema
>;
export type DeleteOldChunksOutput = v.InferOutput<
  typeof deleteOldChunksOutputSchema
>;

export type LanguageStyleItem = v.InferOutput<typeof languageStyleItemSchema>;
export type GetLanguageStylesOutput = v.InferOutput<
  typeof getLanguageStylesOutputSchema
>;
