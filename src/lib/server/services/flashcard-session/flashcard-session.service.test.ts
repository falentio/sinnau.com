import { FLASHCARD_SESSION_NEW_CARDS_PER_DAY_DEFAULT } from "$lib/schemas/flashcard-session.constant";
import { ORPCError } from "@orpc/server";
import { describe, it } from "vitest";

import type { StudySet } from "../../infras/db/schema/study-set.ts";
import type { FlashcardSessionGuard } from "./flashcard-session.guard.ts";
import type { FlashcardSessionRepository } from "./flashcard-session.repository.ts";
import { FlashcardSessionService } from "./flashcard-session.service.ts";
import {
  captureError,
  createMockGuard,
  createMockRepository,
  createFlashcardSessionFixture,
  createFlashcardSessionReviewFixture,
  createFlashcardCardStateFixture,
  createQueueFlashcardWithStateFixture,
} from "./flashcard-session.testing.ts";

const SAMPLE_STUDY_SET_ID = "sst_000000000000000001";
const SAMPLE_USER_ID = "user-1";

const setupService = () => {
  const repo = createMockRepository();
  const guard = createMockGuard();

  repo.countIntroducedToday.mockResolvedValue(0);
  repo.deleteExpiredSessions.mockResolvedValue(0);
  repo.findFlashcardsForQueue.mockResolvedValue({
    dueIn7Days: [
      { count: 0, date: "2026-01-01" },
      { count: 0, date: "2026-01-02" },
      { count: 0, date: "2026-01-03" },
      { count: 0, date: "2026-01-04" },
      { count: 0, date: "2026-01-05" },
      { count: 0, date: "2026-01-06" },
      { count: 0, date: "2026-01-07" },
    ],
    dueToday: [],
    new: [],
    newLimitReached: false,
    overdue: [],
  });
  repo.findSessionById.mockResolvedValue(null);
  repo.findSessionByUserAndStudySet.mockResolvedValue(null);
  repo.findStateByKey.mockResolvedValue(null);
  repo.listReviewsByStudySet.mockResolvedValue([]);
  repo.listSessionsForAdmin.mockResolvedValue({
    data: [],
    pagination: { limit: 20, page: 1, total: 0, totalPages: 1 },
  });
  repo.listSessionsForUser.mockResolvedValue({
    data: [],
    pagination: { limit: 20, page: 1, total: 0, totalPages: 1 },
  });
  // oxlint-disable-next-line require-await
  repo.getOrCreateSession.mockImplementation(async (row) =>
    createFlashcardSessionFixture({ ...row })
  );
  // oxlint-disable-next-line require-await
  repo.insertReviewWithState.mockImplementation(async (params) => ({
    review: createFlashcardSessionReviewFixture({ ...params.review }),
    state: createFlashcardCardStateFixture({ ...params.state }),
  }));
  repo.updateSessionTouch.mockResolvedValue(
    createFlashcardSessionFixture({
      id: "fse_000000000000000001",
      userId: SAMPLE_USER_ID,
    })
  );

  const sampleStudySet = {
    createdAt: new Date(),
    deletedAt: null,
    description: null,
    files: [],
    id: SAMPLE_STUDY_SET_ID,
    ownerId: SAMPLE_USER_ID,
    slug: "sample-set",
    title: "Sample",
    updatedAt: new Date(),
    visibility: "PRIVATE",
  } satisfies StudySet;

  guard.requireUser.mockImplementation((id) => {
    // oxlint-disable-next-line typescript/strict-boolean-expressions
    if (!id) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Authentication is required",
      });
    }
    return id;
  });
  guard.assertStudySetVisibleOrNotFound.mockResolvedValue(sampleStudySet);
  guard.assertSessionOwnerOrNotFound.mockResolvedValue(
    createFlashcardSessionFixture({
      id: "fse_000000000000000001",
      userId: SAMPLE_USER_ID,
    })
  );
  guard.assertFlashcardBelongsToStudySetOrNotFound.mockResolvedValue({
    createdAt: new Date(),
    front: "front",
    hint: null,
    id: "flc_1",
    importance: 0,
    ownerId: SAMPLE_USER_ID,
    studySetId: SAMPLE_STUDY_SET_ID,
  } as never);

  // oxlint-disable-next-line no-unsafe-type-assertion
  const service = new FlashcardSessionService(
    // oxlint-disable-next-line no-unsafe-type-assertion
    repo as unknown as FlashcardSessionRepository,
    // oxlint-disable-next-line no-unsafe-type-assertion
    guard as unknown as FlashcardSessionGuard
  );
  return { guard, repo, service };
};

