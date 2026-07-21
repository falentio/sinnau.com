import { ORPCError } from "@orpc/server";
import { describe, it } from "vitest";

import type { ChapterGuard } from "./chapter.guard.ts";
import { ChapterService } from "./chapter.service.ts";
import {
  captureError,
  createChapterFixture,
  createMockGuard,
  createMockRepository,
  EMPTY_CHAPTER_LIST,
} from "./chapter.testing.ts";

const setupService = () => {
  const repo = createMockRepository();
  const guard = createMockGuard();

  // oxlint-disable-next-line require-await
  repo.insertChapter.mockImplementation(async (row) =>
    createChapterFixture(row)
  );
  repo.updateChapter.mockResolvedValue(null);
  repo.deleteChapter.mockResolvedValue(false);
  repo.findChapterById.mockResolvedValue(null);
  repo.findChaptersByStudySet.mockResolvedValue(EMPTY_CHAPTER_LIST);
  repo.isSlugTakenInStudySet.mockResolvedValue(false);
  repo.countChildren.mockResolvedValue(0);

  guard.assertOwnerOrForbidden.mockResolvedValue(createChapterFixture());
  guard.assertVisibleByIdOrNotFound.mockResolvedValue(createChapterFixture());
  guard.assertStudySetOwnerOrForbidden.mockResolvedValue();
  guard.assertStudySetVisibleByIdOrNotFound.mockResolvedValue();

  // oxlint-disable-next-line no-unsafe-type-assertion
  const service = new ChapterService(repo, guard as unknown as ChapterGuard);
  return { guard, repo, service };
};

const throwForbidden = (): never => {
  throw new ORPCError("FORBIDDEN", {
    message: "Cannot modify a chapter you do not own",
  });
};

const throwNotFound = (): never => {
  throw new ORPCError("NOT_FOUND", { message: "Chapter not found" });
};

const sampleStudySetId = "11111111-1111-1111-1111-111111111111";
const sampleChapterId = "22222222-2222-2222-2222-222222222222";

