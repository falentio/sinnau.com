import { FLASHCARD_SESSION_ID_PREFIX } from "$lib/schemas/flashcard-session.constant";
import { user } from "$lib/server/infras/db/schema/auth-schema";
import { flashcard } from "$lib/server/infras/db/schema/flashcard";
import { flashcardSession } from "$lib/server/infras/db/schema/flashcard-session";
import { eq } from "drizzle-orm";
import { describe, it } from "vitest";

import { generateId } from "../../utils/nanoid.ts";
import { FlashcardSessionTestEnv } from "./flashcard-session.testing.ts";

describe("FlashcardSessionDrizzleRepository", () => {
  describe("findSessionById", () => {
    it("returns null for a non-existent session", async ({ expect }) => {
      await using env = new FlashcardSessionTestEnv();
      const result = await env.repo.findSessionById("missing");
      expect(result).toBeNull();
    });

    it("returns the session when it exists", async ({ expect }) => {
      await using env = new FlashcardSessionTestEnv();
      const seeded = await env.seedSession({ userId: env.ownerId });

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
      const ss = await env.seedStudySet({ ownerId: env.ownerId });
      const seeded = await env.seedSession({
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
      const ss = await env.seedStudySet({ ownerId: env.ownerId });
      const ss2 = await env.seedStudySet({ ownerId: otherUser });
      await env.seedSession({ studySetId: ss.id, userId: env.ownerId });
      await env.seedSession({ studySetId: ss2.id, userId: otherUser });

      const results = await env.repo.listSessionsForUser(env.ownerId);
      expect(results).toHaveLength(1);
      expect(results[0]?.userId).toBe(env.ownerId);
    });
  });

  describe("listSessionsForAdmin", () => {
    it("returns all sessions when no filter is provided", async ({
      expect,
    }) => {
      await using env = new FlashcardSessionTestEnv();
      const other = env.seedUser({ name: "Other" });
      const ss = await env.seedStudySet({ ownerId: env.ownerId });
      const ss2 = await env.seedStudySet({ ownerId: other });
      await env.seedSession({ studySetId: ss.id, userId: env.ownerId });
      await env.seedSession({ studySetId: ss2.id, userId: other });

      const results = await env.repo.listSessionsForAdmin({});
      expect(results).toHaveLength(2);
    });

    it("filters by userId", async ({ expect }) => {
      await using env = new FlashcardSessionTestEnv();
      const ss = await env.seedStudySet({ ownerId: env.ownerId });
      await env.seedSession({ studySetId: ss.id, userId: env.ownerId });

      const results = await env.repo.listSessionsForAdmin({
        userId: env.ownerId,
      });
      expect(results).toHaveLength(1);
    });
  });

  describe("insertSession", () => {
    it("persists a session and returns it with timestamps", async ({
      expect,
    }) => {
      await using env = new FlashcardSessionTestEnv();
      const ss = await env.seedStudySet({ ownerId: env.ownerId });
      const id = generateId(FLASHCARD_SESSION_ID_PREFIX);
      const before = Date.now();

      const result = await env.repo.insertSession({
        id,
        studySetId: ss.id,
        userId: env.ownerId,
      });

      const after = Date.now();
      expect(result.id).toBe(id);
      expect(result.createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.createdAt.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe("updateSessionTouch", () => {
    it("updates the updatedAt field", async ({ expect }) => {
      await using env = new FlashcardSessionTestEnv();
      const seeded = await env.seedSession({ userId: env.ownerId });
      const originalUpdatedAt = seeded.updatedAt.getTime();

      // oxlint-disable-next-line ban/sleep
      await new Promise((r) => setTimeout(r, 10));
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
      const ss = await env.seedStudySet({ ownerId: env.ownerId });
      const oldSs = await env.seedStudySet({ ownerId: env.ownerId });
      const now = Date.now();
      await env.seedSession({ studySetId: ss.id, userId: env.ownerId });

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

      const remaining = await env.repo.listSessionsForUser(env.ownerId);
      expect(remaining).toHaveLength(1);
    });
  });

  describe("insertReview", () => {
    it("persists a review row with all pre-snapshot fields", async ({
      expect,
    }) => {
      await using env = new FlashcardSessionTestEnv();
      const ss = await env.seedStudySet({ ownerId: env.ownerId });
      const seededSession = await env.seedSession({
        studySetId: ss.id,
        userId: env.ownerId,
      });
      const seededFlashcard = await env.seedFlashcard({
        ownerId: env.ownerId,
        studySetId: ss.id,
      });

      const result = await env.repo.insertReview({
        flashcardId: seededFlashcard.id,
        preDifficulty: 5,
        preDue: new Date(),
        preElapsedDays: 0,
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
      });

      expect(result.id).toMatch(/^fsr_/u);
      expect(result.rating).toBe("Good");
      expect(result.flashcardId).toBe(seededFlashcard.id);
    });
  });

  describe("upsertState / findStateByKey", () => {
    it("inserts a new state and retrieves it", async ({ expect }) => {
      await using env = new FlashcardSessionTestEnv();
      const ss = await env.seedStudySet({ ownerId: env.ownerId });
      const fc = await env.seedFlashcard({
        ownerId: env.ownerId,
        studySetId: ss.id,
      });
      const state = {
        difficulty: 5,
        due: new Date(Date.now() + 86_400_000),
        elapsedDays: 0,
        flashcardId: fc.id,
        introducedAt: new Date(),
        lapses: 0,
        lastReview: null,
        learningSteps: 0,
        reps: 0,
        scheduledDays: 0,
        stability: 2.5,
        state: "New" as const,
        updatedAt: new Date(),
        userId: env.ownerId,
      };

      const inserted = await env.repo.upsertState(state);
      expect(inserted.flashcardId).toBe(fc.id);

      const found = await env.repo.findStateByKey(env.ownerId, fc.id);
      expect(found).not.toBeNull();
      expect(found?.stability).toBe(2.5);
      expect(found?.introducedAt).not.toBeNull();
    });

    it("updates existing state on conflict and preserves introducedAt", async ({
      expect,
    }) => {
      await using env = new FlashcardSessionTestEnv();
      const ss = await env.seedStudySet({ ownerId: env.ownerId });
      const fc = await env.seedFlashcard({
        ownerId: env.ownerId,
        studySetId: ss.id,
      });
      const originalIntroducedAt = new Date("2026-01-01");
      const state = {
        difficulty: 5,
        due: new Date(Date.now() + 86_400_000),
        elapsedDays: 0,
        flashcardId: fc.id,
        introducedAt: originalIntroducedAt,
        lapses: 0,
        lastReview: null,
        learningSteps: 0,
        reps: 0,
        scheduledDays: 0,
        stability: 2.5,
        state: "New" as const,
        updatedAt: new Date(),
        userId: env.ownerId,
      };

      await env.repo.upsertState(state);

      const updated = await env.repo.upsertState({
        ...state,
        introducedAt: null,
        reps: 1,
        stability: 3,
        state: "Learning",
      });
      expect(updated.reps).toBe(1);
      expect(updated.stability).toBe(3);
      expect(updated.state).toBe("Learning");
      expect(updated.introducedAt?.getTime()).toBe(
        originalIntroducedAt.getTime()
      );
    });
  });

  describe("findFlashcardsForQueue", () => {
    it("classifies flashcards into overdue, due-today, new buckets", async ({
      expect,
    }) => {
      await using env = new FlashcardSessionTestEnv();
      const ss = await env.seedStudySet({ ownerId: env.ownerId });
      const now = Date.now();

      const fcOverdue = await env.seedFlashcard({
        front: "overdue",
        ownerId: env.ownerId,
        studySetId: ss.id,
      });
      const fcNew = await env.seedFlashcard({
        front: "new",
        ownerId: env.ownerId,
        studySetId: ss.id,
      });
      const fcDueToday = await env.seedFlashcard({
        front: "due-today",
        ownerId: env.ownerId,
        studySetId: ss.id,
      });

      // Overdue: due 2 days in the past
      await env.repo.upsertState({
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
      await env.repo.upsertState({
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
      const ss = await env.seedStudySet({ ownerId: env.ownerId });

      const result = await env.repo.findFlashcardsForQueue({
        dueIn7DaysMs: 7 * 86_400_000,
        horizonMs: 86_400_000,
        now: Date.now(),
        studySetId: ss.id,
        userId: env.ownerId,
      });

      expect(result.overdue).toEqual([]);
      expect(result.dueToday).toEqual([]);
      expect(result.new).toEqual([]);
      expect(result.dueIn7Days).toHaveLength(7);
    });

    it("returns 7-day per-day count array", async ({ expect }) => {
      await using env = new FlashcardSessionTestEnv();
      const ss = await env.seedStudySet({ ownerId: env.ownerId });
      const now = Date.now();
      const twoDaysLater = new Date(now + 2 * 86_400_000);
      const twoDaysStr = twoDaysLater.toISOString().slice(0, 10);

      const fc = await env.seedFlashcard({
        ownerId: env.ownerId,
        studySetId: ss.id,
      });
      await env.repo.upsertState({
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
        now,
        studySetId: ss.id,
        userId: env.ownerId,
      });

      expect(result.dueIn7Days).toHaveLength(7);
      const day2 = result.dueIn7Days.find((d) => d.date === twoDaysStr);
      expect(day2?.count).toBe(1);
    });
  });

  describe("countIntroducedToday", () => {
    it("counts states introduced since the given date", async ({ expect }) => {
      await using env = new FlashcardSessionTestEnv();
      const ss = await env.seedStudySet({ ownerId: env.ownerId });
      const fc = await env.seedFlashcard({
        ownerId: env.ownerId,
        studySetId: ss.id,
      });

      await env.repo.upsertState({
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
      const ss = await env.seedStudySet({ ownerId: env.ownerId });

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
      const ss = await env.seedStudySet({ ownerId: env.ownerId });
      const seededSession = await env.seedSession({
        studySetId: ss.id,
        userId: env.ownerId,
      });
      const fc = await env.seedFlashcard({
        ownerId: env.ownerId,
        studySetId: ss.id,
      });

      await env.repo.insertReview({
        flashcardId: fc.id,
        preDifficulty: 5,
        preDue: new Date(),
        preElapsedDays: 0,
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
    it("enforces the unique (userId, studySetId) constraint on sessions", async ({
      expect,
    }) => {
      await using env = new FlashcardSessionTestEnv();
      const ss = await env.seedStudySet({ ownerId: env.ownerId });
      const id = generateId(FLASHCARD_SESSION_ID_PREFIX);
      await env.repo.insertSession({
        id,
        studySetId: ss.id,
        userId: env.ownerId,
      });

      const dupId = generateId(FLASHCARD_SESSION_ID_PREFIX);
      await expect(
        env.repo.insertSession({
          id: dupId,
          studySetId: ss.id,
          userId: env.ownerId,
        })
      ).rejects.toThrow();
    });

    it("cascades deletion when the parent user is deleted", async ({
      expect,
    }) => {
      await using env = new FlashcardSessionTestEnv();
      const ss = await env.seedStudySet({ ownerId: env.ownerId });
      await env.seedSession({ studySetId: ss.id, userId: env.ownerId });

      env.db.delete(user).where(eq(user.id, env.ownerId)).run();

      const sessions = await env.repo.listSessionsForUser(env.ownerId);
      expect(sessions).toHaveLength(0);
    });

    it("sets flashcardId to null when the flashcard is deleted (onDelete: set null)", async ({
      expect,
    }) => {
      await using env = new FlashcardSessionTestEnv();
      const ss = await env.seedStudySet({ ownerId: env.ownerId });
      const seededSession = await env.seedSession({
        studySetId: ss.id,
        userId: env.ownerId,
      });
      const fc = await env.seedFlashcard({
        ownerId: env.ownerId,
        studySetId: ss.id,
      });

      await env.repo.insertReview({
        flashcardId: fc.id,
        preDifficulty: 5,
        preDue: new Date(),
        preElapsedDays: 0,
        preLapses: 0,
        preLastReview: null,
        preLearningSteps: 0,
        preReps: 0,
        preScheduledDays: 0,
        preStability: 2.5,
        preState: "New",
        rating: "Again",
        reviewedAt: new Date(),
        sessionId: seededSession.id,
      });

      env.db.delete(flashcard).where(eq(flashcard.id, fc.id)).run();

      const reviews = await env.repo.listReviewsByStudySet({
        limit: 50,
        studySetId: ss.id,
        userId: env.ownerId,
      });
      expect(reviews).toHaveLength(1);
      expect(reviews[0]?.flashcardId).toBeNull();
    });
  });
});
