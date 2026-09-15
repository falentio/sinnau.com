import type {
  BucketedQueue,
  FlashcardQueueItem,
} from "$lib/schemas/flashcard-session";
import { FLASHCARD_SESSION_QUEUE_BUCKET_LIMIT } from "$lib/schemas/flashcard-session.constant";
import type { FlashcardSessionRating } from "$lib/schemas/flashcard-session.constant";

export interface ReviewSessionClient {
  getQueue: (input: { studySetId: string }) => Promise<BucketedQueue>;
  submitReview: (input: {
    flashcardId: string;
    rating: FlashcardSessionRating;
    sessionId: string;
  }) => Promise<unknown>;
}

export type ReviewSessionPhase =
  | "reviewing"
  | "submitting"
  | "refreshing"
  | "refresh-failed"
  | "complete";

export type ReviewSessionOutcome =
  | { kind: "advanced" }
  | { kind: "batch-loaded"; count: number }
  | { kind: "complete" }
  | { error: unknown; kind: "error" }
  | { kind: "ignored" }
  | { kind: "refresh-error" };

interface ReviewSessionStateConfig {
  initialCards: FlashcardQueueItem[];
  sessionId: string;
  studySetId: string;
}

const mergeQueue = (queue: BucketedQueue): FlashcardQueueItem[] =>
  [...queue.overdue, ...queue.dueToday, ...queue.new].slice(
    0,
    FLASHCARD_SESSION_QUEUE_BUCKET_LIMIT
  );

export class ReviewSessionState {
  cards = $state<FlashcardQueueItem[]>([]);
  currentIndex = $state(0);
  revealedIndex = $state(-1);
  submittedRatings = $state<FlashcardSessionRating[]>([]);
  phase = $state<ReviewSessionPhase>("reviewing");

  total = $derived(this.cards.length);
  currentCard = $derived<FlashcardQueueItem | null>(
    this.phase === "complete" ? null : (this.cards[this.currentIndex] ?? null)
  );
  revealed = $derived(
    this.phase === "reviewing" &&
      this.currentCard !== null &&
      this.revealedIndex === this.currentIndex
  );

  readonly client: ReviewSessionClient;
  readonly config: ReviewSessionStateConfig;

  constructor(client: ReviewSessionClient, config: ReviewSessionStateConfig) {
    this.client = client;
    this.config = config;
    this.cards = config.initialCards;
  }

  async rate(rating: FlashcardSessionRating): Promise<ReviewSessionOutcome> {
    if (this.phase !== "reviewing" || !this.currentCard) {
      return { kind: "ignored" };
    }

    const { flashcardId } = this.currentCard;
    this.phase = "submitting";
    try {
      await this.client.submitReview({
        flashcardId,
        rating,
        sessionId: this.config.sessionId,
      });
    } catch (error: unknown) {
      this.phase = "reviewing";
      return { error, kind: "error" };
    }

    this.submittedRatings.push(rating);

    if (this.currentIndex < this.total - 1) {
      this.currentIndex += 1;
      this.revealedIndex = -1;
      this.phase = "reviewing";
      return { kind: "advanced" };
    }

    return await this.refreshQueue();
  }

  async retryQueue(): Promise<ReviewSessionOutcome> {
    if (this.phase !== "refresh-failed") {
      return { kind: "ignored" };
    }
    return await this.refreshQueue();
  }

  reveal(): void {
    if (this.phase === "reviewing" && this.currentCard) {
      this.revealedIndex = this.currentIndex;
    }
  }

  skip(): void {
    if (this.phase !== "reviewing") {
      return;
    }
    if (this.currentIndex < this.total - 1) {
      this.currentIndex += 1;
      this.revealedIndex = -1;
      return;
    }
    this.phase = "complete";
  }

  prev(): void {
    if (this.phase === "reviewing" && this.currentIndex > 0) {
      this.currentIndex -= 1;
      this.revealedIndex = -1;
    }
  }

  private async refreshQueue(): Promise<ReviewSessionOutcome> {
    this.phase = "refreshing";
    try {
      const queue = await this.client.getQueue({
        studySetId: this.config.studySetId,
      });
      const nextCards = mergeQueue(queue);
      if (nextCards.length === 0) {
        this.phase = "complete";
        return { kind: "complete" };
      }

      this.cards = nextCards;
      this.currentIndex = 0;
      this.revealedIndex = -1;
      this.phase = "reviewing";
      return { count: nextCards.length, kind: "batch-loaded" };
    } catch {
      this.phase = "refresh-failed";
      return { kind: "refresh-error" };
    }
  }
}
