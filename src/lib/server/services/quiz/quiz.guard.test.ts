import { ORPCError } from "@orpc/server";
import { describe, it, vi } from "vitest";
import type { MockedFunction } from "vitest";

import type { ChapterGuard } from "../chapter/chapter.guard.ts";
import { createChapterFixture } from "../chapter/chapter.testing.ts";
import type { StudySetGuard } from "../study-set/study-set.guard.ts";
import { createStudySetFixture } from "../study-set/study-set.testing.ts";
import { QuizGuard } from "./quiz.guard.ts";
import {
  createMockRepository,
  createQuizFixture,
  createQuizOptionFixture,
} from "./quiz.testing.ts";

const createMockStudySetGuard = (): MockedStudySetGuard => ({
  assertOwnerOrForbidden: vi.fn<StudySetGuard["assertOwnerOrForbidden"]>(),
  assertStudySetOwnerOrForbidden:
    vi.fn<StudySetGuard["assertStudySetOwnerOrForbidden"]>(),
  assertStudySetVisibleByIdOrNotFound:
    vi.fn<StudySetGuard["assertStudySetVisibleByIdOrNotFound"]>(),
  assertVisibleByIdOrNotFound:
    vi.fn<StudySetGuard["assertVisibleByIdOrNotFound"]>(),
  assertVisibleBySlugOrNotFound:
    vi.fn<StudySetGuard["assertVisibleBySlugOrNotFound"]>(),
  canView: vi.fn<StudySetGuard["canView"]>(),
});

const createMockChapterGuard = (): MockedChapterGuard => ({
  assertOwnerOrForbidden: vi.fn<ChapterGuard["assertOwnerOrForbidden"]>(),
  assertStudySetOwnerOrForbidden:
    vi.fn<ChapterGuard["assertStudySetOwnerOrForbidden"]>(),
  assertVisibleByIdOrNotFound:
    vi.fn<ChapterGuard["assertVisibleByIdOrNotFound"]>(),
});

type MockedStudySetGuard = {
  [K in keyof StudySetGuard]: MockedFunction<StudySetGuard[K]>;
};
type MockedChapterGuard = {
  [K in keyof ChapterGuard]: MockedFunction<ChapterGuard[K]>;
};

const setupGuard = () => {
  const repo = createMockRepository();
  const studySetGuard = createMockStudySetGuard();
  const chapterGuard = createMockChapterGuard();

  repo.findQuizById.mockResolvedValue(null);
  repo.findOptionsByIdsForOwner.mockResolvedValue([]);
  repo.findOptionByIdForOwner.mockResolvedValue(null);
  repo.findChapterById.mockResolvedValue(null);

  const guard = new QuizGuard(
    repo,
    // oxlint-disable-next-line no-unsafe-type-assertion
    studySetGuard as unknown as StudySetGuard,
    // oxlint-disable-next-line no-unsafe-type-assertion
    chapterGuard as unknown as ChapterGuard
  );
  return { chapterGuard, guard, repo, studySetGuard };
};

