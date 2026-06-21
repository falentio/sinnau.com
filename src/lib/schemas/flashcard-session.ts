import * as v from "valibot";

import {
  FLASHCARD_SESSION_BUCKETS,
  FLASHCARD_SESSION_ID_PREFIX,
  FLASHCARD_SESSION_NEW_CARDS_PER_DAY_MAX,
  FLASHCARD_SESSION_NEW_CARDS_PER_DAY_DEFAULT,
  FLASHCARD_SESSION_PAGE_DEFAULT,
  FLASHCARD_SESSION_PAGE_LIMIT_DEFAULT,
  FLASHCARD_SESSION_PAGE_LIMIT_MAX,
  FLASHCARD_SESSION_RATINGS,
  FLASHCARD_SESSION_REVIEW_LIST_MAX,
  FLASHCARD_SESSION_REVIEW_LIST_DEFAULT,
  FLASHCARD_SESSION_STATES,
} from "./flashcard-session.constant.ts";
import { FLASHCARD_ID_PREFIX } from "./flashcard.ts";
import { createPrefixedIdSchema } from "./id-schema.ts";
import { STUDY_SET_ID_PREFIX } from "./study-set.ts";

const sessionIdSchema = createPrefixedIdSchema(FLASHCARD_SESSION_ID_PREFIX);
const studySetIdSchema = createPrefixedIdSchema(STUDY_SET_ID_PREFIX);
const flashcardIdSchema = createPrefixedIdSchema(FLASHCARD_ID_PREFIX);

const ratingSchema = v.picklist(FLASHCARD_SESSION_RATINGS);
const bucketSchema = v.picklist(FLASHCARD_SESSION_BUCKETS);
const stateSchema = v.picklist(FLASHCARD_SESSION_STATES);

const pageSchema = v.optional(
  v.pipe(v.number(), v.integer(), v.minValue(1)),
  FLASHCARD_SESSION_PAGE_DEFAULT
);

const pageLimitSchema = v.optional(
  v.pipe(
    v.number(),
    v.integer(),
    v.minValue(1),
    v.maxValue(FLASHCARD_SESSION_PAGE_LIMIT_MAX)
  ),
  FLASHCARD_SESSION_PAGE_LIMIT_DEFAULT
);

export const flashcardSessionPaginationSchema = v.object({
  limit: pageLimitSchema,
  page: pageSchema,
});

export const getOrCreateFlashcardSessionInputSchema = v.object({
  studySetId: studySetIdSchema,
});

export const submitReviewInputSchema = v.object({
  flashcardId: flashcardIdSchema,
  rating: ratingSchema,
  sessionId: sessionIdSchema,
});

export const getFlashcardSessionInputSchema = v.object({
  sessionId: sessionIdSchema,
});

export const getReviewQueueInputSchema = v.object({
  newCardsPerDay: v.optional(
    v.pipe(
      v.number(),
      v.integer(),
      v.minValue(1),
      v.maxValue(FLASHCARD_SESSION_NEW_CARDS_PER_DAY_MAX)
    ),
    FLASHCARD_SESSION_NEW_CARDS_PER_DAY_DEFAULT
  ),
  studySetId: studySetIdSchema,
});

export const listReviewsInputSchema = v.object({
  limit: v.optional(
    v.pipe(
      v.number(),
      v.integer(),
      v.minValue(1),
      v.maxValue(FLASHCARD_SESSION_REVIEW_LIST_MAX)
    ),
    FLASHCARD_SESSION_REVIEW_LIST_DEFAULT
  ),
  studySetId: studySetIdSchema,
});

export const adminListSessionsInputSchema = v.pipe(
  v.object({
    pagination: v.optional(flashcardSessionPaginationSchema),
    studySetId: v.optional(studySetIdSchema),
    userId: v.optional(v.string()),
  }),
  v.check(
    (input) => input.userId !== undefined || input.studySetId !== undefined,
    "At least one of userId or studySetId must be provided"
  )
);

