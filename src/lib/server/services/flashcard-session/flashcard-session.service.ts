import type {
  AdminListSessionsInput,
  BucketedQueue,
  DeleteExpiredOutput,
  FlashcardQueueItem,
  GetFlashcardSessionInput,
  GetOrCreateFlashcardSessionInput,
  GetReviewQueueInput,
  ListReviewsInput,
  SubmitReviewInput,
} from "$lib/schemas/flashcard-session";
import {
  FLASHCARD_SESSION_ID_PREFIX,
  FLASHCARD_SESSION_REVIEW_HORIZON_MS,
  FLASHCARD_SESSION_DUE_IN_7_DAYS_MS,
  FLASHCARD_SESSION_TTL_MS,
} from "$lib/schemas/flashcard-session.constant";
import type { FlashcardSessionRating } from "$lib/schemas/flashcard-session.constant";
import { Rating, State, fsrs } from "ts-fsrs";
import type { CardInput, Grade } from "ts-fsrs";

import type {
  FlashcardCardState,
  FlashcardSession,
  FlashcardSessionReview,
} from "../../infras/db/schema/flashcard-session.ts";
import { generateId } from "../../utils/nanoid.ts";
import type { FlashcardSessionGuard } from "./flashcard-session.guard.ts";
import type {
  FlashcardSessionRepository,
  QueueFlashcardWithState,
} from "./flashcard-session.repository.ts";

export type { FlashcardSession, FlashcardSessionReview, FlashcardCardState };

const ratingToGrade: Record<FlashcardSessionRating, Grade> = {
  Again: Rating.Again as Grade,
  Easy: Rating.Easy as Grade,
  Good: Rating.Good as Grade,
  Hard: Rating.Hard as Grade,
};

const computeFsrs = fsrs();

const emptyCardAsInput = (now: Date): CardInput => ({
  difficulty: 0,
  due: now,
  elapsed_days: 0,
  lapses: 0,
  last_review: null,
  learning_steps: 0,
  reps: 0,
  scheduled_days: 0,
  stability: 0,
  state: State.New,
});

const dbStateToCardInput = (state: FlashcardCardState): CardInput => ({
  difficulty: state.difficulty,
  due: state.due,
  elapsed_days: state.elapsedDays,
  lapses: state.lapses,
  last_review: state.lastReview,
  learning_steps: state.learningSteps,
  reps: state.reps,
  scheduled_days: state.scheduledDays,
  stability: state.stability,
  state: state.state,
});

const fsrsStateToDb = (state: State): FlashcardCardState["state"] => {
  const map: Record<number, FlashcardCardState["state"]> = {
    [State.New]: "New",
    [State.Learning]: "Learning",
    [State.Review]: "Review",
    [State.Relearning]: "Relearning",
  };
  return map[state] ?? "New";
};

const newCardToDbState = (
  userId: string,
  flashcardId: string,
  card: {
    due: Date;
    stability: number;
    difficulty: number;
    elapsed_days: number;
    scheduled_days: number;
    reps: number;
    lapses: number;
    state: State;
    last_review?: Date;
    learning_steps: number;
  },
  introducedAt: Date | null
): FlashcardCardState => ({
  difficulty: card.difficulty,
  due: card.due,
  elapsedDays: card.elapsed_days,
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
    return this.repo.getOrCreateSession({
      id: generateId(FLASHCARD_SESSION_ID_PREFIX),
      studySetId: input.studySetId,
      userId: ownerId,
    });
  }

  async getSession(
    input: GetFlashcardSessionInput,
    userId: string | null | undefined
  ): Promise<FlashcardSession> {
    const ownerId = this.guard.requireUser(userId);
    return this.guard.assertSessionOwnerOrNotFound(input.sessionId, ownerId);
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
    await this.guard.assertFlashcardBelongsToStudySetOrValidationFailed(
      input.flashcardId,
      session.studySetId
    );

    const now = new Date();
    const existingState = await this.repo.findStateByKey(
      ownerId,
      input.flashcardId
    );

    const preCard: CardInput = existingState
      ? dbStateToCardInput(existingState)
      : emptyCardAsInput(now);

    const grade = ratingToGrade[input.rating];
    const recordLogItem = computeFsrs.next(preCard, now, grade);
    const nextCard = recordLogItem.card;

    const preStateStr: FlashcardCardState["state"] =
      typeof preCard.state === "string"
        ? preCard.state
        : fsrsStateToDb(preCard.state);

    const introducedAt = existingState?.introducedAt ?? now;
    const newState = newCardToDbState(
      ownerId,
      input.flashcardId,
      nextCard,
      introducedAt
    );

    const { review } = await this.repo.insertReviewWithState({
      review: {
        sessionId: session.id,
        flashcardId: input.flashcardId,
        rating: input.rating,
        reviewedAt: now,
        preState: preStateStr,
        preStability: preCard.stability,
        preDifficulty: preCard.difficulty,
        preDue: preCard.due,
        preLastReview: preCard.last_review ?? null,
        preReps: preCard.reps,
        preLapses: preCard.lapses,
        preScheduledDays: preCard.scheduled_days,
        preLearningSteps: preCard.learning_steps,
      },
      state: newState,
    });

    await this.repo.updateSessionTouch(session.id, ownerId);

    return review;
  }

  async getReviewQueue(
    input: GetReviewQueueInput,
    userId: string | null | undefined
  ): Promise<BucketedQueue> {
    const ownerId = this.guard.requireUser(userId);
    await this.guard.assertStudySetVisibleOrNotFound(input.studySetId, ownerId);

    const now = Date.now();
    const [queue, introducedToday] = await Promise.all([
      this.repo.findFlashcardsForQueue({
        dueIn7DaysMs: FLASHCARD_SESSION_DUE_IN_7_DAYS_MS,
        horizonMs: FLASHCARD_SESSION_REVIEW_HORIZON_MS,
        now,
        studySetId: input.studySetId,
        userId: ownerId,
      }),
      this.repo.countIntroducedToday(
        ownerId,
        input.studySetId,
        utcMidnight(now)
      ),
    ]);

    const remaining = Math.max(0, input.newCardsPerDay - introducedToday);
    const capped = queue.new.slice(0, remaining);
    const newLimitReached = queue.new.length > remaining;

    return {
      dueIn7Days: queue.dueIn7Days,
      dueToday: queue.dueToday.map((item) => toQueueItem(item, "due-today")),
      new: capped.map((item) => toQueueItem(item, "new")),
      newLimitReached,
      overdue: queue.overdue.map((item) => toQueueItem(item, "overdue")),
    };
  }

  async listReviews(
    input: ListReviewsInput,
    userId: string | null | undefined
  ): Promise<FlashcardSessionReview[]> {
    const ownerId = this.guard.requireUser(userId);
    await this.guard.assertStudySetVisibleOrNotFound(input.studySetId, ownerId);
    return this.repo.listReviewsByStudySet({
      limit: input.limit,
      studySetId: input.studySetId,
      userId: ownerId,
    });
  }

  async listSessions(
    userId: string | null | undefined
  ): Promise<FlashcardSession[]> {
    const ownerId = this.guard.requireUser(userId);
    return this.repo.listSessionsForUser(ownerId);
  }

  async adminListSessions(
    input: AdminListSessionsInput
  ): Promise<FlashcardSession[]> {
    return this.repo.listSessionsForAdmin({
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
