export const FLASHCARD_SESSION_ID_PREFIX = "fse";
export const FLASHCARD_SESSION_REVIEW_ID_PREFIX = "fsr";

export const FLASHCARD_SESSION_TTL_MS = 7_776_000_000;
export const FLASHCARD_SESSION_REVIEW_HORIZON_MS = 86_400_000;
export const FLASHCARD_SESSION_DUE_IN_7_DAYS_MS = 604_800_000;
export const FLASHCARD_SESSION_NEW_CARDS_PER_DAY_DEFAULT = 20;
export const FLASHCARD_SESSION_NEW_CARDS_PER_DAY_MAX = 100;
export const FLASHCARD_SESSION_REVIEW_LIST_DEFAULT = 50;
export const FLASHCARD_SESSION_REVIEW_LIST_MAX = 200;
export const FLASHCARD_SESSION_PAGE_DEFAULT = 1;
export const FLASHCARD_SESSION_PAGE_LIMIT_DEFAULT = 20;
export const FLASHCARD_SESSION_PAGE_LIMIT_MAX = 100;
export const FLASHCARD_SESSION_QUEUE_BUCKET_LIMIT = 500;

export const FLASHCARD_SESSION_RATINGS = [
  "Again",
  "Hard",
  "Good",
  "Easy",
] as const;
export type FlashcardSessionRating = (typeof FLASHCARD_SESSION_RATINGS)[number];

export const FLASHCARD_SESSION_STATES = [
  "New",
  "Learning",
  "Review",
  "Relearning",
] as const;
export type FlashcardSessionState = (typeof FLASHCARD_SESSION_STATES)[number];

export const FLASHCARD_SESSION_BUCKETS = [
  "overdue",
  "due-today",
  "new",
  "due-in-7-days",
] as const;
export type FlashcardSessionBucket = (typeof FLASHCARD_SESSION_BUCKETS)[number];
