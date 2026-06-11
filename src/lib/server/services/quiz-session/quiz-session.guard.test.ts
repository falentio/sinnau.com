import { ORPCError } from "@orpc/server";
import { describe, it, vi } from "vitest";

import type { Chapter } from "../../infras/db/schema/chapter.ts";
import type { QuizOption } from "../../infras/db/schema/quiz.ts";
import type { StudySet } from "../../infras/db/schema/study-set.ts";
import type { QuizWithOptions } from "../quiz/quiz.repository.ts";
import type { StudySetGuard } from "../study-set/study-set.guard.ts";
import { QuizSessionGuard } from "./quiz-session.guard.ts";
import {
  captureError,
  createMockRepository,
  createQuizSessionFixture,
} from "./quiz-session.testing.ts";

const setupGuard = () => {
  const repo = createMockRepository();
  const studySetGuard = {
    assertOwnerOrForbidden:
      vi.fn<(id: string, ownerId: string) => Promise<StudySet>>(),
    assertStudySetOwnerOrForbidden:
      vi.fn<(studySetId: string, ownerId: string) => Promise<StudySet>>(),
    assertStudySetVisibleByIdOrNotFound:
      vi.fn<(studySetId: string, userId: string) => Promise<StudySet>>(),
    assertVisibleByIdOrNotFound:
      vi.fn<(id: string, userId: string) => Promise<StudySet>>(),
    assertVisibleBySlugOrNotFound:
      vi.fn<(slug: string, userId: string) => Promise<StudySet>>(),
    canView: vi.fn<(set: StudySet, userId: string) => boolean>(),
  };

  const guard = new QuizSessionGuard(
    repo,
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    studySetGuard as unknown as StudySetGuard
  );
  return { guard, repo, studySetGuard };
};

const createMockQuizWithOptions = (
  overrides: Partial<QuizWithOptions> = {}
): QuizWithOptions => ({
  chapterId: null,
  createdAt: new Date(),
  id: "qiz_1",
  options: [],
  ownerId: "owner-1",
  questionText: "Mock question?",
  studySetId: "sts_1",
  type: "MULTIPLE_CHOICE",
  updatedAt: new Date(),
  ...overrides,
});

const createMockQuizOption = (
  overrides: Partial<QuizOption> = {}
): QuizOption => ({
  createdAt: new Date(),
  explanation: null,
  id: "qzo_1",
  isCorrect: false,
  optionText: "Mock option",
  quizId: "qiz_1",
  updatedAt: new Date(),
  ...overrides,
});

