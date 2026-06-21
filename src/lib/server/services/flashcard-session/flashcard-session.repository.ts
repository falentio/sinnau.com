import type {
  FlashcardCardState,
  FlashcardSession,
  FlashcardSessionReview,
} from "../../infras/db/schema/flashcard-session.ts";

export interface QueueFlashcardWithState {
  flashcardId: string;
  front: string;
  back: string;
  hint: string | null;
  createdAt: Date;
  state: FlashcardCardState | null;
}

export interface DueIn7DaysItem {
  date: string;
  count: number;
}

export interface FlashcardSessionListPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface FlashcardSessionListResult {
  data: FlashcardSession[];
  pagination: FlashcardSessionListPagination;
}

export interface FlashcardSessionRepository {
  findSessionById(id: string): Promise<FlashcardSession | null>;
  findSessionByUserAndStudySet(
    userId: string,
    studySetId: string
  ): Promise<FlashcardSession | null>;
  listSessionsForUser(
    userId: string,
    page: number,
    limit: number
  ): Promise<FlashcardSessionListResult>;
  listSessionsForAdmin(params: {
    userId?: string;
    studySetId?: string;
    page: number;
    limit: number;
  }): Promise<FlashcardSessionListResult>;

  getOrCreateSession(row: {
    studySetId: string;
    userId: string;
  }): Promise<FlashcardSession>;
  updateSessionTouch(
    id: string,
    userId: string
  ): Promise<FlashcardSession | null>;
  deleteExpiredSessions(beforeTimestamp: number): Promise<number>;

  findFlashcardsForQueue(params: {
    userId: string;
    studySetId: string;
    now: number;
    horizonMs: number;
    dueIn7DaysMs: number;
    newLimit: number;
  }): Promise<{
    overdue: QueueFlashcardWithState[];
    dueToday: QueueFlashcardWithState[];
    new: QueueFlashcardWithState[];
    newLimitReached: boolean;
    dueIn7Days: DueIn7DaysItem[];
  }>;

  countIntroducedToday(
    userId: string,
    studySetId: string,
    since: Date
  ): Promise<number>;

  findStateByKey(
    userId: string,
    flashcardId: string
  ): Promise<FlashcardCardState | null>;

  listReviewsByStudySet(params: {
    studySetId: string;
    userId: string;
    limit: number;
  }): Promise<FlashcardSessionReview[]>;

  insertReviewWithState(params: {
    review: Omit<FlashcardSessionReview, "id">;
    state: FlashcardCardState;
  }): Promise<{
    review: FlashcardSessionReview;
    state: FlashcardCardState;
  }>;
}
