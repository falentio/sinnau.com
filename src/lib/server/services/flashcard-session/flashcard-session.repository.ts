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

export interface FlashcardSessionRepository {
  findSessionById(id: string): Promise<FlashcardSession | null>;
  findSessionByUserAndStudySet(
    userId: string,
    studySetId: string
  ): Promise<FlashcardSession | null>;
  listSessionsForUser(userId: string): Promise<FlashcardSession[]>;
  listSessionsForAdmin(params: {
    userId?: string;
    studySetId?: string;
  }): Promise<FlashcardSession[]>;

  getOrCreateSession(row: {
    id: string;
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
  }): Promise<{
    overdue: QueueFlashcardWithState[];
    dueToday: QueueFlashcardWithState[];
    new: QueueFlashcardWithState[];
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

  upsertState(row: FlashcardCardState): Promise<FlashcardCardState>;

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
