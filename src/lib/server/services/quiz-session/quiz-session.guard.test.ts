import { ORPCError } from "@orpc/server";
import { describe, it } from "vitest";

import { ChapterGuard } from "../chapter/chapter.guard.ts";
import {
  createMockRepository as createMockChapterRepo,
  createChapterFixture,
} from "../chapter/chapter.testing.ts";
import { StudySetGuard } from "../study-set/study-set.guard.ts";
import {
  createStudySetFixture,
  createMockRepository as createMockStudySetRepo,
} from "../study-set/study-set.testing.ts";
import { QuizSessionGuard } from "./quiz-session.guard.ts";
import {
  captureError,
  createMockRepository,
  createQuizSessionFixture,
  createQuizSessionQuizFixture,
  createQuizSessionQuizOptionFixture,
} from "./quiz-session.testing.ts";

const setupGuard = () => {
  const repo = createMockRepository();
  repo.findSessionById.mockResolvedValue(null);
  repo.findSessionQuizById.mockResolvedValue(null);
  repo.findSessionQuizOptionsByIds.mockResolvedValue([]);

  const studySetRepo = createMockStudySetRepo();
  studySetRepo.findStudySetById.mockResolvedValue(null);
  const studySetGuard = new StudySetGuard(studySetRepo);

  const chapterRepo = createMockChapterRepo();
  chapterRepo.findChapterById.mockResolvedValue(null);

  const guard = new QuizSessionGuard(repo, studySetGuard, chapterRepo);
  return { chapterRepo, guard, repo, studySetRepo };
};

