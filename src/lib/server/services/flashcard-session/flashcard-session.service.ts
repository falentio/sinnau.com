import type {
  AdminListSessionsInput,
  BucketedQueue,
  DeleteExpiredOutput,
  FlashcardQueueItem,
  FlashcardSessionReviewWithFront,
  GetFlashcardSessionInput,
  GetOrCreateFlashcardSessionInput,
  GetReviewQueueInput,
  ListReviewsInput,
  ListSessionsInput,
  SubmitReviewInput,
  FlashcardSessionListResult,
} from "$lib/schemas/flashcard-session";
import {
  FLASHCARD_SESSION_REVIEW_HORIZON_MS,
  FLASHCARD_SESSION_DUE_IN_7_DAYS_MS,
  FLASHCARD_SESSION_PAGE_DEFAULT,
  FLASHCARD_SESSION_PAGE_LIMIT_DEFAULT,
  FLASHCARD_SESSION_TTL_MS,
} from "$lib/schemas/flashcard-session.constant";
import type { FlashcardSessionRating } from "$lib/schemas/flashcard-session.constant";
import { getLogger } from "@logtape/logtape";
import { Rating, State, createEmptyCard, fsrs } from "ts-fsrs";
import type { Card, CardInput, DateInput, Grade } from "ts-fsrs";

import type {
  FlashcardCardState,
  FlashcardSession,
  FlashcardSessionReview,
} from "../../infras/db/schema/flashcard-session.ts";
import type { FlashcardSessionGuard } from "./flashcard-session.guard.ts";

const logger = getLogger(["sinnau.com", "flashcard-session", "service"]);
import type {
  FlashcardSessionRepository,
  QueueFlashcardWithState,
} from "./flashcard-session.repository.ts";

export type { FlashcardSession, FlashcardSessionReview, FlashcardCardState };

const ratingToGrade: Record<FlashcardSessionRating, Grade> = {
  Again: Rating.Again,
  Easy: Rating.Easy,
  Good: Rating.Good,
  Hard: Rating.Hard,
};

const dbStateToFsrsState = (state: FlashcardCardState["state"]): State => {
  switch (state) {
    case "New": {
      return State.New;
    }
    case "Learning": {
      return State.Learning;
    }
    case "Review": {
      return State.Review;
    }
    case "Relearning": {
      return State.Relearning;
    }
    default: {
      const exhaustive: never = state;
      throw new Error(`Unhandled FSRS state: ${String(exhaustive)}`);
    }
  }
};

const fsrsStateToDb = (state: State): FlashcardCardState["state"] => {
  switch (state) {
    case State.New: {
      return "New";
    }
    case State.Learning: {
      return "Learning";
    }
    case State.Review: {
      return "Review";
    }
    case State.Relearning: {
      return "Relearning";
    }
    default: {
      const exhaustive: never = state;
      throw new Error(`Unhandled FSRS state: ${String(exhaustive)}`);
    }
  }
};

const cardInputFromState = (state: FlashcardCardState): CardInput => ({
  difficulty: state.difficulty,
  due: state.due,
  elapsed_days: state.elapsedDays, // oxlint-disable-line no-deprecated
  lapses: state.lapses,
  last_review: state.lastReview,
  learning_steps: state.learningSteps,
  reps: state.reps,
  scheduled_days: state.scheduledDays,
  stability: state.stability,
  state: dbStateToFsrsState(state.state),
});

const newCardToDbState = (
  userId: string,
  flashcardId: string,
  card: Card,
  introducedAt: Date | null
): FlashcardCardState => ({
  difficulty: card.difficulty,
  due: card.due,
  elapsedDays: card.elapsed_days, // oxlint-disable-line no-deprecated
  flashcardId,
  introducedAt,
  lapses: card.lapses,
  lastReview: card.last_review ?? null,
  learningSteps: card.learning_steps,
  reps: card.reps,
  scheduledDays: card.scheduled_days,
  stability: card.stability,
  state: fsrsStateToDb(card.state),
  updatedAt: new Date(),
  userId,
});

const utcMidnight = (now: number): Date => {
  const d = new Date(now);
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
};

const normalizeDate = (value: DateInput | null | undefined): Date | null => {
  if (value === null || value === undefined) {
    return null;
  }
  return value instanceof Date ? value : new Date(value);
};

const toQueueItem = (
  row: QueueFlashcardWithState,
  bucket: FlashcardQueueItem["bucket"]
): FlashcardQueueItem => ({
  back: row.back,
  bucket,
  flashcardId: row.flashcardId,
  front: row.front,
  hint: row.hint,
  state: row.state,
});

const computeFsrs = fsrs();

export class FlashcardSessionService {
  private readonly repo: FlashcardSessionRepository;
  private readonly guard: FlashcardSessionGuard;

  constructor(repo: FlashcardSessionRepository, guard: FlashcardSessionGuard) {
    this.repo = repo;
    this.guard = guard;
  }

  async getOrCreateSession(
    input: GetOrCreateFlashcardSessionInput,
    userId: string | null | undefined
  ): Promise<FlashcardSession> {
    const ownerId = this.guard.requireUser(userId);
    await this.guard.assertStudySetVisibleOrNotFound(input.studySetId, ownerId);
    return await this.repo.getOrCreateSession({
      studySetId: input.studySetId,
      userId: ownerId,
    });
  }