describe.concurrent(QuizSessionGuard, () => {
  describe("requireUser", () => {
    it("returns userId when provided", ({ expect }) => {
      const { guard } = setupGuard();
      expect(guard.requireUser("user-1")).toBe("user-1");
    });

    it("throws UNAUTHORIZED when null", async ({ expect }) => {
      const { guard } = setupGuard();
      const error = await captureError(
        Promise.resolve().then(() => guard.requireUser(null))
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "UNAUTHORIZED" });
    });
  });

  describe("assertSessionOwnerOrNotFound", () => {
    it("returns session when owner", async ({ expect }) => {
      const { guard, repo } = setupGuard();
      const session = createQuizSessionFixture({ userId: "user-1" });
      repo.findSessionById.mockResolvedValue(session);
      const result = await guard.assertSessionOwnerOrNotFound(
        "qse_1",
        "user-1"
      );
      expect(result.id).toBe(session.id);
    });

    it("throws NOT_FOUND when non-owner", async ({ expect }) => {
      const { guard, repo } = setupGuard();
      const session = createQuizSessionFixture({ userId: "user-2" });
      repo.findSessionById.mockResolvedValue(session);
      const error = await captureError(
        guard.assertSessionOwnerOrNotFound("qse_1", "user-1")
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws NOT_FOUND when session missing", async ({ expect }) => {
      const { guard, repo } = setupGuard();
      repo.findSessionById.mockResolvedValue(null);
      const error = await captureError(
        guard.assertSessionOwnerOrNotFound("qse_1", "user-1")
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("assertStudySetVisibleOrNotFound", () => {
    it("delegates to studySetGuard", async ({ expect }) => {
      const { guard, studySetGuard } = setupGuard();
      studySetGuard.assertStudySetVisibleByIdOrNotFound.mockResolvedValue({
        createdAt: new Date(),
        deletedAt: null,
        description: null,
        files: [],
        id: "sts_1",
        ownerId: "user-1",
        slug: "study-set-slug",
        title: "Study Set",
        updatedAt: new Date(),
        visibility: "PUBLIC",
      });
      await guard.assertStudySetVisibleOrNotFound("sts_1", "user-1");
      expect(
        studySetGuard.assertStudySetVisibleByIdOrNotFound
      ).toHaveBeenCalledWith("sts_1", "user-1");
    });
  });

  describe("assertChapterInStudySetOrValidationFailed", () => {
    it("throws NOT_FOUND when chapter missing", async ({ expect }) => {
      const { guard, repo } = setupGuard();
      repo.findChapterById.mockResolvedValue(null);
      const error = await captureError(
        guard.assertChapterInStudySetOrValidationFailed("chp_1", "sts_1")
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws VALIDATION_FAILED when chapter mismatched", async ({
      expect,
    }) => {
      const { guard, repo } = setupGuard();
      const chapter: Chapter = {
        createdAt: new Date(),
        description: null,
        id: "chp_1",
        ownerId: "owner-1",
        slug: "chapter-slug",
        studySetId: "sts_2",
        title: "Chapter",
        updatedAt: new Date(),
      };
      repo.findChapterById.mockResolvedValue(chapter);
      const error = await captureError(
        guard.assertChapterInStudySetOrValidationFailed("chp_1", "sts_1")
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "VALIDATION_FAILED" });
    });
  });

  describe("assertQuizInSessionScopeOrValidationFailed", () => {
    it("throws VALIDATION_FAILED when quiz not in scope", async ({
      expect,
    }) => {
      const { guard, repo } = setupGuard();
      repo.findQuizByIdInScope.mockResolvedValue(null);
      const error = await captureError(
        guard.assertQuizInSessionScopeOrValidationFailed("qiz_1", "sts_1", null)
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "VALIDATION_FAILED" });
    });

    it("passes when quiz is in scope", async ({ expect }) => {
      const { guard, repo } = setupGuard();
      repo.findQuizByIdInScope.mockResolvedValue(createMockQuizWithOptions());
      await expect(
        guard.assertQuizInSessionScopeOrValidationFailed("qiz_1", "sts_1", null)
      ).resolves.toBeUndefined();
    });
  });

  describe("assertQuizOptionsValidOrValidationFailed", () => {
    it("throws VALIDATION_FAILED when selected option does not belong", async ({
      expect,
    }) => {
      const { guard, repo } = setupGuard();
      repo.findQuizOptionsByQuizId.mockResolvedValue([
        createMockQuizOption({ id: "qzo_1" }),
        createMockQuizOption({ id: "qzo_2" }),
      ]);
      const error = await captureError(
        guard.assertQuizOptionsValidOrValidationFailed("qiz_1", ["qzo_3"])
      );
      expect(error).toBeInstanceOf(ORPCError);
      expect(error).toMatchObject({ code: "VALIDATION_FAILED" });
    });

    it("passes when all options are valid", async ({ expect }) => {
      const { guard, repo } = setupGuard();
      repo.findQuizOptionsByQuizId.mockResolvedValue([
        createMockQuizOption({ id: "qzo_1" }),
        createMockQuizOption({ id: "qzo_2" }),
      ]);
      await expect(
        guard.assertQuizOptionsValidOrValidationFailed("qiz_1", [
          "qzo_1",
          "qzo_2",
        ])
      ).resolves.toBeUndefined();
    });
  });
});