describe.concurrent(QuizGuard, () => {
  describe("assertStudySetOwnerOrForbidden", () => {
    it("returns the set when the caller is the owner", async ({ expect }) => {
      const { studySetGuard, guard } = setupGuard();
      const set = createStudySetFixture({
        id: "set-1",
        ownerId: "owner-1",
        visibility: "PUBLIC",
      });
      studySetGuard.assertStudySetOwnerOrForbidden.mockResolvedValue(set);

      const result = await guard.assertStudySetOwnerOrForbidden(
        "set-1",
        "owner-1"
      );
      expect(studySetGuard.assertStudySetOwnerOrForbidden).toHaveBeenCalledWith(
        "set-1",
        "owner-1"
      );
      expect(result).toBe(set);
    });

    it("rethrows FORBIDDEN with the quiz message when the study set is not owned", async ({
      expect,
    }) => {
      const { studySetGuard, guard } = setupGuard();
      studySetGuard.assertStudySetOwnerOrForbidden.mockRejectedValue(
        new ORPCError("FORBIDDEN", {
          message: "Cannot modify a study set you do not own",
        })
      );

      let err: unknown = null;
      try {
        await guard.assertStudySetOwnerOrForbidden("set-1", "other");
      } catch (error) {
        err = error;
      }
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "FORBIDDEN" });
    });
  });

  describe("assertStudySetVisibleOrNotFound", () => {
    it("delegates to the study set guard", async ({ expect }) => {
      const { studySetGuard, guard } = setupGuard();
      const set = createStudySetFixture({ id: "set-1" });
      studySetGuard.assertStudySetVisibleByIdOrNotFound.mockResolvedValue(set);

      const result = await guard.assertStudySetVisibleOrNotFound(
        "set-1",
        "user-1"
      );
      expect(
        studySetGuard.assertStudySetVisibleByIdOrNotFound
      ).toHaveBeenCalledWith("set-1", "user-1");
      expect(result).toBe(set);
    });
  });

  describe("assertChapterOwnerOrForbidden", () => {
    it("delegates to the chapter guard", async ({ expect }) => {
      const { chapterGuard, guard } = setupGuard();
      const ch = createChapterFixture({ id: "ch-1" });
      chapterGuard.assertOwnerOrForbidden.mockResolvedValue(ch);

      const result = await guard.assertChapterOwnerOrForbidden(
        "ch-1",
        "owner-1"
      );
      expect(chapterGuard.assertOwnerOrForbidden).toHaveBeenCalledWith(
        "ch-1",
        "owner-1"
      );
      expect(result).toBe(ch);
    });
  });

  describe("assertChapterInStudySetOrForbidden", () => {
    it("returns the chapter when it belongs to the expected study set and is owned", async ({
      expect,
    }) => {
      const { repo, guard } = setupGuard();
      const ch = createChapterFixture({
        id: "ch-1",
        ownerId: "owner-1",
        studySetId: "set-1",
      });
      repo.findChapterById.mockResolvedValue(ch);

      const result = await guard.assertChapterInStudySetOrForbidden(
        "ch-1",
        "owner-1",
        "set-1"
      );
      expect(result).toBe(ch);
    });

    it("throws NOT_FOUND when the chapter does not exist", async ({
      expect,
    }) => {
      const { repo, guard } = setupGuard();
      repo.findChapterById.mockResolvedValue(null);
      let err: unknown = null;
      try {
        await guard.assertChapterInStudySetOrForbidden(
          "missing",
          "owner-1",
          "set-1"
        );
      } catch (error) {
        err = error;
      }
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws VALIDATION_FAILED when the chapter belongs to another study set", async ({
      expect,
    }) => {
      const { repo, guard } = setupGuard();
      repo.findChapterById.mockResolvedValue(
        createChapterFixture({
          id: "ch-1",
          ownerId: "owner-1",
          studySetId: "set-2",
        })
      );
      let err: unknown = null;
      try {
        await guard.assertChapterInStudySetOrForbidden(
          "ch-1",
          "owner-1",
          "set-1"
        );
      } catch (error) {
        err = error;
      }
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "VALIDATION_FAILED" });
    });

    it("throws FORBIDDEN when the chapter is owned by another user", async ({
      expect,
    }) => {
      const { repo, guard } = setupGuard();
      repo.findChapterById.mockResolvedValue(
        createChapterFixture({
          id: "ch-1",
          ownerId: "someone-else",
          studySetId: "set-1",
        })
      );
      let err: unknown = null;
      try {
        await guard.assertChapterInStudySetOrForbidden(
          "ch-1",
          "owner-1",
          "set-1"
        );
      } catch (error) {
        err = error;
      }
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "FORBIDDEN" });
    });
  });

  describe("assertQuizOwnerOrForbidden", () => {
    it("returns the quiz when caller is the owner", async ({ expect }) => {
      const { repo, guard } = setupGuard();
      const quizRow = createQuizFixture({ id: "q-1", ownerId: "owner-1" });
      repo.findQuizById.mockResolvedValue(quizRow);

      const result = await guard.assertQuizOwnerOrForbidden("q-1", "owner-1");
      expect(repo.findQuizById).toHaveBeenCalledWith("q-1");
      expect(result).toBe(quizRow);
    });

    it("throws FORBIDDEN when quiz does not exist", async ({ expect }) => {
      const { repo, guard } = setupGuard();
      repo.findQuizById.mockResolvedValue(null);
      let err: unknown = null;
      try {
        await guard.assertQuizOwnerOrForbidden("missing", "owner-1");
      } catch (error) {
        err = error;
      }
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "FORBIDDEN" });
    });

    it("throws FORBIDDEN when caller is not the owner", async ({ expect }) => {
      const { repo, guard } = setupGuard();
      repo.findQuizById.mockResolvedValue(
        createQuizFixture({ id: "q-1", ownerId: "owner-1" })
      );
      let err: unknown = null;
      try {
        await guard.assertQuizOwnerOrForbidden("q-1", "other");
      } catch (error) {
        err = error;
      }
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "FORBIDDEN" });
    });
  });

  describe("assertQuizOwnerBatchOrPartialForbidden", () => {
    it("returns all quizzes when all are owned", async ({ expect }) => {
      const { repo, guard } = setupGuard();
      const a = createQuizFixture({ id: "q-1", ownerId: "owner-1" });
      const b = createQuizFixture({ id: "q-2", ownerId: "owner-1" });
      repo.findQuizzesByIds.mockResolvedValue([a, b]);

      const result = await guard.assertQuizOwnerBatchOrPartialForbidden(
        ["q-1", "q-2"],
        "owner-1"
      );
      expect(result).toEqual([a, b]);
    });

    it("throws PARTIAL_FORBIDDEN with blocked ids when one is not owned", async ({
      expect,
    }) => {
      const { repo, guard } = setupGuard();
      repo.findQuizzesByIds.mockResolvedValue([
        createQuizFixture({ id: "q-1", ownerId: "owner-1" }),
      ]);

      let err: unknown = null;
      try {
        await guard.assertQuizOwnerBatchOrPartialForbidden(
          ["q-1", "q-2"],
          "owner-1"
        );
      } catch (error) {
        err = error;
      }
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({
        code: "PARTIAL_FORBIDDEN",
        data: { ids: ["q-2"] },
      });
    });

    it("throws PARTIAL_FORBIDDEN with blocked ids when a quiz is owned by another user", async ({
      expect,
    }) => {
      const { repo, guard } = setupGuard();
      repo.findQuizzesByIds.mockResolvedValue([
        createQuizFixture({ id: "q-1", ownerId: "owner-1" }),
        createQuizFixture({ id: "q-2", ownerId: "someone-else" }),
      ]);

      let err: unknown = null;
      try {
        await guard.assertQuizOwnerBatchOrPartialForbidden(
          ["q-1", "q-2"],
          "owner-1"
        );
      } catch (error) {
        err = error;
      }
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({
        code: "PARTIAL_FORBIDDEN",
        data: { ids: ["q-2"] },
      });
    });
  });

  describe("assertQuizOptionOwnerBatchOrPartialForbidden", () => {
    it("returns the owned options when all ids belong to the owner", async ({
      expect,
    }) => {
      const { repo, guard } = setupGuard();
      const owned = [
        createQuizOptionFixture({ id: "o-1", quizId: "q-1" }),
        createQuizOptionFixture({ id: "o-2", quizId: "q-1" }),
      ];
      repo.findOptionsByIdsForOwner.mockResolvedValue(owned);

      const result = await guard.assertQuizOptionOwnerBatchOrPartialForbidden(
        ["o-1", "o-2"],
        "owner-1"
      );
      expect(result).toBe(owned);
      expect(repo.findOptionsByIdsForOwner).toHaveBeenCalledWith(
        ["o-1", "o-2"],
        "owner-1"
      );
    });

    it("throws PARTIAL_FORBIDDEN with the missing ids", async ({ expect }) => {
      const { repo, guard } = setupGuard();
      repo.findOptionsByIdsForOwner.mockResolvedValue([
        createQuizOptionFixture({ id: "o-1" }),
      ]);

      let err: unknown = null;
      try {
        await guard.assertQuizOptionOwnerBatchOrPartialForbidden(
          ["o-1", "o-2"],
          "owner-1"
        );
      } catch (error) {
        err = error;
      }
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({
        code: "PARTIAL_FORBIDDEN",
        data: { ids: ["o-2"] },
      });
    });
  });

  describe("assertQuizVisibleByIdOrNotFound", () => {
    it("returns the quiz to the owner even if study set is private", async ({
      expect,
    }) => {
      const { repo, studySetGuard, guard } = setupGuard();
      const quizRow = createQuizFixture({
        id: "q-1",
        ownerId: "owner-1",
        studySetId: "set-1",
      });
      repo.findQuizById.mockResolvedValue(quizRow);
      studySetGuard.assertStudySetVisibleByIdOrNotFound.mockResolvedValue(
        createStudySetFixture({
          id: "set-1",
          ownerId: "owner-1",
          visibility: "PRIVATE",
        })
      );

      const result = await guard.assertQuizVisibleByIdOrNotFound(
        "q-1",
        "owner-1"
      );
      expect(result).toBe(quizRow);
    });

    it("returns the quiz to any user when the study set is public", async ({
      expect,
    }) => {
      const { repo, studySetGuard, guard } = setupGuard();
      const quizRow = createQuizFixture({
        id: "q-1",
        ownerId: "owner-1",
        studySetId: "set-1",
      });
      repo.findQuizById.mockResolvedValue(quizRow);
      studySetGuard.assertStudySetVisibleByIdOrNotFound.mockResolvedValue(
        createStudySetFixture({
          id: "set-1",
          ownerId: "owner-1",
          visibility: "PUBLIC",
        })
      );

      const result = await guard.assertQuizVisibleByIdOrNotFound(
        "q-1",
        "other"
      );
      expect(result).toBe(quizRow);
    });

    it("throws NOT_FOUND when the quiz does not exist", async ({ expect }) => {
      const { repo, guard } = setupGuard();
      repo.findQuizById.mockResolvedValue(null);
      let err: unknown = null;
      try {
        await guard.assertQuizVisibleByIdOrNotFound("missing", "owner-1");
      } catch (error) {
        err = error;
      }
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });

    it("rethrows NOT_FOUND with the quiz message when the parent study set is not visible", async ({
      expect,
    }) => {
      const { repo, studySetGuard, guard } = setupGuard();
      repo.findQuizById.mockResolvedValue(
        createQuizFixture({
          id: "q-1",
          ownerId: "owner-1",
          studySetId: "set-1",
        })
      );
      studySetGuard.assertStudySetVisibleByIdOrNotFound.mockRejectedValue(
        new ORPCError("NOT_FOUND", { message: "Study set not found" })
      );

      let err: unknown = null;
      try {
        await guard.assertQuizVisibleByIdOrNotFound("q-1", "other");
      } catch (error) {
        err = error;
      }
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });
  });
});