describe.concurrent(QuizSessionGuard, () => {
  describe("requireUser", () => {
    it("returns the userId when provided", ({ expect }) => {
      const { guard } = setupGuard();
      expect(guard.requireUser("user-1")).toBe("user-1");
    });

    it("throws UNAUTHORIZED when userId is null", ({ expect }) => {
      const { guard } = setupGuard();
      expect(() => guard.requireUser(null)).toThrow(ORPCError);
    });

    it("throws UNAUTHORIZED when userId is undefined", ({ expect }) => {
      const { guard } = setupGuard();
      expect(() => guard.requireUser(undefined)).toThrow(ORPCError);
    });
  });

  describe("assertStudySetVisibleOrNotFound", () => {
    it("delegates to studySetGuard and returns the set on success", async ({
      expect,
    }) => {
      const { guard, studySetRepo } = setupGuard();
      const set = createStudySetFixture({
        id: "set-1",
        ownerId: "user-1",
        visibility: "PUBLIC",
      });
      studySetRepo.findStudySetById.mockResolvedValue(set);

      const result = await guard.assertStudySetVisibleOrNotFound(
        "set-1",
        "user-1"
      );
      expect(result).toBe(set);
      expect(studySetRepo.findStudySetById).toHaveBeenCalledWith("set-1");
    });

    it("throws NOT_FOUND when studySetGuard rejects", async ({ expect }) => {
      const { guard } = setupGuard();
      const err = await captureError(
        guard.assertStudySetVisibleOrNotFound("missing", "user-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("assertChapterBelongsToStudySetOrValidationFailed", () => {
    it("resolves when the chapter belongs to the study set", async ({
      expect,
    }) => {
      const { chapterRepo, guard } = setupGuard();
      const ch = createChapterFixture({
        id: "ch-1",
        studySetId: "set-1",
      });
      chapterRepo.findChapterById.mockResolvedValue(ch);

      await expect(
        guard.assertChapterBelongsToStudySetOrValidationFailed("ch-1", "set-1")
      ).resolves.toBeUndefined();
      expect(chapterRepo.findChapterById).toHaveBeenCalledWith("ch-1");
    });

    it("throws VALIDATION_FAILED when the chapter does not exist", async ({
      expect,
    }) => {
      const { guard } = setupGuard();
      const err = await captureError(
        guard.assertChapterBelongsToStudySetOrValidationFailed(
          "missing",
          "set-1"
        )
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "VALIDATION_FAILED" });
    });

    it("throws VALIDATION_FAILED when the chapter belongs to a different study set", async ({
      expect,
    }) => {
      const { chapterRepo, guard } = setupGuard();
      chapterRepo.findChapterById.mockResolvedValue(
        createChapterFixture({ id: "ch-1", studySetId: "other-set" })
      );
      const err = await captureError(
        guard.assertChapterBelongsToStudySetOrValidationFailed("ch-1", "set-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "VALIDATION_FAILED" });
    });
  });

  describe("assertSessionOwnerOrNotFound", () => {
    it("returns the session when the caller is the owner", async ({
      expect,
    }) => {
      const { guard, repo } = setupGuard();
      const session = createQuizSessionFixture({
        id: "qss_session1",
        userId: "user-1",
      });
      repo.findSessionById.mockResolvedValue(session);

      const result = await guard.assertSessionOwnerOrNotFound(
        "qss_session1",
        "user-1"
      );
      expect(repo.findSessionById).toHaveBeenCalledWith("qss_session1");
      expect(result).toBe(session);
    });

    it("throws NOT_FOUND when the session does not exist", async ({
      expect,
    }) => {
      const { guard } = setupGuard();
      const err = await captureError(
        guard.assertSessionOwnerOrNotFound("missing", "user-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws NOT_FOUND when the caller is not the owner", async ({
      expect,
    }) => {
      const { guard, repo } = setupGuard();
      repo.findSessionById.mockResolvedValue(
        createQuizSessionFixture({ id: "qss_s1", userId: "owner-1" })
      );
      const err = await captureError(
        guard.assertSessionOwnerOrNotFound("qss_s1", "other-user")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("assertSessionActive", () => {
    it("does not throw for an ACTIVE session", ({ expect }) => {
      const { guard } = setupGuard();
      expect(() => {
        guard.assertSessionActive(
          createQuizSessionFixture({ id: "qss_s1", status: "ACTIVE" })
        );
      }).not.toThrow();
    });

    it("throws SESSION_ALREADY_COMPLETED for a COMPLETED session", ({
      expect,
    }) => {
      const { guard } = setupGuard();
      expect(() => {
        guard.assertSessionActive(
          createQuizSessionFixture({ id: "qss_s1", status: "COMPLETED" })
        );
      }).toThrow(ORPCError);
    });
  });

  describe("assertQuizInSessionOrValidationFailed", () => {
    const sessionId = "qss_session1";

    it("returns the quiz when it belongs to the session", async ({
      expect,
    }) => {
      const { guard, repo } = setupGuard();
      const quiz = createQuizSessionQuizFixture({
        id: "qsq_quiz1",
        sessionId,
      });
      repo.findSessionQuizById.mockResolvedValue(quiz);

      const result = await guard.assertQuizInSessionOrValidationFailed(
        "qsq_quiz1",
        sessionId
      );
      expect(repo.findSessionQuizById).toHaveBeenCalledWith("qsq_quiz1");
      expect(result).toBe(quiz);
    });

    it("throws NOT_FOUND when the session quiz does not exist", async ({
      expect,
    }) => {
      const { guard } = setupGuard();
      const err = await captureError(
        guard.assertQuizInSessionOrValidationFailed("missing", sessionId)
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws VALIDATION_FAILED when the quiz belongs to a different session", async ({
      expect,
    }) => {
      const { guard, repo } = setupGuard();
      repo.findSessionQuizById.mockResolvedValue(
        createQuizSessionQuizFixture({
          id: "qsq_quiz1",
          sessionId: "qss_other",
        })
      );
      const err = await captureError(
        guard.assertQuizInSessionOrValidationFailed("qsq_quiz1", sessionId)
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "VALIDATION_FAILED" });
    });
  });

  describe("assertOptionsBelongToSessionQuizOrValidationFailed", () => {
    const sessionQuizId = "qsq_quiz1";

    it("returns an empty array when optionIds is empty", async ({ expect }) => {
      const { guard } = setupGuard();
      const result =
        await guard.assertOptionsBelongToSessionQuizOrValidationFailed(
          [],
          sessionQuizId
        );
      expect(result).toEqual([]);
    });

    it("returns the options when all belong to the session quiz", async ({
      expect,
    }) => {
      const { guard, repo } = setupGuard();
      const opts = [
        createQuizSessionQuizOptionFixture({
          id: "qso_o1",
          sessionQuizId,
        }),
        createQuizSessionQuizOptionFixture({
          id: "qso_o2",
          sessionQuizId,
        }),
      ];
      repo.findSessionQuizOptionsByIds.mockResolvedValue(opts);

      const result =
        await guard.assertOptionsBelongToSessionQuizOrValidationFailed(
          ["qso_o1", "qso_o2"],
          sessionQuizId
        );
      expect(repo.findSessionQuizOptionsByIds).toHaveBeenCalledWith([
        "qso_o1",
        "qso_o2",
      ]);
      expect(result).toBe(opts);
    });

    it("throws VALIDATION_FAILED when some option IDs do not exist", async ({
      expect,
    }) => {
      const { guard, repo } = setupGuard();
      repo.findSessionQuizOptionsByIds.mockResolvedValue([
        createQuizSessionQuizOptionFixture({
          id: "qso_o1",
          sessionQuizId,
        }),
      ]);

      const err = await captureError(
        guard.assertOptionsBelongToSessionQuizOrValidationFailed(
          ["qso_o1", "qso_missing"],
          sessionQuizId
        )
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "VALIDATION_FAILED" });
    });

    it("throws VALIDATION_FAILED when some options belong to a different quiz", async ({
      expect,
    }) => {
      const { guard, repo } = setupGuard();
      repo.findSessionQuizOptionsByIds.mockResolvedValue([
        createQuizSessionQuizOptionFixture({
          id: "qso_o1",
          sessionQuizId,
        }),
        createQuizSessionQuizOptionFixture({
          id: "qso_o2",
          sessionQuizId: "qsq_other",
        }),
      ]);

      const err = await captureError(
        guard.assertOptionsBelongToSessionQuizOrValidationFailed(
          ["qso_o1", "qso_o2"],
          sessionQuizId
        )
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "VALIDATION_FAILED" });
    });
  });
});
