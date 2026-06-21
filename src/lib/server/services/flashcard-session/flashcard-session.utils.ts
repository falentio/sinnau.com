import { FLASHCARD_ID_PREFIX } from "$lib/schemas/flashcard";
import type {
  BucketedQueue,
  FlashcardQueueItem,
  FlashcardSession,
  FlashcardSessionReview,
  FlashcardSessionReviewWithFront,
} from "$lib/schemas/flashcard-session";
import {
  FLASHCARD_SESSION_ID_PREFIX,
  FLASHCARD_SESSION_REVIEW_ID_PREFIX,
} from "$lib/schemas/flashcard-session.constant";
import { STUDY_SET_ID_PREFIX } from "$lib/schemas/study-set";

import { generateId } from "../../utils/nanoid.ts";

export const DEV_STUB_FILTERS = new Set([
  "empty",
  "ready",
  "mixed",
  "500",
  "queue-empty",
  "queue-ready",
  "results-empty",
  "results-mixed",
] as const);

export type DevStubFilter =
  typeof DEV_STUB_FILTERS extends Set<infer T> ? T : never;

interface HubStub {
  pendingCount: number;
  queue: BucketedQueue;
  recentReviews: FlashcardSessionReviewWithFront[];
  session: FlashcardSession;
  totalFlashcards: number;
}

interface ReviewStub {
  cards: FlashcardQueueItem[];
  session: FlashcardSession;
}

interface ResultsStub {
  reviews: FlashcardSessionReviewWithFront[];
  session: FlashcardSession;
}

const isDevStubFilter = (value: string): value is DevStubFilter =>
  (DEV_STUB_FILTERS as Set<string>).has(value);

const padId = (prefix: string, n: number) =>
  `${prefix}_${n.toString().padStart(18, "0")}`;

const makeSession = (
  studySetId: string,
  userId = "user-stub"
): FlashcardSession => ({
  createdAt: new Date(Date.now() - 60 * 60_000),
  id: padId(FLASHCARD_SESSION_ID_PREFIX, 1),
  studySetId,
  updatedAt: new Date(),
  userId,
});

const makeQueueItem = (
  n: number,
  bucket: FlashcardQueueItem["bucket"],
  state: FlashcardQueueItem["state"]
): FlashcardQueueItem => ({
  back: `Jawaban flashcard ${n}`,
  bucket,
  flashcardId: padId(FLASHCARD_ID_PREFIX, n),
  front: `Pertanyaan flashcard ${n}`,
  hint: n % 3 === 0 ? `Petunjuk untuk flashcard ${n}` : null,
  state,
});

const makeReview = (
  n: number,
  rating: FlashcardSessionReview["rating"],
  preState: FlashcardSessionReview["preState"] = "Review",
  front: string = `Pertanyaan flashcard ${n}`
): FlashcardSessionReviewWithFront => ({
  flashcardId: padId(FLASHCARD_ID_PREFIX, n),
  front,
  id: padId(FLASHCARD_SESSION_REVIEW_ID_PREFIX, n),
  preDifficulty: 5.2,
  preDue: new Date(Date.now() - 3 * 60 * 60_000),
  preLapses: n % 4,
  preLastReview: new Date(Date.now() - 26 * 60 * 60_000),
  preLearningSteps: 0,
  preReps: n,
  preScheduledDays: 1,
  preStability: 3.4,
  preState,
  rating,
  reviewedAt: new Date(Date.now() - n * 5 * 60_000),
  sessionId: padId(FLASHCARD_SESSION_ID_PREFIX, 1),
});

const zeroFillDueIn7Days = () => {
  const out: { count: number; date: string }[] = [];
  const now = new Date();
  for (let i = 1; i <= 7; i += 1) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + i)
    );
    out.push({ count: 0, date: d.toISOString().slice(0, 10) });
  }
  return out;
};

const forecastWithCounts = (counts: number[]) => {
  const base = zeroFillDueIn7Days();
  counts.forEach((c, i) => {
    if (base[i]) base[i].count = c;
  });
  return base;
};

