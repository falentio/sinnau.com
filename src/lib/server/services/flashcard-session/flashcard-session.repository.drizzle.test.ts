import { FLASHCARD_ID_PREFIX } from "$lib/schemas/flashcard";
import { FLASHCARD_SESSION_ID_PREFIX } from "$lib/schemas/flashcard-session.constant";
import { user } from "$lib/server/infras/db/schema/auth-schema";
import { flashcard } from "$lib/server/infras/db/schema/flashcard";
import {
  flashcardSession,
  flashcardState,
} from "$lib/server/infras/db/schema/flashcard-session";
import { eq } from "drizzle-orm";
import { describe, it } from "vitest";

import { sleep } from "../../infras/db/testing.ts";
import { generateId } from "../../utils/nanoid.ts";
import {
  captureError,
  FlashcardSessionTestEnv,
} from "./flashcard-session.testing.ts";

describe("FlashcardSessionDrizzleRepository", () => {
  describe("findSessionById", () => {
    it("returns null for a non-existent session", async ({ expect }) => {
      await using env = new FlashcardSessionTestEnv();
      const result = await env.repo.findSessionById("missing");
      expect(result).toBeNull();
    });

    it("returns the session when it exists", async ({ expect }) => {
      await using env = new FlashcardSessionTestEnv();
      const seeded = env.seedSession({ userId: env.ownerId });

      const result = await env.repo.findSessionById(seeded.id);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(seeded.id);
      expect(result?.userId).toBe(env.ownerId);
    });
  });

  describe("findSessionByUserAndStudySet", () => {
    it("returns null when no session exists", async ({ expect }) => {
      await using env = new FlashcardSessionTestEnv();
      const result = await env.repo.findSessionByUserAndStudySet(
        env.ownerId,
        "missing"
      );
      expect(result).toBeNull();
    });

    it("returns the session matching both userId and studySetId", async ({
      expect,
    }) => {
      await using env = new FlashcardSessionTestEnv();
      const ss = env.seedStudySet({ ownerId: env.ownerId });
      const seeded = env.seedSession({
        studySetId: ss.id,
        userId: env.ownerId,
      });

      const result = await env.repo.findSessionByUserAndStudySet(
        env.ownerId,
        ss.id
      );
      expect(result?.id).toBe(seeded.id);
    });
  });

  describe("listSessionsForUser", () => {
    it("returns only the user's sessions", async ({ expect }) => {
      await using env = new FlashcardSessionTestEnv();
      const otherUser = env.seedUser({ name: "Other" });
      const ss = env.seedStudySet({ ownerId: env.ownerId });
      const ss2 = env.seedStudySet({ ownerId: otherUser });
      env.seedSession({ studySetId: ss.id, userId: env.ownerId });
      env.seedSession({ studySetId: ss2.id, userId: otherUser });

      const result = await env.repo.listSessionsForUser(env.ownerId, 1, 20);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.userId).toBe(env.ownerId);
      expect(result.pagination.total).toBe(1);
    });

    it("paginates results with page and limit", async ({ expect }) => {
      await using env = new FlashcardSessionTestEnv();
      for (let i = 0; i < 5; i += 1) {
        const ss = env.seedStudySet({ ownerId: env.ownerId });
        env.seedSession({ studySetId: ss.id, userId: env.ownerId });
      }

      const first = await env.repo.listSessionsForUser(env.ownerId, 1, 2);
      expect(first.data).toHaveLength(2);
      expect(first.pagination).toEqual({
        limit: 2,
        page: 1,
        total: 5,
        totalPages: 3,
      });

      const third = await env.repo.listSessionsForUser(env.ownerId, 3, 2);
      expect(third.data).toHaveLength(1);
    });
  });

  describe("listSessionsForAdmin", () => {
    it("returns all matching sessions when filters are provided", async ({
      expect,
    }) => {
      await using env = new FlashcardSessionTestEnv();
      const other = env.seedUser({ name: "Other" });
      const ss = env.seedStudySet({ ownerId: env.ownerId });
      const ss2 = env.seedStudySet({ ownerId: other });
      env.seedSession({ studySetId: ss.id, userId: env.ownerId });
      env.seedSession({ studySetId: ss2.id, userId: other });

      const results = await env.repo.listSessionsForAdmin({
        limit: 20,
        page: 1,
        userId: env.ownerId,
      });
      expect(results.data).toHaveLength(1);
    });

    it("filters by studySetId", async ({ expect }) => {
      await using env = new FlashcardSessionTestEnv();
      const ss = env.seedStudySet({ ownerId: env.ownerId });
      env.seedSession({ studySetId: ss.id, userId: env.ownerId });

      const results = await env.repo.listSessionsForAdmin({
        limit: 20,
        page: 1,
        studySetId: ss.id,
      });
      expect(results.data).toHaveLength(1);
    });
  });

  describe("getOrCreateSession", () => {
    it("persists a new session when none exists", async ({ expect }) => {
      await using env = new FlashcardSessionTestEnv();
      const ss = env.seedStudySet({ ownerId: env.ownerId });
      const before = Date.now();

      const result = await env.repo.getOrCreateSession({
        studySetId: ss.id,
        userId: env.ownerId,
      });

      const after = Date.now();
      expect(result.id).toMatch(/^fse_/);
      expect(result.createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.createdAt.getTime()).toBeLessThanOrEqual(after);
    });

    it("returns the existing session on conflict (no duplicate row)", async ({
      expect,
    }) => {
      await using env = new FlashcardSessionTestEnv();
      const ss = env.seedStudySet({ ownerId: env.ownerId });
      const first = await env.repo.getOrCreateSession({
        studySetId: ss.id,
        userId: env.ownerId,
      });

      const second = await env.repo.getOrCreateSession({
        studySetId: ss.id,
        userId: env.ownerId,
      });

      expect(second.id).toBe(first.id);
      const all = await env.repo.listSessionsForUser(env.ownerId, 1, 20);
      expect(all.data).toHaveLength(1);
    });

    it("serializes concurrent getOrCreateSession calls into a single row", async ({
      expect,
    }) => {
      await using env = new FlashcardSessionTestEnv();
      const ss = env.seedStudySet({ ownerId: env.ownerId });

      const [a, b, c] = await Promise.all([
        env.repo.getOrCreateSession({
          studySetId: ss.id,
          userId: env.ownerId,
        }),
        env.repo.getOrCreateSession({
          studySetId: ss.id,
          userId: env.ownerId,
        }),
        env.repo.getOrCreateSession({
          studySetId: ss.id,
          userId: env.ownerId,
        }),
      ]);

      expect(a.id).toBe(b.id);
      expect(b.id).toBe(c.id);
      const all = await env.repo.listSessionsForUser(env.ownerId, 1, 20);
      expect(all.data).toHaveLength(1);
    });
  });

  describe("updateSessionTouch", () => {
    it("updates the updatedAt field", async ({ expect }) => {
      await using env = new FlashcardSessionTestEnv();
      const seeded = env.seedSession({ userId: env.ownerId });
      const originalUpdatedAt = seeded.updatedAt.getTime();

      // oxlint-disable-next-line promise/avoid-new
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 10);
      });
      const updated = await env.repo.updateSessionTouch(seeded.id, env.ownerId);

      expect(updated).not.toBeNull();
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt);
    });

    it("returns null when the session does not exist", async ({ expect }) => {
      await using env = new FlashcardSessionTestEnv();
      const result = await env.repo.updateSessionTouch("missing", "user-1");
      expect(result).toBeNull();
    });
  });

  describe("deleteExpiredSessions", () => {
    it("deletes only sessions with updatedAt before the cutoff", async ({
      expect,
    }) => {
      await using env = new FlashcardSessionTestEnv();
      const ss = env.seedStudySet({ ownerId: env.ownerId });
      const oldSs = env.seedStudySet({ ownerId: env.ownerId });
      const now = Date.now();
      env.seedSession({ studySetId: ss.id, userId: env.ownerId });

      const oldId = generateId(FLASHCARD_SESSION_ID_PREFIX);
      env.db
        .insert(flashcardSession)
        .values({
          createdAt: new Date(now - 86_400_000 * 100),
          id: oldId,
          studySetId: oldSs.id,
          updatedAt: new Date(now - 86_400_000 * 100),
          userId: env.ownerId,
        })
        .run();

      const deleted = await env.repo.deleteExpiredSessions(
        now - 86_400_000 * 90
      );
      expect(deleted).toBe(1);

      const remaining = await env.repo.listSessionsForUser(env.ownerId, 1, 20);
      expect(remaining.data).toHaveLength(1);
    });

    it("deletes orphan flashcard_state rows owned by expired sessions", async ({
      expect,
    }) => {
      await using env = new FlashcardSessionTestEnv();
      const oldSs = env.seedStudySet({ ownerId: env.ownerId });
      const fc = env.seedFlashcard({
        ownerId: env.ownerId,
        studySetId: oldSs.id,
      });
      const now = Date.now();
      env.seedFlashcardState({
        difficulty: 5,
        due: new Date(now + 86_400_000),
        elapsedDays: 0,
        flashcardId: fc.id,
        introducedAt: new Date(),
        lapses: 0,
        lastReview: null,
        learningSteps: 0,
        reps: 0,
        scheduledDays: 0,
        stability: 2.5,
        state: "New",
        updatedAt: new Date(),
        userId: env.ownerId,
      });

      const oldId = generateId(FLASHCARD_SESSION_ID_PREFIX);
      env.db
        .insert(flashcardSession)
        .values({
          createdAt: new Date(now - 86_400_000 * 100),
          id: oldId,
          studySetId: oldSs.id,
          updatedAt: new Date(now - 86_400_000 * 100),
          userId: env.ownerId,
        })
        .run();

      const deleted = await env.repo.deleteExpiredSessions(
        now - 86_400_000 * 90
      );
      expect(deleted).toBe(1);

      const remainingState = env.db
        .select()
        .from(flashcardState)
        .where(eq(flashcardState.flashcardId, fc.id))
        .all();
      expect(remainingState).toHaveLength(0);
    });
  });

  describe("insertReviewWithState", () => {
    it("persists a review row with all pre-snapshot fields", async ({
      expect,
    }) => {
      await using env = new FlashcardSessionTestEnv();
      const ss = env.seedStudySet({ ownerId: env.ownerId });
      const seededSession = env.seedSession({
        studySetId: ss.id,
        userId: env.ownerId,
      });
      const seededFlashcard = env.seedFlashcard({
        ownerId: env.ownerId,
        studySetId: ss.id,
      });
      const reviewedAt = new Date();

      const { review } = await env.repo.insertReviewWithState({
        review: {
          flashcardId: seededFlashcard.id,
          preDifficulty: 5,
          preDue: new Date(),
          preLapses: 0,
          preLastReview: null,
          preLearningSteps: 0,
          preReps: 0,
          preScheduledDays: 0,
          preStability: 2.5,
          preState: "New",
          rating: "Good",
          reviewedAt,
          sessionId: seededSession.id,
        },
        state: {
          difficulty: 5,
          due: new Date(),
          elapsedDays: 0,
          flashcardId: seededFlashcard.id,
          introducedAt: reviewedAt,
          lapses: 0,
          lastReview: reviewedAt,
          learningSteps: 0,
          reps: 1,
          scheduledDays: 0,
          stability: 2.5,
          state: "Review",
          updatedAt: reviewedAt,
          userId: env.ownerId,
        },
      });

      expect(review.id).toMatch(/^fsr_/u);
      expect(review.rating).toBe("Good");
      expect(review.flashcardId).toBe(seededFlashcard.id);
      expect(review.preState).toBe("New");
    });

    it("is atomic — a state FK failure rolls back the review insert", async ({
      expect,
    }) => {
      await using env = new FlashcardSessionTestEnv();
      const ss = env.seedStudySet({ ownerId: env.ownerId });
      const seededSession = env.seedSession({
        studySetId: ss.id,
        userId: env.ownerId,
      });
      const fc = env.seedFlashcard({
        ownerId: env.ownerId,
        studySetId: ss.id,
      });

      const err = await captureError(
        env.repo.insertReviewWithState({
          review: {
            flashcardId: fc.id,
            preDifficulty: 5,
            preDue: new Date(),
            preLapses: 0,
            preLastReview: null,
            preLearningSteps: 0,
            preReps: 0,
            preScheduledDays: 0,
            preStability: 2.5,
            preState: "New",
            rating: "Good",
            reviewedAt: new Date(),
            sessionId: seededSession.id,
          },
          state: {
            difficulty: 5,
            due: new Date(),
            elapsedDays: 0,
            flashcardId: `${FLASHCARD_ID_PREFIX}does-not-exist`,
            introducedAt: new Date(),
            lapses: 0,
            lastReview: null,
            learningSteps: 0,
            reps: 0,
            scheduledDays: 0,
            stability: 2.5,
            state: "New",
            updatedAt: new Date(),
            userId: env.ownerId,
          },
        })
      );
      expect(err).not.toBeNull();

      const reviews = await env.repo.listReviewsByStudySet({
        limit: 50,
        studySetId: ss.id,
        userId: env.ownerId,
      });
      expect(reviews).toHaveLength(0);
    });
  });

  describe("findStateByKey", () => {
    it("returns null when no state exists for the (userId, flashcardId) pair", async ({
      expect,
    }) => {
      await using env = new FlashcardSessionTestEnv();
      const result = await env.repo.findStateByKey(env.ownerId, "missing");
      expect(result).toBeNull();
    });

    it("retrieves an existing state for the (userId, flashcardId) pair", async ({
      expect,
    }) => {
      await using env = new FlashcardSessionTestEnv();
      const ss = env.seedStudySet({ ownerId: env.ownerId });
      const fc = env.seedFlashcard({
        ownerId: env.ownerId,
        studySetId: ss.id,
      });
      const due = new Date(Date.now() + 86_400_000);
      env.seedFlashcardState({
        difficulty: 5,
        due,
        elapsedDays: 0,
        flashcardId: fc.id,
        introducedAt: new Date(),
        lapses: 0,
        lastReview: null,
        learningSteps: 0,
        reps: 0,
        scheduledDays: 0,
        stability: 2.5,
        state: "New",
        updatedAt: new Date(),
        userId: env.ownerId,
      });

      const found = await env.repo.findStateByKey(env.ownerId, fc.id);
      expect(found).not.toBeNull();
      expect(found?.stability).toBe(2.5);
      expect(found?.introducedAt).not.toBeNull();
      expect(found?.due.getTime()).toBe(due.getTime());
    });
  });

  describe("findFlashcardsForQueue", () => {
    it("classifies flashcards into overdue, due-today, new buckets", async ({
      expect,
    }) => {
      await using env = new FlashcardSessionTestEnv();
      const ss = env.seedStudySet({ ownerId: env.ownerId });
      const now = Date.now();

      const fcOverdue = env.seedFlashcard({
        front: "overdue",
        ownerId: env.ownerId,
        studySetId: ss.id,
      });
      const fcNew = env.seedFlashcard({
        front: "new",
        ownerId: env.ownerId,
        studySetId: ss.id,
      });
      const fcDueToday = env.seedFlashcard({
        front: "due-today",
        ownerId: env.ownerId,
        studySetId: ss.id,
      });

      // Overdue: due 2 days in the past
      env.seedFlashcardState({
        difficulty: 5,
        due: new Date(now - 2 * 86_400_000),
        elapsedDays: 0,
        flashcardId: fcOverdue.id,
        introducedAt: new Date(now - 3 * 86_400_000),
        lapses: 0,
        lastReview: null,
        learningSteps: 0,
        reps: 1,
        scheduledDays: 0,
        stability: 2.5,
        state: "Review",
        updatedAt: new Date(),
        userId: env.ownerId,
      });

      // Due-today: due in 1 hour
      env.seedFlashcardState({
        difficulty: 5,
        due: new Date(now + 3_600_000),
        elapsedDays: 0,
        flashcardId: fcDueToday.id,
        introducedAt: new Date(now - 1 * 86_400_000),
        lapses: 0,
        lastReview: null,
        learningSteps: 0,
        reps: 1,
        scheduledDays: 0,
        stability: 2.5,
        state: "Review",
        updatedAt: new Date(),
        userId: env.ownerId,
      });

      const result = await env.repo.findFlashcardsForQueue({
        dueIn7DaysMs: 7 * 86_400_000,
        horizonMs: 86_400_000,
        newLimit: 20,
        now,
        studySetId: ss.id,
        userId: env.ownerId,
      });

      expect(result.overdue).toHaveLength(1);
      expect(result.overdue[0]?.flashcardId).toBe(fcOverdue.id);
      expect(result.dueToday).toHaveLength(1);
      expect(result.dueToday[0]?.flashcardId).toBe(fcDueToday.id);
      expect(result.new).toHaveLength(1);
      expect(result.new[0]?.flashcardId).toBe(fcNew.id);
    });

    it("returns empty buckets when there are no flashcards", async ({
      expect,
    }) => {
      await using env = new FlashcardSessionTestEnv();
      const ss = env.seedStudySet({ ownerId: env.ownerId });

      const result = await env.repo.findFlashcardsForQueue({
        dueIn7DaysMs: 7 * 86_400_000,
        horizonMs: 86_400_000,
        newLimit: 20,
        now: Date.now(),
        studySetId: ss.id,
        userId: env.ownerId,
      });

      expect(result.overdue).toEqual([]);
      expect(result.dueToday).toEqual([]);
      expect(result.new).toEqual([]);
      expect(result.dueIn7Days).toHaveLength(7);
    });

    it("returns 7-day per-day count array keyed by UTC date", async ({
      expect,
    }) => {
      await using env = new FlashcardSessionTestEnv();
      const ss = env.seedStudySet({ ownerId: env.ownerId });
      const now = Date.now();
      const nowUtc = new Date(now);
      const twoDaysLater = new Date(
        Date.UTC(
          nowUtc.getUTCFullYear(),
          nowUtc.getUTCMonth(),
          nowUtc.getUTCDate() + 2
        )
      );
      const twoDaysStr = twoDaysLater.toISOString().slice(0, 10);

      const fc = env.seedFlashcard({
        ownerId: env.ownerId,
        studySetId: ss.id,
      });
      env.seedFlashcardState({
        difficulty: 5,
        due: twoDaysLater,
        elapsedDays: 0,
        flashcardId: fc.id,
        introducedAt: new Date(now - 1 * 86_400_000),
        lapses: 0,
        lastReview: null,
        learningSteps: 0,
        reps: 1,
        scheduledDays: 0,
        stability: 2.5,
        state: "Review",
        updatedAt: new Date(),
        userId: env.ownerId,
      });

      const result = await env.repo.findFlashcardsForQueue({
        dueIn7DaysMs: 7 * 86_400_000,
        horizonMs: 86_400_000,
        newLimit: 20,
        now,
        studySetId: ss.id,
        userId: env.ownerId,
      });

      expect(result.dueIn7Days).toHaveLength(7);
      const expectedDates: string[] = [];
      for (let i = 1; i <= 7; i += 1) {
        const d = new Date(
          Date.UTC(
            nowUtc.getUTCFullYear(),
            nowUtc.getUTCMonth(),
            nowUtc.getUTCDate() + i
          )
        );
        expectedDates.push(d.toISOString().slice(0, 10));
      }
      expect(result.dueIn7Days.map((d) => d.date)).toEqual(expectedDates);
      const day2 = result.dueIn7Days.find((d) => d.date === twoDaysStr);
      expect(day2?.count).toBe(1);
    });

    it("orders overdue by due ASC and new by createdAt ASC", async ({
      expect,
    }) => {
      await using env = new FlashcardSessionTestEnv();
      const ss = env.seedStudySet({ ownerId: env.ownerId });
      const now = Date.now();

      const fc1 = env.seedFlashcard({
        front: "oldest-new",
        ownerId: env.ownerId,
        studySetId: ss.id,
      });
      await sleep(2);
      const fc2 = env.seedFlashcard({
        front: "newest-new",
        ownerId: env.ownerId,
        studySetId: ss.id,
      });
      const fcOld = env.seedFlashcard({
        front: "oldest-overdue",
        ownerId: env.ownerId,
        studySetId: ss.id,
      });
      const fcRecent = env.seedFlashcard({
        front: "newest-overdue",
        ownerId: env.ownerId,
        studySetId: ss.id,
      });

      env.seedFlashcardState({
        difficulty: 5,
        due: new Date(now - 3 * 86_400_000),
        elapsedDays: 0,
        flashcardId: fcOld.id,
        introducedAt: new Date(now - 5 * 86_400_000),
        lapses: 0,
        lastReview: null,
        learningSteps: 0,
        reps: 1,
        scheduledDays: 0,
        stability: 2.5,
        state: "Review",
        updatedAt: new Date(),
        userId: env.ownerId,
      });
      env.seedFlashcardState({
        difficulty: 5,
        due: new Date(now - 1 * 86_400_000),
        elapsedDays: 0,
        flashcardId: fcRecent.id,
        introducedAt: new Date(now - 2 * 86_400_000),
        lapses: 0,
        lastReview: null,
        learningSteps: 0,
        reps: 1,
        scheduledDays: 0,
        stability: 2.5,
        state: "Review",
        updatedAt: new Date(),
        userId: env.ownerId,
      });

      const result = await env.repo.findFlashcardsForQueue({
        dueIn7DaysMs: 7 * 86_400_000,
        horizonMs: 86_400_000,
        newLimit: 20,
        now,
        studySetId: ss.id,
        userId: env.ownerId,
      });

      expect(result.overdue.map((r) => r.flashcardId)).toEqual([
        fcOld.id,
        fcRecent.id,
      ]);
      expect(result.new.map((r) => r.flashcardId)).toEqual([fc1.id, fc2.id]);
    });
  });

  describe("countIntroducedToday", () => {
    it("counts states introduced since the given date", async ({ expect }) => {
      await using env = new FlashcardSessionTestEnv();
      const ss = env.seedStudySet({ ownerId: env.ownerId });
      const fc = env.seedFlashcard({
        ownerId: env.ownerId,
        studySetId: ss.id,
      });

      env.seedFlashcardState({
        difficulty: 5,
        due: new Date(),
        elapsedDays: 0,
        flashcardId: fc.id,
        introducedAt: new Date(),
        lapses: 0,
        lastReview: null,
        learningSteps: 0,
        reps: 0,
        scheduledDays: 0,
        stability: 2.5,
        state: "New",
        updatedAt: new Date(),
        userId: env.ownerId,
      });

      const count = await env.repo.countIntroducedToday(
        env.ownerId,
        ss.id,
        new Date(Date.now() - 86_400_000)
      );
      expect(count).toBe(1);
    });

    it("returns 0 when no states were introduced in the window", async ({
      expect,
    }) => {
      await using env = new FlashcardSessionTestEnv();
      const ss = env.seedStudySet({ ownerId: env.ownerId });

      const count = await env.repo.countIntroducedToday(
        env.ownerId,
        ss.id,
        new Date()
      );
      expect(count).toBe(0);
    });
  });

  describe("listReviewsByStudySet", () => {
    it("returns reviews for the given study set", async ({ expect }) => {
      await using env = new FlashcardSessionTestEnv();
      const ss = env.seedStudySet({ ownerId: env.ownerId });
      const seededSession = env.seedSession({
        studySetId: ss.id,
        userId: env.ownerId,
      });
      const fc = env.seedFlashcard({
        ownerId: env.ownerId,
        studySetId: ss.id,
      });
      const reviewedAt = new Date();

      await env.repo.insertReviewWithState({
        review: {
          flashcardId: fc.id,
          preDifficulty: 5,
          preDue: new Date(),
          preLapses: 0,
          preLastReview: null,
          preLearningSteps: 0,
          preReps: 0,
          preScheduledDays: 0,
          preStability: 2.5,
          preState: "New",
          rating: "Good",
          reviewedAt,
          sessionId: seededSession.id,
        },
        state: {
          difficulty: 5,
          due: new Date(),
          elapsedDays: 0,
          flashcardId: fc.id,
          introducedAt: reviewedAt,
          lapses: 0,
          lastReview: reviewedAt,
          learningSteps: 0,
          reps: 1,
          scheduledDays: 0,
          stability: 2.5,
          state: "Review",
          updatedAt: reviewedAt,
          userId: env.ownerId,
        },
      });

      const reviews = await env.repo.listReviewsByStudySet({
        limit: 50,
        studySetId: ss.id,
        userId: env.ownerId,
      });
      expect(reviews).toHaveLength(1);
      expect(reviews[0]?.rating).toBe("Good");
    });
  });

  describe("schema constraints", () => {
    it("returns the existing session when getOrCreateSession is called twice", async ({
      expect,
    }) => {
      await using env = new FlashcardSessionTestEnv();
      const ss = env.seedStudySet({ ownerId: env.ownerId });
      const first = await env.repo.getOrCreateSession({
        studySetId: ss.id,
        userId: env.ownerId,
      });
      const second = await env.repo.getOrCreateSession({
        studySetId: ss.id,
        userId: env.ownerId,
      });
      expect(second.id).toBe(first.id);
    });

    // oxlint-disable-next-line require-await
    it("enforces the unique (userId, studySetId) constraint on direct inserts", async ({
      expect,
    }) => {
      await using env = new FlashcardSessionTestEnv();
      const ss = env.seedStudySet({ ownerId: env.ownerId });
      env.db
        .insert(flashcardSession)
        .values({
          createdAt: new Date(),
          id: generateId(FLASHCARD_SESSION_ID_PREFIX),
          studySetId: ss.id,
          updatedAt: new Date(),
          userId: env.ownerId,
        })
        .run();

      expect(() =>
        env.db
          .insert(flashcardSession)
          .values({
            createdAt: new Date(),
            id: generateId(FLASHCARD_SESSION_ID_PREFIX),
            studySetId: ss.id,
            updatedAt: new Date(),
            userId: env.ownerId,
          })
          .run()
      ).toThrow();
    });

    it("cascades deletion when the parent user is deleted", async ({
      expect,
    }) => {
      await using env = new FlashcardSessionTestEnv();
      const ss = env.seedStudySet({ ownerId: env.ownerId });
      env.seedSession({ studySetId: ss.id, userId: env.ownerId });

      env.db.delete(user).where(eq(user.id, env.ownerId)).run();

      const sessions = await env.repo.listSessionsForUser(env.ownerId, 1, 20);
      expect(sessions.data).toHaveLength(0);
    });

    it("cascades the review row when the parent flashcard is deleted", async ({
      expect,
    }) => {
      await using env = new FlashcardSessionTestEnv();
      const ss = env.seedStudySet({ ownerId: env.ownerId });
      const seededSession = env.seedSession({
        studySetId: ss.id,
        userId: env.ownerId,
      });
      const fc = env.seedFlashcard({
        ownerId: env.ownerId,
        studySetId: ss.id,
      });
      const reviewedAt = new Date();

      await env.repo.insertReviewWithState({
        review: {
          flashcardId: fc.id,
          preDifficulty: 5,
          preDue: new Date(),
          preLapses: 0,
          preLastReview: null,
          preLearningSteps: 0,
          preReps: 0,
          preScheduledDays: 0,
          preStability: 2.5,
          preState: "New",
          rating: "Again",
          reviewedAt,
          sessionId: seededSession.id,
        },
        state: {
          difficulty: 5,
          due: new Date(),
          elapsedDays: 0,
          flashcardId: fc.id,
          introducedAt: reviewedAt,
          lapses: 0,
          lastReview: reviewedAt,
          learningSteps: 0,
          reps: 1,
          scheduledDays: 0,
          stability: 2.5,
          state: "Review",
          updatedAt: reviewedAt,
          userId: env.ownerId,
        },
      });

      env.db.delete(flashcard).where(eq(flashcard.id, fc.id)).run();

      const reviews = await env.repo.listReviewsByStudySet({
        limit: 50,
        studySetId: ss.id,
        userId: env.ownerId,
      });
      expect(reviews).toHaveLength(0);
    });
  });
});