describe.concurrent(ChapterService, () => {
  describe("createChapter", () => {
    it("propagates FORBIDDEN from guard.assertStudySetOwnerOrForbidden", async ({
      expect,
    }) => {
      const { repo, guard, service } = setupService();
      guard.assertStudySetOwnerOrForbidden.mockImplementation(throwForbidden);
      const err = await captureError(
        service.createChapter(
          { studySetId: sampleStudySetId, title: "Biology 101" },
          "owner-1"
        )
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "FORBIDDEN" });
      expect(guard.assertStudySetOwnerOrForbidden).toHaveBeenCalledWith(
        sampleStudySetId,
        "owner-1"
      );
      expect(repo.insertChapter).not.toHaveBeenCalled();
    });

    it("creates a chapter with a generated slug scoped to the study set", async ({
      expect,
    }) => {
      const { repo, guard, service } = setupService();
      const result = await service.createChapter(
        { studySetId: sampleStudySetId, title: "Biology 101" },
        "owner-1"
      );
      expect(guard.assertStudySetOwnerOrForbidden).toHaveBeenCalledWith(
        sampleStudySetId,
        "owner-1"
      );
      expect(repo.isSlugTakenInStudySet).toHaveBeenCalled();
      expect(repo.insertChapter).toHaveBeenCalledOnce();
      const inserted = repo.insertChapter.mock.calls[0]?.[0];
      expect(inserted).toMatchObject({
        ownerId: "owner-1",
        studySetId: sampleStudySetId,
        title: "Biology 101",
      });
      expect(inserted?.slug).toMatch(/^biology-101-[0-9A-Za-z]{8}$/u);
      expect(result.title).toBe("Biology 101");
      expect(result.ownerId).toBe("owner-1");
    });

    it("uses a short random slug when the sanitized title is too short", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      await service.createChapter(
        { studySetId: sampleStudySetId, title: "ab" },
        "owner-1"
      );
      const inserted = repo.insertChapter.mock.calls[0]?.[0];
      expect(inserted?.slug).toMatch(/^[0-9A-Za-z]{12}$/u);
    });

    it("consults the repo via isSlugTakenInStudySet with the studySetId for each candidate", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      await service.createChapter(
        { studySetId: sampleStudySetId, title: "Biology 101" },
        "owner-1"
      );
      const { calls } = repo.isSlugTakenInStudySet.mock;
      expect(calls.length).toBeGreaterThan(0);
      for (const [studySetId, candidate] of calls) {
        expect(studySetId).toBe(sampleStudySetId);
        expect(candidate).toMatch(/^biology-101-[0-9A-Za-z]{8}$/u);
      }
    });

    it("persists null when description is omitted", async ({ expect }) => {
      const { repo, service } = setupService();
      await service.createChapter(
        { studySetId: sampleStudySetId, title: "Biology 101" },
        "owner-1"
      );
      expect(repo.insertChapter).toHaveBeenCalledWith(
        expect.objectContaining({ description: null })
      );
    });

    it("translates SlugConflictError into CHAPTER_SLUG_CONFLICT", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.isSlugTakenInStudySet.mockResolvedValue(true);
      const err = await captureError(
        service.createChapter(
          { studySetId: sampleStudySetId, title: "Biology 101" },
          "owner-1"
        )
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "CHAPTER_SLUG_CONFLICT" });
    });
  });

  describe("updateChapter", () => {
    it("propagates FORBIDDEN from guard.assertOwnerOrForbidden", async ({
      expect,
    }) => {
      const { repo, guard, service } = setupService();
      guard.assertOwnerOrForbidden.mockImplementation(throwForbidden);
      const err = await captureError(
        service.updateChapter({ id: sampleChapterId, title: "X" }, "owner-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "FORBIDDEN" });
      expect(guard.assertOwnerOrForbidden).toHaveBeenCalledWith(
        sampleChapterId,
        "owner-1"
      );
      expect(repo.updateChapter).not.toHaveBeenCalled();
    });

    it("updates title and preserves slug", async ({ expect }) => {
      const { repo, guard, service } = setupService();
      const existing = createChapterFixture({
        id: sampleChapterId,
        ownerId: "owner-1",
        slug: "original-slug-abc123",
        title: "Original",
      });
      guard.assertOwnerOrForbidden.mockResolvedValue(existing);
      // oxlint-disable-next-line require-await
      repo.updateChapter.mockImplementation(async (id, _owner, patch) => ({
        ...existing,
        ...patch,
        updatedAt: new Date(),
      }));

      const result = await service.updateChapter(
        { id: sampleChapterId, title: "Renamed" },
        "owner-1"
      );
      expect(repo.updateChapter).toHaveBeenCalledWith(
        sampleChapterId,
        "owner-1",
        expect.objectContaining({ title: "Renamed" })
      );
      expect(result.title).toBe("Renamed");
      expect(result.slug).toBe("original-slug-abc123");
    });

    it("clears description when null is sent in update", async ({ expect }) => {
      const { repo, guard, service } = setupService();
      const existing = createChapterFixture({
        description: "old description",
        id: sampleChapterId,
        ownerId: "owner-1",
      });
      guard.assertOwnerOrForbidden.mockResolvedValue(existing);
      // oxlint-disable-next-line require-await
      repo.updateChapter.mockImplementation(async (id, _owner, patch) => ({
        ...existing,
        ...patch,
        updatedAt: new Date(),
      }));

      const result = await service.updateChapter(
        { description: null, id: sampleChapterId },
        "owner-1"
      );
      expect(repo.updateChapter).toHaveBeenCalledWith(
        sampleChapterId,
        "owner-1",
        expect.objectContaining({ description: null })
      );
      expect(result.description).toBe(null);
    });

    it("returns the existing row without calling update when patch is empty", async ({
      expect,
    }) => {
      const { repo, guard, service } = setupService();
      const existing = createChapterFixture({
        id: sampleChapterId,
        ownerId: "owner-1",
        title: "Original",
      });
      guard.assertOwnerOrForbidden.mockResolvedValue(existing);

      const result = await service.updateChapter(
        { id: sampleChapterId },
        "owner-1"
      );
      expect(result).toBe(existing);
      expect(repo.updateChapter).not.toHaveBeenCalled();
    });

    it("throws NOT_FOUND when repo update returns null", async ({ expect }) => {
      const { repo, guard, service } = setupService();
      guard.assertOwnerOrForbidden.mockResolvedValue(
        createChapterFixture({ id: sampleChapterId, ownerId: "owner-1" })
      );
      repo.updateChapter.mockResolvedValue(null);

      const err = await captureError(
        service.updateChapter({ id: sampleChapterId, title: "New" }, "owner-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("deleteChapter", () => {
    it("propagates FORBIDDEN from guard.assertOwnerOrForbidden", async ({
      expect,
    }) => {
      const { repo, guard, service } = setupService();
      guard.assertOwnerOrForbidden.mockImplementation(throwForbidden);
      const err = await captureError(
        service.deleteChapter({ id: sampleChapterId }, "owner-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "FORBIDDEN" });
      expect(guard.assertOwnerOrForbidden).toHaveBeenCalledWith(
        sampleChapterId,
        "owner-1"
      );
      expect(repo.countChildren).not.toHaveBeenCalled();
      expect(repo.deleteChapter).not.toHaveBeenCalled();
    });

    it("throws CHAPTER_NOT_EMPTY when the chapter contains flashcards", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.countChildren.mockResolvedValue(2);
      const err = await captureError(
        service.deleteChapter({ id: sampleChapterId }, "owner-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "CHAPTER_NOT_EMPTY" });
      expect(repo.countChildren).toHaveBeenCalledWith(sampleChapterId);
      expect(repo.deleteChapter).not.toHaveBeenCalled();
    });

    it("throws NOT_FOUND when repo reports nothing was deleted", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.deleteChapter.mockResolvedValue(false);
      const err = await captureError(
        service.deleteChapter({ id: sampleChapterId }, "owner-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });

    it("passes the id and owner to the repo when owner matches and the chapter is empty", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.deleteChapter.mockResolvedValue(true);
      await service.deleteChapter({ id: sampleChapterId }, "owner-1");
      expect(repo.countChildren).toHaveBeenCalledWith(sampleChapterId);
      expect(repo.deleteChapter).toHaveBeenCalledWith(
        sampleChapterId,
        "owner-1"
      );
    });
  });

  describe("getChaptersByStudySet", () => {
    it("calls the visibility guard, then forwards user id and studySetId to the repo", async ({
      expect,
    }) => {
      const { guard, repo, service } = setupService();
      const list = [createChapterFixture({ id: "ch-1" })];
      repo.findChaptersByStudySet.mockResolvedValue(list);
      const studySetId = "11111111-1111-1111-1111-111111111111";
      const result = await service.getChaptersByStudySet(
        { studySetId },
        "user-1"
      );
      expect(guard.assertStudySetVisibleByIdOrNotFound).toHaveBeenCalledWith(
        studySetId,
        "user-1"
      );
      expect(repo.findChaptersByStudySet).toHaveBeenCalledWith(
        "user-1",
        studySetId
      );
      expect(result).toBe(list);
    });

    it("propagates NOT_FOUND from the visibility guard and skips the repo call", async ({
      expect,
    }) => {
      const { guard, repo, service } = setupService();
      guard.assertStudySetVisibleByIdOrNotFound.mockImplementation(
        throwNotFound
      );
      const studySetId = "11111111-1111-1111-1111-111111111111";
      const err = await captureError(
        service.getChaptersByStudySet({ studySetId }, "user-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
      expect(guard.assertStudySetVisibleByIdOrNotFound).toHaveBeenCalledWith(
        studySetId,
        "user-1"
      );
      expect(repo.findChaptersByStudySet).not.toHaveBeenCalled();
    });
  });

  describe("getChapter", () => {
    it("delegates to guard.assertVisibleByIdOrNotFound and returns the row", async ({
      expect,
    }) => {
      const { guard, service } = setupService();
      const expected = createChapterFixture({
        id: sampleChapterId,
        ownerId: "owner-1",
      });
      guard.assertVisibleByIdOrNotFound.mockResolvedValue(expected);
      const result = await service.getChapter(
        { id: sampleChapterId },
        "user-1"
      );
      expect(guard.assertVisibleByIdOrNotFound).toHaveBeenCalledWith(
        sampleChapterId,
        "user-1"
      );
      expect(result).toBe(expected);
    });

    it("propagates NOT_FOUND from the visibility check", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.assertVisibleByIdOrNotFound.mockImplementation(throwNotFound);
      const err = await captureError(
        service.getChapter({ id: sampleChapterId }, "user-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });
  });
});