  async getSession(
    input: GetFlashcardSessionInput,
    userId: string | null | undefined
  ): Promise<FlashcardSession> {
    const ownerId = this.guard.requireUser(userId);
    return await this.guard.assertSessionOwnerOrNotFound(
      input.sessionId,
      ownerId
    );
  }

  async submitReview(
    input: SubmitReviewInput,
    userId: string | null | undefined
  ): Promise<FlashcardSessionReview> {
    const ownerId = this.guard.requireUser(userId);
    const session = await this.guard.assertSessionOwnerOrNotFound(
      input.sessionId,
      ownerId
    );
    await this.guard.assertFlashcardBelongsToStudySetOrNotFound(
      input.flashcardId,
      session.studySetId
    );

    const now = new Date();
    const existingState = await this.repo.findStateByKey(
      ownerId,
      input.flashcardId
    );

    const preCard: CardInput = existingState
      ? cardInputFromState(existingState)
      : createEmptyCard(now);

    const grade = ratingToGrade[input.rating];
    const recordLogItem = computeFsrs.next(preCard, now, grade);
    const nextCard = recordLogItem.card;

    let preDue: Date | null;
    if (existingState === null) {
      preDue = null;
    } else if (preCard.due instanceof Date) {
      preDue = preCard.due;
    } else {
      preDue = new Date(preCard.due);
    }
    const preLastReview = normalizeDate(preCard.last_review);

    const preStateStr: FlashcardCardState["state"] =
      typeof preCard.state === "string"
        ? preCard.state
        : fsrsStateToDb(preCard.state);

    const introducedAt =
      existingState === null ? now : existingState.introducedAt;
    const newState = newCardToDbState(
      ownerId,
      input.flashcardId,
      nextCard,
      introducedAt
    );

    const { review } = await this.repo.insertReviewWithState({
      review: {
        flashcardId: input.flashcardId,
        preDifficulty: preCard.difficulty,
        preDue,
        preLapses: preCard.lapses,
        preLastReview,
        preLearningSteps: preCard.learning_steps,
        preReps: preCard.reps,
        preScheduledDays: preCard.scheduled_days,
        preStability: preCard.stability,
        preState: preStateStr,
        rating: input.rating,
        reviewedAt: now,
        sessionId: session.id,
      },
      state: newState,
    });

    try {
      await this.repo.updateSessionTouch(session.id, ownerId);
    } catch (error) {
      logger.error("updateSessionTouch failed", {
        error,
        sessionId: session.id,
        userId: ownerId,
      });
    }

    return review;
  }

  async getReviewQueue(
    input: GetReviewQueueInput,
    userId: string | null | undefined
  ): Promise<BucketedQueue> {
    const ownerId = this.guard.requireUser(userId);
    await this.guard.assertStudySetVisibleOrNotFound(input.studySetId, ownerId);

    const now = Date.now();
    const introducedToday = await this.repo.countIntroducedToday(
      ownerId,
      input.studySetId,
      utcMidnight(now)
    );
    const newLimit = Math.max(0, input.newCardsPerDay - introducedToday);
    const queue = await this.repo.findFlashcardsForQueue({
      dueIn7DaysMs: FLASHCARD_SESSION_DUE_IN_7_DAYS_MS,
      horizonMs: FLASHCARD_SESSION_REVIEW_HORIZON_MS,
      newLimit,
      now,
      studySetId: input.studySetId,
      userId: ownerId,
    });

    return {
      dueIn7Days: queue.dueIn7Days,
      dueToday: queue.dueToday.map((item) => toQueueItem(item, "due-today")),
      new: queue.new.map((item) => toQueueItem(item, "new")),
      newLimitReached: queue.newLimitReached,
      overdue: queue.overdue.map((item) => toQueueItem(item, "overdue")),
    };
  }

  async listReviews(
    input: ListReviewsInput,
    userId: string | null | undefined
  ): Promise<FlashcardSessionReviewWithFront[]> {
    const ownerId = this.guard.requireUser(userId);
    await this.guard.assertStudySetVisibleOrNotFound(input.studySetId, ownerId);
    return await this.repo.listReviewsByStudySet({
      limit: input.limit,
      studySetId: input.studySetId,
      userId: ownerId,
    });
  }

  async listSessions(
    input: ListSessionsInput | undefined,
    userId: string | null | undefined
  ): Promise<FlashcardSessionListResult> {
    const ownerId = this.guard.requireUser(userId);
    const page = input?.pagination?.page ?? FLASHCARD_SESSION_PAGE_DEFAULT;
    const limit =
      input?.pagination?.limit ?? FLASHCARD_SESSION_PAGE_LIMIT_DEFAULT;
    return await this.repo.listSessionsForUser(ownerId, page, limit);
  }

  async adminListSessions(
    input: AdminListSessionsInput
  ): Promise<FlashcardSessionListResult> {
    const page = input.pagination?.page ?? FLASHCARD_SESSION_PAGE_DEFAULT;
    const limit =
      input.pagination?.limit ?? FLASHCARD_SESSION_PAGE_LIMIT_DEFAULT;
    return await this.repo.listSessionsForAdmin({
      limit,
      page,
      studySetId: input.studySetId,
      userId: input.userId,
    });
  }

  async adminDeleteExpired(): Promise<DeleteExpiredOutput> {
    const beforeTimestamp = Date.now() - FLASHCARD_SESSION_TTL_MS;
    const deletedCount = await this.repo.deleteExpiredSessions(beforeTimestamp);
    return { deletedCount };
  }
}