const throwUnauthorized = (): never => {
  throw new ORPCError("UNAUTHORIZED", {
    message: "Authentication is required",
  });
};

const throwNotFound = (): never => {
  throw new ORPCError("NOT_FOUND", { message: "Not found" });
};

describe.concurrent(FlashcardSessionService, () => {
  describe("getOrCreateSession", () => {
    it("propagates UNAUTHORIZED from requireUser", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.requireUser.mockImplementation(throwUnauthorized);

      const error = await captureError(
        service.getOrCreateSession({ studySetId: SAMPLE_STUDY_SET_ID }, null)
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "UNAUTHORIZED" });
      expect(guard.assertStudySetVisibleOrNotFound).not.toHaveBeenCalled();
    });

    it("propagates NOT_FOUND from assertStudySetVisibleOrNotFound", async ({
      expect,
    }) => {
      const { guard, service } = setupService();
      guard.assertStudySetVisibleOrNotFound.mockImplementation(throwNotFound);

      const error = await captureError(
        service.getOrCreateSession(
          { studySetId: SAMPLE_STUDY_SET_ID },
          SAMPLE_USER_ID
        )
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "NOT_FOUND" });
    });

    it("delegates to the repository and returns the session it produced", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      const session = createFlashcardSessionFixture({
        id: "fse_repo",
        studySetId: SAMPLE_STUDY_SET_ID,
        userId: SAMPLE_USER_ID,
      });
      repo.getOrCreateSession.mockResolvedValue(session);

      const result = await service.getOrCreateSession(
        { studySetId: SAMPLE_STUDY_SET_ID },
        SAMPLE_USER_ID
      );
      expect(result).toBe(session);
      expect(repo.getOrCreateSession).toHaveBeenCalledWith(
        expect.objectContaining({
          studySetId: SAMPLE_STUDY_SET_ID,
          userId: SAMPLE_USER_ID,
        })
      );
    });
  });

  describe("getSession", () => {
    it("propagates UNAUTHORIZED from requireUser", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.requireUser.mockImplementation(throwUnauthorized);

      const error = await captureError(
        service.getSession({ sessionId: "fse_000000000000000001" }, null)
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("returns the session returned by the guard", async ({ expect }) => {
      const { guard, service } = setupService();
      const session = createFlashcardSessionFixture({
        id: "fse_000000000000000001",
        userId: SAMPLE_USER_ID,
      });
      guard.assertSessionOwnerOrNotFound.mockResolvedValue(session);

      const result = await service.getSession(
        { sessionId: session.id },
        SAMPLE_USER_ID
      );
      expect(result).toBe(session);
      expect(guard.assertSessionOwnerOrNotFound).toHaveBeenCalledWith(
        session.id,
        SAMPLE_USER_ID
      );
    });
  });

  describe("submitReview", () => {
    const sessionId = "fse_000000000000000001";
    const flashcardId = "flc_000000000000000001";

    it("propagates UNAUTHORIZED from requireUser", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.requireUser.mockImplementation(throwUnauthorized);

      const error = await captureError(
        service.submitReview({ flashcardId, rating: "Good", sessionId }, null)
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "UNAUTHORIZED" });
      expect(guard.assertSessionOwnerOrNotFound).not.toHaveBeenCalled();
    });

    it("propagates NOT_FOUND from assertSessionOwnerOrNotFound", async ({
      expect,
    }) => {
      const { guard, service } = setupService();
      guard.assertSessionOwnerOrNotFound.mockImplementation(throwNotFound);

      const error = await captureError(
        service.submitReview(
          { flashcardId, rating: "Good", sessionId },
          SAMPLE_USER_ID
        )
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "NOT_FOUND" });
    });

    it("propagates NOT_FOUND from assertFlashcardBelongsToStudySet", async ({
      expect,
    }) => {
      const { guard, service } = setupService();
      guard.assertFlashcardBelongsToStudySetOrNotFound.mockImplementation(
        throwNotFound
      );

      const error = await captureError(
        service.submitReview(
          { flashcardId, rating: "Good", sessionId },
          SAMPLE_USER_ID
        )
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "NOT_FOUND" });
    });

    it("inserts a review atomically with state and touches the session", async ({
      expect,
    }) => {
      const { repo, service } = setupService();

      const result = await service.submitReview(
        { flashcardId, rating: "Good", sessionId },
        SAMPLE_USER_ID
      );

      expect(result).toBeDefined();
      expect(result.rating).toBe("Good");
      expect(repo.insertReviewWithState).toHaveBeenCalledTimes(1);
      expect(repo.updateSessionTouch).toHaveBeenCalledWith(
        sessionId,
        SAMPLE_USER_ID
      );
    });

    it("reads existing FSRS state before computing the next state", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findStateByKey.mockResolvedValue(
        createFlashcardCardStateFixture({
          flashcardId,
          reps: 5,
          state: "Review",
          userId: SAMPLE_USER_ID,
        })
      );

      const result = await service.submitReview(
        { flashcardId, rating: "Hard", sessionId },
        SAMPLE_USER_ID
      );

      expect(result).toBeDefined();
      expect(repo.findStateByKey).toHaveBeenCalledWith(
        SAMPLE_USER_ID,
        flashcardId
      );
      expect(repo.insertReviewWithState).toHaveBeenCalledTimes(1);
    });

    it("sets introducedAt on first review of a new card", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findStateByKey.mockResolvedValue(null);

      await service.submitReview(
        { flashcardId, rating: "Good", sessionId },
        SAMPLE_USER_ID
      );

      expect(repo.insertReviewWithState).toHaveBeenCalledTimes(1);
      const inserted = repo.insertReviewWithState.mock.calls[0]?.[0];
      expect(inserted?.state?.introducedAt).toBeInstanceOf(Date);
    });

    it("preserves introducedAt on subsequent reviews", async ({ expect }) => {
      const { repo, service } = setupService();
      const existingIntroducedAt = new Date("2026-01-01");
      repo.findStateByKey.mockResolvedValue(
        createFlashcardCardStateFixture({
          flashcardId,
          introducedAt: existingIntroducedAt,
          reps: 5,
          state: "Review",
          userId: SAMPLE_USER_ID,
        })
      );

      await service.submitReview(
        { flashcardId, rating: "Again", sessionId },
        SAMPLE_USER_ID
      );

      const inserted = repo.insertReviewWithState.mock.calls[0]?.[0];
      expect(inserted?.state?.introducedAt).toBe(existingIntroducedAt);
    });

    it("persists all nine pre-snapshot fields on the review row", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      const reviewedAt = new Date("2026-02-01");
      repo.findStateByKey.mockResolvedValue(
        createFlashcardCardStateFixture({
          flashcardId,
          introducedAt: new Date("2026-01-01"),
          lastReview: reviewedAt,
          reps: 5,
          state: "Review",
          userId: SAMPLE_USER_ID,
        })
      );

      const result = await service.submitReview(
        { flashcardId, rating: "Good", sessionId },
        SAMPLE_USER_ID
      );

      expect(result.preState).toBe("Review");
      expect(result.preStability).toBeGreaterThan(0);
      expect(result.preDifficulty).toBeGreaterThan(0);
      expect(result.preDue).toBeInstanceOf(Date);
      expect(result.preLastReview).toBeInstanceOf(Date);
      expect(typeof result.preReps).toBe("number");
      expect(typeof result.preLapses).toBe("number");
      expect(typeof result.preScheduledDays).toBe("number");
      expect(typeof result.preLearningSteps).toBe("number");
    });

    it("persists preLastReview as null when the card has no prior review", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findStateByKey.mockResolvedValue(
        createFlashcardCardStateFixture({
          flashcardId,
          introducedAt: new Date("2026-01-01"),
          lastReview: null,
          reps: 5,
          state: "Review",
          userId: SAMPLE_USER_ID,
        })
      );

      const result = await service.submitReview(
        { flashcardId, rating: "Good", sessionId },
        SAMPLE_USER_ID
      );

      expect(result.preLastReview).toBeNull();
    });
  });

  describe("getReviewQueue", () => {
    it("propagates UNAUTHORIZED from requireUser", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.requireUser.mockImplementation(throwUnauthorized);

      const error = await captureError(
        service.getReviewQueue(
          { newCardsPerDay: 20, studySetId: SAMPLE_STUDY_SET_ID },
          null
        )
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("propagates NOT_FOUND when study set is not visible", async ({
      expect,
    }) => {
      const { guard, service } = setupService();
      guard.assertStudySetVisibleOrNotFound.mockImplementation(throwNotFound);

      const error = await captureError(
        service.getReviewQueue(
          { newCardsPerDay: 20, studySetId: SAMPLE_STUDY_SET_ID },
          SAMPLE_USER_ID
        )
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "NOT_FOUND" });
    });

    it("returns an empty queue when there are no flashcards", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findFlashcardsForQueue.mockResolvedValue({
        dueIn7Days: [],
        dueToday: [],
        new: [],
        newLimitReached: false,
        overdue: [],
      });

      const result = await service.getReviewQueue(
        { newCardsPerDay: 20, studySetId: SAMPLE_STUDY_SET_ID },
        SAMPLE_USER_ID
      );
      expect(result.overdue).toEqual([]);
      expect(result.dueToday).toEqual([]);
      expect(result.new).toEqual([]);
      expect(result.newLimitReached).toBe(false);
    });

    it("returns classified cards from the repository", async ({ expect }) => {
      const { repo, service } = setupService();

      repo.findFlashcardsForQueue.mockResolvedValue({
        dueIn7Days: [],
        dueToday: [],
        new: [
          createQueueFlashcardWithStateFixture({
            back: "card",
            flashcardId: "flc_new",
            front: "new",
            state: null,
          }),
        ],
        newLimitReached: false,
        overdue: [
          createQueueFlashcardWithStateFixture({
            back: "due",
            flashcardId: "flc_overdue",
            front: "over",
            state: createFlashcardCardStateFixture({
              flashcardId: "flc_overdue",
              state: "Review",
            }),
          }),
        ],
      });
      repo.countIntroducedToday.mockResolvedValue(0);

      const result = await service.getReviewQueue(
        {
          newCardsPerDay: FLASHCARD_SESSION_NEW_CARDS_PER_DAY_DEFAULT,
          studySetId: SAMPLE_STUDY_SET_ID,
        },
        SAMPLE_USER_ID
      );

      expect(result.overdue).toHaveLength(1);
      expect(result.overdue[0]?.flashcardId).toBe("flc_overdue");
      expect(result.new).toHaveLength(1);
      expect(result.new[0]?.flashcardId).toBe("flc_new");
      expect(result.newLimitReached).toBe(false);
    });

    it("caps new cards at the daily limit (SQL-side cap, service just maps)", async ({
      expect,
    }) => {
      const { repo, service } = setupService();

      const newCards = Array.from({ length: 3 }, (_, i) =>
        createQueueFlashcardWithStateFixture({
          back: `back${i}`,
          flashcardId: `flc_new_${i}`,
          front: `new${i}`,
          state: null,
        })
      );

      repo.countIntroducedToday.mockResolvedValue(5);
      repo.findFlashcardsForQueue.mockResolvedValue({
        dueIn7Days: [],
        dueToday: [],
        new: newCards,
        newLimitReached: true,
        overdue: [],
      });

      const result = await service.getReviewQueue(
        {
          newCardsPerDay: 8,
          studySetId: SAMPLE_STUDY_SET_ID,
        },
        SAMPLE_USER_ID
      );

      // 8 per day minus 5 already introduced = 3 remaining; repo applies the cap
      expect(repo.findFlashcardsForQueue).toHaveBeenCalledWith(
        expect.objectContaining({ newLimit: 3 })
      );
      expect(result.new).toHaveLength(3);
      expect(result.newLimitReached).toBe(true);
    });

    it("returns newLimitReached=false when all new cards fit within the daily cap", async ({
      expect,
    }) => {
      const { repo, service } = setupService();

      repo.findFlashcardsForQueue.mockResolvedValue({
        dueIn7Days: [],
        dueToday: [],
        new: [
          createQueueFlashcardWithStateFixture({ state: null }),
          createQueueFlashcardWithStateFixture({ state: null }),
        ],
        newLimitReached: false,
        overdue: [],
      });
      repo.countIntroducedToday.mockResolvedValue(0);

      const result = await service.getReviewQueue(
        { newCardsPerDay: 20, studySetId: SAMPLE_STUDY_SET_ID },
        SAMPLE_USER_ID
      );

      expect(result.new).toHaveLength(2);
      expect(result.newLimitReached).toBe(false);
    });
  });

  describe("listReviews", () => {
    it("propagates UNAUTHORIZED from requireUser", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.requireUser.mockImplementation(throwUnauthorized);

      const error = await captureError(
        service.listReviews(
          { limit: 50, studySetId: SAMPLE_STUDY_SET_ID },
          null
        )
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("returns reviews from the repository", async ({ expect }) => {
      const { repo, service } = setupService();
      const reviews = [
        createFlashcardSessionReviewFixture({ id: "fsr_1" }),
        createFlashcardSessionReviewFixture({ id: "fsr_2" }),
      ];
      repo.listReviewsByStudySet.mockResolvedValue(reviews);

      const result = await service.listReviews(
        { limit: 50, studySetId: SAMPLE_STUDY_SET_ID },
        SAMPLE_USER_ID
      );
      expect(result).toBe(reviews);
      expect(repo.listReviewsByStudySet).toHaveBeenCalledWith({
        limit: 50,
        studySetId: SAMPLE_STUDY_SET_ID,
        userId: SAMPLE_USER_ID,
      });
    });
  });

  describe("listSessions", () => {
    it("propagates UNAUTHORIZED from requireUser", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.requireUser.mockImplementation(throwUnauthorized);

      const error = await captureError(service.listSessions(undefined, null));
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("returns the user's sessions from the repository", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      const sessions = [
        createFlashcardSessionFixture({ id: "fse_1" }),
        createFlashcardSessionFixture({ id: "fse_2" }),
      ];
      const result = {
        data: sessions,
        pagination: { limit: 20, page: 1, total: 2, totalPages: 1 },
      };
      repo.listSessionsForUser.mockResolvedValue(result);

      const returned = await service.listSessions(undefined, SAMPLE_USER_ID);
      expect(returned).toBe(result);
      expect(repo.listSessionsForUser).toHaveBeenCalledWith(
        SAMPLE_USER_ID,
        1,
        20
      );
    });
  });

  describe("adminListSessions", () => {
    it("throws VALIDATION_FAILED when neither userId nor studySetId is provided", async ({
      expect,
    }) => {
      const { service } = setupService();
      const error = await captureError(service.adminListSessions({}));
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "VALIDATION_FAILED" });
    });

    it("passes filters through to the repository", async ({ expect }) => {
      const { repo, service } = setupService();
      const sessions = [createFlashcardSessionFixture({ id: "fse_1" })];
      const result = {
        data: sessions,
        pagination: { limit: 20, page: 1, total: 1, totalPages: 1 },
      };
      repo.listSessionsForAdmin.mockResolvedValue(result);

      const returned = await service.adminListSessions({
        studySetId: SAMPLE_STUDY_SET_ID,
        userId: SAMPLE_USER_ID,
      });
      expect(returned).toBe(result);
      expect(repo.listSessionsForAdmin).toHaveBeenCalledWith({
        limit: 20,
        page: 1,
        studySetId: SAMPLE_STUDY_SET_ID,
        userId: SAMPLE_USER_ID,
      });
    });
  });

  describe("adminDeleteExpired", () => {
    it("passes a TTL-based cutoff timestamp to the repository and reports the deleted count", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.deleteExpiredSessions.mockResolvedValue(2);

      const result = await service.adminDeleteExpired();
      expect(result).toEqual({ deletedCount: 2 });
      expect(repo.deleteExpiredSessions).toHaveBeenCalledExactlyOnceWith(
        expect.any(Number)
      );
    });
  });
});
