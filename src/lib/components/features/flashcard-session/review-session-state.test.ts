import type {
  BucketedQueue,
  FlashcardQueueItem,
} from "$lib/schemas/flashcard-session";
import { describe, it, vi } from "vitest";
import type { Mocked } from "vitest";

import type {
  ReviewSessionClient,
  ReviewSessionOutcome,
} from "./review-session-state.svelte";
import { ReviewSessionState } from "./review-session-state.svelte";

const ID = {
  CARD_1: "fcd_000000000000000001",
  CARD_2: "fcd_000000000000000002",
  CARD_3: "fcd_000000000000000003",
  SESSION: "fse_000000000000000001",
  STUDY_SET: "sst_000000000000000001",
} as const;

const makeCard = (
  flashcardId: string,
  front = flashcardId
): FlashcardQueueItem => ({
  back: `Answer for ${front}`,
  bucket: "due-today",
  flashcardId,
  front,
  hint: null,
  state: null,
});

const makeQueue = (dueToday: FlashcardQueueItem[] = []): BucketedQueue => ({
  dueIn7Days: [],
  dueToday,
  new: [],
  newLimitReached: false,
  overdue: [],
});

const makeClient = (): Mocked<ReviewSessionClient> => ({
  getQueue: vi.fn<ReviewSessionClient["getQueue"]>(),
  submitReview: vi.fn<ReviewSessionClient["submitReview"]>(),
});

const expectOutcome = (
  outcome: ReviewSessionOutcome,
  kind: ReviewSessionOutcome["kind"]
) => {
  if (outcome.kind !== kind) {
    throw new Error(`Expected ${kind}, received ${outcome.kind}`);
  }
};

describe.concurrent(ReviewSessionState, () => {
  it("keeps a re-review card on the same page until the queue is empty", async ({
    expect,
  }) => {
    const client = makeClient();
    client.submitReview.mockResolvedValue({});
    client.getQueue
      .mockResolvedValueOnce(makeQueue([makeCard(ID.CARD_1, "Again card")]))
      .mockResolvedValueOnce(makeQueue());

    const state = new ReviewSessionState(client, {
      initialCards: [makeCard(ID.CARD_1), makeCard(ID.CARD_2)],
      sessionId: ID.SESSION,
      studySetId: ID.STUDY_SET,
    });

    state.reveal();
    expectOutcome(await state.rate("Good"), "advanced");
    expect(state.currentCard?.flashcardId).toBe(ID.CARD_2);

    const refill = await state.rate("Again");
    expectOutcome(refill, "batch-loaded");
    expect(state.currentIndex).toBe(0);
    expect(state.currentCard?.flashcardId).toBe(ID.CARD_1);
    expect(state.revealed).toBe(false);

    expectOutcome(await state.rate("Easy"), "complete");
    expect(state.phase).toBe("complete");
    expect(state.submittedRatings).toStrictEqual(["Good", "Again", "Easy"]);
    expect(client.submitReview).toHaveBeenCalledTimes(3);
  });

  it("does not skip cards when the live queue would shrink", async ({
    expect,
  }) => {
    const client = makeClient();
    client.submitReview.mockResolvedValue({});

    const state = new ReviewSessionState(client, {
      initialCards: [
        makeCard(ID.CARD_1),
        makeCard(ID.CARD_2),
        makeCard(ID.CARD_3),
      ],
      sessionId: ID.SESSION,
      studySetId: ID.STUDY_SET,
    });

    expectOutcome(await state.rate("Easy"), "advanced");
    expect(state.currentCard?.flashcardId).toBe(ID.CARD_2);
    expectOutcome(await state.rate("Easy"), "advanced");
    expect(state.currentCard?.flashcardId).toBe(ID.CARD_3);
  });

  it("allows queue refresh retry without resubmitting the rated card", async ({
    expect,
  }) => {
    const client = makeClient();
    client.submitReview.mockResolvedValue({});
    client.getQueue
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(makeQueue([makeCard(ID.CARD_2)]))
      .mockResolvedValueOnce(makeQueue());

    const state = new ReviewSessionState(client, {
      initialCards: [makeCard(ID.CARD_1)],
      sessionId: ID.SESSION,
      studySetId: ID.STUDY_SET,
    });

    expectOutcome(await state.rate("Again"), "refresh-error");
    expect(state.phase).toBe("refresh-failed");
    expect(client.submitReview).toHaveBeenCalledTimes(1);

    expectOutcome(await state.retryQueue(), "batch-loaded");
    expect(state.currentCard?.flashcardId).toBe(ID.CARD_2);
    expectOutcome(await state.rate("Easy"), "complete");
    expect(client.submitReview).toHaveBeenCalledTimes(2);
  });

  it("blocks navigation and duplicate ratings while submitting", async ({
    expect,
  }) => {
    const client = makeClient();
    const { promise, resolve } = Promise.withResolvers<unknown>();
    client.submitReview.mockReturnValue(promise);

    const state = new ReviewSessionState(client, {
      initialCards: [makeCard(ID.CARD_1), makeCard(ID.CARD_2)],
      sessionId: ID.SESSION,
      studySetId: ID.STUDY_SET,
    });

    const firstRating = state.rate("Good");
    state.skip();
    state.prev();
    expectOutcome(await state.rate("Hard"), "ignored");
    expect(state.currentIndex).toBe(0);
    expect(client.submitReview).toHaveBeenCalledTimes(1);

    resolve({});
    expectOutcome(await firstRating, "advanced");
    expect(state.currentIndex).toBe(1);
  });

  it("keeps completion tied to an empty queue", async ({ expect }) => {
    const client = makeClient();
    client.submitReview.mockResolvedValue({});
    client.getQueue.mockResolvedValue(makeQueue([makeCard(ID.CARD_2)]));

    const state = new ReviewSessionState(client, {
      initialCards: [makeCard(ID.CARD_1)],
      sessionId: ID.SESSION,
      studySetId: ID.STUDY_SET,
    });

    expectOutcome(await state.rate("Easy"), "batch-loaded");
    expect(state.phase).toBe("reviewing");
    expect(state.currentCard?.flashcardId).toBe(ID.CARD_2);
  });
});