export const listSessionsInputSchema = v.object({
  pagination: v.optional(flashcardSessionPaginationSchema),
});

export const flashcardSessionSchema = v.object({
  createdAt: v.date(),
  id: v.string(),
  studySetId: v.string(),
  updatedAt: v.date(),
  userId: v.string(),
});

export const flashcardSessionReviewSchema = v.object({
  flashcardId: v.string(),
  id: v.string(),
  preDifficulty: v.number(),
  preDue: v.nullable(v.date()),
  preLapses: v.number(),
  preLastReview: v.nullable(v.date()),
  preLearningSteps: v.number(),
  preReps: v.number(),
  preScheduledDays: v.number(),
  preStability: v.number(),
  preState: stateSchema,
  rating: ratingSchema,
  reviewedAt: v.date(),
  sessionId: v.string(),
});

export const flashcardCardStateSchema = v.object({
  difficulty: v.number(),
  due: v.date(),
  elapsedDays: v.number(),
  flashcardId: v.string(),
  introducedAt: v.nullable(v.date()),
  lapses: v.number(),
  lastReview: v.nullable(v.date()),
  learningSteps: v.number(),
  reps: v.number(),
  scheduledDays: v.number(),
  stability: v.number(),
  state: stateSchema,
  updatedAt: v.date(),
  userId: v.string(),
});

export const flashcardQueueItemSchema = v.object({
  back: v.string(),
  bucket: bucketSchema,
  flashcardId: v.string(),
  front: v.string(),
  hint: v.nullable(v.string()),
  state: v.nullable(flashcardCardStateSchema),
});

export const dueIn7DaysItemSchema = v.object({
  count: v.number(),
  date: v.string(),
});

export const bucketedQueueSchema = v.object({
  dueIn7Days: v.array(dueIn7DaysItemSchema),
  dueToday: v.array(flashcardQueueItemSchema),
  new: v.array(flashcardQueueItemSchema),
  newLimitReached: v.boolean(),
  overdue: v.array(flashcardQueueItemSchema),
});

export const deleteExpiredOutputSchema = v.object({
  deletedCount: v.number(),
});

const flashcardSessionPaginationOutputSchema = v.object({
  limit: v.number(),
  page: v.number(),
  total: v.number(),
  totalPages: v.number(),
});

export const flashcardSessionListResultSchema = v.object({
  data: v.array(flashcardSessionSchema),
  pagination: flashcardSessionPaginationOutputSchema,
});

export type GetOrCreateFlashcardSessionInput = v.InferOutput<
  typeof getOrCreateFlashcardSessionInputSchema
>;
export type SubmitReviewInput = v.InferOutput<typeof submitReviewInputSchema>;
export type GetFlashcardSessionInput = v.InferOutput<
  typeof getFlashcardSessionInputSchema
>;
export type GetReviewQueueInput = v.InferOutput<
  typeof getReviewQueueInputSchema
>;
export type ListReviewsInput = v.InferOutput<typeof listReviewsInputSchema>;
export type AdminListSessionsInput = v.InferOutput<
  typeof adminListSessionsInputSchema
>;
export type ListSessionsInput = v.InferOutput<typeof listSessionsInputSchema>;
export type FlashcardSessionPagination = v.InferOutput<
  typeof flashcardSessionPaginationSchema
>;
export type FlashcardSessionListResult = v.InferOutput<
  typeof flashcardSessionListResultSchema
>;
export type FlashcardSession = v.InferOutput<typeof flashcardSessionSchema>;
export type FlashcardSessionReview = v.InferOutput<
  typeof flashcardSessionReviewSchema
>;
export type FlashcardCardState = v.InferOutput<typeof flashcardCardStateSchema>;
export type FlashcardQueueItem = v.InferOutput<typeof flashcardQueueItemSchema>;
export type BucketedQueue = v.InferOutput<typeof bucketedQueueSchema>;
export type DeleteExpiredOutput = v.InferOutput<
  typeof deleteExpiredOutputSchema
>;
