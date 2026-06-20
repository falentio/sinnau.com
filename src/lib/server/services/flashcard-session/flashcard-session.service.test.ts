import { FLASHCARD_SESSION_NEW_CARDS_PER_DAY_DEFAULT } from "$lib/schemas/flashcard-session.constant";
import { ORPCError } from "@orpc/server";
import { describe, it } from "vitest";

import type { StudySet } from "../../infras/db/schema/study-set.ts";
import type { FlashcardSessionGuard } from "./flashcard-session.guard.ts";
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
      { date: "2026-01-01", count: 0 },
      { date: "2026-01-02", count: 0 },
      { date: "2026-01-03", count: 0 },
      { date: "2026-01-04", count: 0 },
      { date: "2026-01-05", count: 0 },
      { date: "2026-01-06", count: 0 },
      { date: "2026-01-07", count: 0 },
    ],
    dueToday: [],
    new: [],
    overdue: [],
  });
  repo.findSessionById.mockResolvedValue(null);
  repo.findSessionByUserAndStudySet.mockResolvedValue(null);
  repo.findStateByKey.mockResolvedValue(null);
  repo.listReviewsByStudySet.mockResolvedValue([]);
  repo.listSessionsForAdmin.mockResolvedValue([]);
  repo.listSessionsForUser.mockResolvedValue([]);
  // oxlint-disable-next-line require-await
  repo.insertSession.mockImplementation(async (row) =>
    createFlashcardSessionFixture({ ...row })
  );
  // oxlint-disable-next-line require-await
  repo.insertReview.mockImplementation(async (row) =>
    createFlashcardSessionReviewFixture({ ...row })
  );
  // oxlint-disable-next-line require-await
  repo.upsertState.mockImplementation(async (row) =>
    createFlashcardCardStateFixture({ ...row })
  );
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
  guard.assertFlashcardBelongsToStudySetOrValidationFailed.mockResolvedValue();

  const service = new FlashcardSessionService(
    repo as any,
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

const throwValidationFailed = (): never => {
  throw new ORPCError("VALIDATION_FAILED", { message: "Validation failed" });
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

    it("returns the existing session when one already exists", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      const existing = createFlashcardSessionFixture({
        id: "fse_existing",
        studySetId: SAMPLE_STUDY_SET_ID,
        userId: SAMPLE_USER_ID,
      });
      repo.findSessionByUserAndStudySet.mockResolvedValue(existing);

      const result = await service.getOrCreateSession(
        { studySetId: SAMPLE_STUDY_SET_ID },
        SAMPLE_USER_ID
      );
      expect(result).toBe(existing);
      expect(repo.insertSession).not.toHaveBeenCalled();
    });

    it("creates a new session when none exists", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findSessionByUserAndStudySet.mockResolvedValue(null);
      const created = createFlashcardSessionFixture({
        id: "fse_new",
        studySetId: SAMPLE_STUDY_SET_ID,
        userId: SAMPLE_USER_ID,
      });
      repo.insertSession.mockResolvedValue(created);

      const result = await service.getOrCreateSession(
        { studySetId: SAMPLE_STUDY_SET_ID },
        SAMPLE_USER_ID
      );
      expect(result).toBe(created);
      expect(repo.insertSession).toHaveBeenCalledWith(
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

    it("propagates VALIDATION_FAILED from assertFlashcardBelongsToStudySet", async ({
      expect,
    }) => {
      const { guard, service } = setupService();
      guard.assertFlashcardBelongsToStudySetOrValidationFailed.mockImplementation(
        throwValidationFailed
      );

      const error = await captureError(
        service.submitReview(
          { flashcardId, rating: "Good", sessionId },
          SAMPLE_USER_ID
        )
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "VALIDATION_FAILED" });
    });

    it("inserts a review, upserts state, and touches session on the happy path", async ({
      expect,
    }) => {
      const { repo, service } = setupService();

      const result = await service.submitReview(
        { flashcardId, rating: "Good", sessionId },
        SAMPLE_USER_ID
      );

      expect(result).toBeDefined();
      expect(result.rating).toBe("Good");
      expect(repo.insertReview).toHaveBeenCalled();
      expect(repo.upsertState).toHaveBeenCalled();
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
      expect(repo.insertReview).toHaveBeenCalled();
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

      expect(repo.upsertState).toHaveBeenCalled();
      const upsertedState = repo.upsertState.mock.calls[0]?.[0];
      expect(upsertedState?.introducedAt).toBeInstanceOf(Date);
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

      const upsertedState = repo.upsertState.mock.calls[0]?.[0];
      expect(upsertedState?.introducedAt).toBe(existingIntroducedAt);
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
            flashcardId: "flc_new",
            front: "new",
            back: "card",
            state: null,
          }),
        ],
        overdue: [
          createQueueFlashcardWithStateFixture({
            flashcardId: "flc_overdue",
            front: "over",
            back: "due",
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

    it("caps new cards at the daily limit", async ({ expect }) => {
      const { repo, service } = setupService();

      const newCards = Array.from({ length: 10 }, (_, i) =>
        createQueueFlashcardWithStateFixture({
          back: `back${i}`,
          flashcardId: `flc_new_${i}`,
          front: `new${i}`,
          state: null,
        })
      );

      repo.findFlashcardsForQueue.mockResolvedValue({
        dueIn7Days: [],
        dueToday: [],
        new: newCards,
        overdue: [],
      });
      repo.countIntroducedToday.mockResolvedValue(5);

      const result = await service.getReviewQueue(
        {
          newCardsPerDay: 8,
          studySetId: SAMPLE_STUDY_SET_ID,
        },
        SAMPLE_USER_ID
      );

      // 8 per day minus 5 already introduced = 3 remaining
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

      const error = await captureError(service.listSessions({}, null));
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
      repo.listSessionsForUser.mockResolvedValue(sessions);

      const result = await service.listSessions({}, SAMPLE_USER_ID);
      expect(result).toBe(sessions);
      expect(repo.listSessionsForUser).toHaveBeenCalledWith(SAMPLE_USER_ID);
    });
  });

  describe("adminListSessions", () => {
    it("passes filters through to the repository", async ({ expect }) => {
      const { repo, service } = setupService();
      const sessions = [createFlashcardSessionFixture({ id: "fse_1" })];
      repo.listSessionsForAdmin.mockResolvedValue(sessions);

      const result = await service.adminListSessions({
        studySetId: SAMPLE_STUDY_SET_ID,
        userId: SAMPLE_USER_ID,
      });
      expect(result).toBe(sessions);
      expect(repo.listSessionsForAdmin).toHaveBeenCalledWith({
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

      const result = await service.adminDeleteExpired({});
      expect(result).toEqual({ deletedCount: 2 });
      expect(repo.deleteExpiredSessions).toHaveBeenCalledExactlyOnceWith(
        expect.any(Number)
      );
    });
  });
});
