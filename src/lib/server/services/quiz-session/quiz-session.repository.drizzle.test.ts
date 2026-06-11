import { sleep } from "$lib/server/infras/db/testing";
import { eq } from "drizzle-orm";
import { describe, it } from "vitest";

import { quizSession } from "../../infras/db/schema/quiz-session";
import { QuizSessionTestEnv } from "./quiz-session.testing";

describe.concurrent("QuizSessionDrizzleRepository", () => {
  describe("insertSession", () => {
    it("persists and returns with timestamps", async ({ expect }) => {
      await using env = new QuizSessionTestEnv();
      const studySet = await env.seedStudySet();
      const before = Date.now();
      const created = await env.quizSessionRepo.insertSession({
        chapterId: null,
        completedAt: null,
        correctCount: null,
        failingChapterIds: null,
        id: "qse_1",
        incorrectQuizIds: null,
        lastAnsweredAt: null,
        lastQuestionText: null,
        quizCount: 3,
        score: null,
        status: "ACTIVE",
        studySetId: studySet.id,
        totalQuestions: null,
        userId: env.ownerId,
      });
      const after = Date.now();
      expect(created.id).toBeTruthy();
      expect(created.quizCount).toBe(3);
      expect(created.createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(created.createdAt.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe("updateSession", () => {
    it("updates fields when id and userId match", async ({ expect }) => {
      await using env = new QuizSessionTestEnv();
      const session = await env.seedQuizSession();
      const updated = await env.quizSessionRepo.updateSession(
        session.id,
        env.ownerId,
        {
          score: 100,
          status: "COMPLETED",
        }
      );
      expect(updated).toBeDefined();
      if (!updated) {
        throw new Error("expected updated to be defined");
      }
      expect(updated.status).toBe("COMPLETED");
      expect(updated.score).toBe(100);
    });

    it("returns null when id and userId mismatch", async ({ expect }) => {
      await using env = new QuizSessionTestEnv();
      const session = await env.seedQuizSession();
      const updated = await env.quizSessionRepo.updateSession(
        session.id,
        env.otherId,
        {
          status: "COMPLETED",
        }
      );
      expect(updated).toBeNull();
    });
  });

  describe("findSessionById", () => {
    it("returns null when missing", async ({ expect }) => {
      await using env = new QuizSessionTestEnv();
      const found = await env.quizSessionRepo.findSessionById("qse_missing");
      expect(found).toBeNull();
    });

    it("returns session when found", async ({ expect }) => {
      await using env = new QuizSessionTestEnv();
      const created = await env.seedQuizSession();
      const found = await env.quizSessionRepo.findSessionById(created.id);
      expect(found).toBeDefined();
      if (!found) {
        throw new Error("expected found to be defined");
      }
      expect(found.id).toBe(created.id);
    });
  });

  describe("findSessionsByStudySetAndUser", () => {
    it("returns sessions filtered and sorted by createdAt desc", async ({
      expect,
    }) => {
      await using env = new QuizSessionTestEnv();
      const studySet = await env.seedStudySet();
      const studySetId = studySet.id;
      await env.seedQuizSession({ studySetId, userId: env.ownerId });
      await sleep(5);
      await env.seedQuizSession({ studySetId, userId: env.ownerId });
      const results = await env.quizSessionRepo.findSessionsByStudySetAndUser(
        studySetId,
        env.ownerId
      );
      expect(results).toHaveLength(2);
      const [first, second] = results;
      if (!first || !second) {
        throw new Error("expected at least 2 results");
      }
      expect(first.createdAt.getTime()).toBeGreaterThan(
        second.createdAt.getTime()
      );
    });
  });

  describe("upsertAnswer", () => {
    it("inserts new answer", async ({ expect }) => {
      await using env = new QuizSessionTestEnv();
      const session = await env.seedQuizSession();
      const quiz = await env.seedQuiz();
      const answer = await env.quizSessionRepo.upsertAnswer({
        id: "qsa_1",
        quizId: quiz.id,
        selectedOptionIds: ["qzo_1"],
        sessionId: session.id,
      });
      expect(answer.id).toBeTruthy();
      expect(answer.selectedOptionIds).toEqual(["qzo_1"]);
    });

    it("updates existing answer on conflict", async ({ expect }) => {
      await using env = new QuizSessionTestEnv();
      const session = await env.seedQuizSession();
      const quiz = await env.seedQuiz();
      await env.quizSessionRepo.upsertAnswer({
        id: "qsa_1",
        quizId: quiz.id,
        selectedOptionIds: ["qzo_1"],
        sessionId: session.id,
      });
      const updated = await env.quizSessionRepo.upsertAnswer({
        id: "qsa_2",
        quizId: quiz.id,
        selectedOptionIds: ["qzo_2"],
        sessionId: session.id,
      });
      expect(updated.selectedOptionIds).toEqual(["qzo_2"]);
      const answers = await env.quizSessionRepo.findAnswersBySession(
        session.id
      );
      expect(answers).toHaveLength(1);
    });
  });

  describe("deleteExpiredSessionsAndOrphans", () => {
    it("deletes expired sessions and orphaned answers", async ({ expect }) => {
      await using env = new QuizSessionTestEnv();
      const session = await env.seedQuizSession();
      const quiz = await env.seedQuiz();
      await env.seedQuizSessionAnswer({
        quizId: quiz.id,
        sessionId: session.id,
      });
      await env.seedQuizSessionAnswer({
        quizId: null,
        sessionId: session.id,
      });
      const deleted = await env.quizSessionRepo.deleteExpiredSessionsAndOrphans(
        Date.now() + 1000
      );
      expect(deleted).toBeGreaterThan(0);
      const remaining = env.db
        .select()
        .from(quizSession)
        .where(eq(quizSession.id, session.id))
        .all();
      expect(remaining).toHaveLength(0);
    });
  });
});