const hubStubs = {
  "500": (_studySetId: string): HubStub => {
    throw new Error("DEV_STUB_500");
  },
  empty: (studySetId: string): HubStub => ({
    pendingCount: 0,
    queue: {
      dueIn7Days: zeroFillDueIn7Days(),
      dueToday: [],
      new: [],
      newLimitReached: false,
      overdue: [],
    },
    recentReviews: [],
    session: makeSession(studySetId),
    totalFlashcards: 0,
  }),
  ready: (studySetId: string): HubStub => {
    const state = {
      difficulty: 5.4,
      due: new Date(Date.now() - 30 * 60_000),
      elapsedDays: 1,
      flashcardId: padId(FLASHCARD_ID_PREFIX, 1),
      introducedAt: new Date(Date.now() - 24 * 60 * 60_000),
      lapses: 0,
      lastReview: new Date(Date.now() - 24 * 60 * 60_000),
      learningSteps: 0,
      reps: 2,
      scheduledDays: 1,
      stability: 2.1,
      state: "Review" as const,
      updatedAt: new Date(),
      userId: "user-stub",
    };
    return {
      pendingCount: 7,
      queue: {
        dueIn7Days: forecastWithCounts([3, 5, 2, 0, 4, 1, 6]),
        dueToday: [
          makeQueueItem(1, "due-today", state),
          makeQueueItem(2, "due-today", {
            ...state,
            flashcardId: padId(FLASHCARD_ID_PREFIX, 2),
          }),
        ],
        new: [makeQueueItem(6, "new", null), makeQueueItem(7, "new", null)],
        newLimitReached: false,
        overdue: [
          makeQueueItem(3, "overdue", {
            ...state,
            flashcardId: padId(FLASHCARD_ID_PREFIX, 3),
            due: new Date(Date.now() - 2 * 24 * 60 * 60_000),
          }),
          makeQueueItem(4, "overdue", {
            ...state,
            flashcardId: padId(FLASHCARD_ID_PREFIX, 4),
            due: new Date(Date.now() - 3 * 24 * 60 * 60_000),
          }),
          makeQueueItem(5, "overdue", {
            ...state,
            flashcardId: padId(FLASHCARD_ID_PREFIX, 5),
            due: new Date(Date.now() - 5 * 24 * 60 * 60_000),
          }),
        ],
      },
      recentReviews: [
        makeReview(2, "Good"),
        makeReview(3, "Hard"),
        makeReview(4, "Easy"),
        makeReview(5, "Again"),
      ],
      session: makeSession(studySetId),
      totalFlashcards: 42,
    };
  },
  mixed: (studySetId: string): HubStub => ({
    pendingCount: 3,
    queue: {
      dueIn7Days: forecastWithCounts([1, 0, 2, 0, 0, 3, 0]),
      dueToday: [makeQueueItem(1, "due-today", null)],
      new: [makeQueueItem(2, "new", null)],
      newLimitReached: true,
      overdue: [makeQueueItem(3, "overdue", null)],
    },
    recentReviews: [makeReview(1, "Good")],
    session: makeSession(studySetId),
    totalFlashcards: 12,
  }),
} as const;

const reviewStubs = {
  "queue-empty": (studySetId: string): ReviewStub => ({
    cards: [],
    session: makeSession(studySetId),
  }),
  "queue-ready": (studySetId: string): ReviewStub => ({
    cards: [
      makeQueueItem(3, "overdue", null),
      makeQueueItem(4, "overdue", null),
      makeQueueItem(1, "due-today", null),
      makeQueueItem(2, "due-today", null),
      makeQueueItem(6, "new", null),
      makeQueueItem(7, "new", null),
    ],
    session: makeSession(studySetId),
  }),
} as const;

const resultsStubs = {
  "results-empty": (studySetId: string): ResultsStub => ({
    reviews: [],
    session: makeSession(studySetId),
  }),
  "results-mixed": (studySetId: string): ResultsStub => ({
    reviews: [
      makeReview(1, "Easy", "Review"),
      makeReview(2, "Good", "Learning"),
      makeReview(3, "Hard", "Learning"),
      makeReview(4, "Again", "New"),
      makeReview(5, "Good", "Review"),
      makeReview(6, "Easy", "Review"),
      makeReview(7, "Again", "Relearning"),
      makeReview(8, "Good", "Review"),
    ],
    session: makeSession(studySetId),
  }),
} as const;

export const isHubStubFilter = (
  value: string
): value is keyof typeof hubStubs =>
  value in hubStubs && isDevStubFilter(value);

export const isReviewStubFilter = (
  value: string
): value is keyof typeof reviewStubs =>
  value in reviewStubs && isDevStubFilter(value);

export const isResultsStubFilter = (
  value: string
): value is keyof typeof resultsStubs =>
  value in resultsStubs && isDevStubFilter(value);

export const getHubStub = (
  filter: string | null,
  studySetId: string
): HubStub | null => {
  if (filter === null) return null;
  if (!isHubStubFilter(filter)) return null;
  return hubStubs[filter](studySetId);
};

export const getReviewStub = (
  filter: string | null,
  studySetId: string
): ReviewStub | null => {
  if (filter === null) return null;
  if (!isReviewStubFilter(filter)) return null;
  return reviewStubs[filter](studySetId);
};

export const getResultsStub = (
  filter: string | null,
  studySetId: string
): ResultsStub | null => {
  if (filter === null) return null;
  if (!isResultsStubFilter(filter)) return null;
  return resultsStubs[filter](studySetId);
};

export const makeStubStudySetId = (): string => generateId(STUDY_SET_ID_PREFIX);
