import { ORPCError } from "@orpc/server";
import { describe, it } from "vitest";

import type { StudySetContentGuard } from "./study-set-content.guard.ts";
import { StudySetContentService } from "./study-set-content.service.ts";
import {
  captureError,
  createStudySetContentFixture,
  createStudySetContentWithChaptersFixture,
  createMockGuard,
  createMockRepository,
  EMPTY_CONTENT_LIST,
} from "./study-set-content.testing.ts";

const setupService = () => {
  const repo = createMockRepository();
  const guard = createMockGuard();

  // oxlint-disable-next-line require-await
  repo.insertContent.mockImplementation(async (row) =>
    createStudySetContentFixture(row)
  );
  repo.updateContent.mockResolvedValue(null);
  repo.deleteContent.mockResolvedValue(false);
  repo.findContentById.mockResolvedValue(null);
  repo.findContentByIdWithChapters.mockResolvedValue(null);
  repo.findContentsByStudySet.mockResolvedValue(EMPTY_CONTENT_LIST);
  repo.findContentsByChapter.mockResolvedValue(EMPTY_CONTENT_LIST);
  repo.linkChapter.mockResolvedValue({ chapterId: "ch-1", contentId: "ssc-1" });
  repo.unlinkChapter.mockResolvedValue(false);
  repo.setChapters.mockResolvedValue();
  repo.findChapterById.mockResolvedValue(null);

  guard.assertContentOwnerOrForbidden.mockResolvedValue(
    createStudySetContentFixture()
  );
  guard.assertContentVisibleByIdOrNotFound.mockResolvedValue(
    createStudySetContentFixture()
  );
  guard.assertStudySetOwnerOrForbidden.mockResolvedValue();
  guard.assertStudySetVisibleByIdOrNotFound.mockResolvedValue();

  const service = new StudySetContentService(
    repo,
    guard as unknown as StudySetContentGuard
  );
  return { guard, repo, service };
};

const throwForbidden = (): never => {
  throw new ORPCError("FORBIDDEN", { message: "Forbidden" });
};

const throwNotFound = (): never => {
  throw new ORPCError("NOT_FOUND", { message: "Not found" });
};

const sampleStudySetId = "11111111-1111-1111-1111-111111111111";
const sampleContentId = "22222222-2222-2222-2222-222222222222";
const sampleChapterId = "33333333-3333-3333-3333-333333333333";

describe.concurrent(StudySetContentService, () => {
  describe("createContent", () => {
    it("propagates FORBIDDEN from guard.assertStudySetOwnerOrForbidden", async ({
      expect,
    }) => {
      const { guard, repo, service } = setupService();
      guard.assertStudySetOwnerOrForbidden.mockImplementation(throwForbidden);
      const err = await captureError(
        service.createContent(
          { content: "test content", studySetId: sampleStudySetId },
          "owner-1"
        )
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "FORBIDDEN" });
      expect(repo.insertContent).not.toHaveBeenCalled();
    });

    it("creates content and returns it with empty chapterIds", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      const inserted = createStudySetContentFixture({
        content: "test content",
        id: "ssc-created",
        studySetId: sampleStudySetId,
      });
      repo.insertContent.mockResolvedValue(inserted);
      repo.findContentByIdWithChapters.mockResolvedValue(
        createStudySetContentWithChaptersFixture({
          chapterIds: [],
          content: "test content",
          id: "ssc-created",
        })
      );
      const result = await service.createContent(
        { content: "test content", studySetId: sampleStudySetId },
        "owner-1"
      );
      expect(repo.insertContent).toHaveBeenCalledOnce();
      expect(result.content).toBe("test content");
      expect(result.chapterIds).toEqual([]);
    });

    it("creates content with initial chapter links when chapterIds provided", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      const inserted = createStudySetContentFixture({
        id: "ssc-created",
        studySetId: sampleStudySetId,
      });
      repo.insertContent.mockResolvedValue(inserted);
      repo.findContentByIdWithChapters.mockResolvedValue(
        createStudySetContentWithChaptersFixture({
          chapterIds: [sampleChapterId],
          id: "ssc-created",
        })
      );
      const result = await service.createContent(
        {
          chapterIds: [sampleChapterId],
          content: "test content",
          studySetId: sampleStudySetId,
        },
        "owner-1"
      );
      expect(repo.setChapters).toHaveBeenCalledWith("ssc-created", [
        sampleChapterId,
      ]);
      expect(result.chapterIds).toEqual([sampleChapterId]);
    });
  });

  describe("updateContent", () => {
    it("propagates FORBIDDEN from guard.assertContentOwnerOrForbidden", async ({
      expect,
    }) => {
      const { guard, repo, service } = setupService();
      guard.assertContentOwnerOrForbidden.mockImplementation(throwForbidden);
      const err = await captureError(
        service.updateContent(
          { content: "updated", id: sampleContentId },
          "owner-1"
        )
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "FORBIDDEN" });
      expect(repo.updateContent).not.toHaveBeenCalled();
    });

    it("updates content and returns with chapterIds", async ({ expect }) => {
      const { repo, guard, service } = setupService();
      const existing = createStudySetContentFixture({
        id: sampleContentId,
        studySetId: sampleStudySetId,
      });
      guard.assertContentOwnerOrForbidden.mockResolvedValue(existing);
      const updated = createStudySetContentFixture({
        content: "updated content",
        id: sampleContentId,
      });
      repo.updateContent.mockResolvedValue(updated);
      repo.findContentByIdWithChapters.mockResolvedValue(
        createStudySetContentWithChaptersFixture({
          chapterIds: ["ch-1"],
          content: "updated content",
          id: sampleContentId,
        })
      );
      const result = await service.updateContent(
        { content: "updated content", id: sampleContentId },
        "owner-1"
      );
      expect(repo.updateContent).toHaveBeenCalledWith(
        sampleContentId,
        sampleStudySetId,
        expect.objectContaining({ content: "updated content" })
      );
      expect(result.content).toBe("updated content");
    });

    it("throws NOT_FOUND when repo update returns null", async ({ expect }) => {
      const { repo, guard, service } = setupService();
      guard.assertContentOwnerOrForbidden.mockResolvedValue(
        createStudySetContentFixture({
          id: sampleContentId,
          studySetId: sampleStudySetId,
        })
      );
      repo.updateContent.mockResolvedValue(null);
      const err = await captureError(
        service.updateContent(
          { content: "updated", id: sampleContentId },
          "owner-1"
        )
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("deleteContent", () => {
    it("propagates FORBIDDEN from guard.assertContentOwnerOrForbidden", async ({
      expect,
    }) => {
      const { guard, repo, service } = setupService();
      guard.assertContentOwnerOrForbidden.mockImplementation(throwForbidden);
      const err = await captureError(
        service.deleteContent({ id: sampleContentId }, "owner-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "FORBIDDEN" });
      expect(repo.deleteContent).not.toHaveBeenCalled();
    });

    it("deletes the content and succeeds", async ({ expect }) => {
      const { repo, guard, service } = setupService();
      guard.assertContentOwnerOrForbidden.mockResolvedValue(
        createStudySetContentFixture({
          id: sampleContentId,
          studySetId: sampleStudySetId,
        })
      );
      repo.deleteContent.mockResolvedValue(true);
      await expect(
        service.deleteContent({ id: sampleContentId }, "owner-1")
      ).resolves.toBeUndefined();
      expect(repo.deleteContent).toHaveBeenCalledWith(
        sampleContentId,
        sampleStudySetId
      );
    });

    it("throws NOT_FOUND when repo reports nothing was deleted", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.deleteContent.mockResolvedValue(false);
      const err = await captureError(
        service.deleteContent({ id: sampleContentId }, "owner-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("getContent", () => {
    it("returns content with chapterIds after visibility check", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findContentByIdWithChapters.mockResolvedValue(
        createStudySetContentWithChaptersFixture({
          chapterIds: ["ch-1", "ch-2"],
          id: sampleContentId,
        })
      );
      const result = await service.getContent(
        { id: sampleContentId },
        "user-1"
      );
      expect(result.id).toBe(sampleContentId);
      expect(result.chapterIds).toEqual(["ch-1", "ch-2"]);
    });

    it("propagates NOT_FOUND from visibility check", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.assertContentVisibleByIdOrNotFound.mockImplementation(
        throwNotFound
      );
      const err = await captureError(
        service.getContent({ id: sampleContentId }, "user-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("listContentsByStudySet", () => {
    it("returns contents after study set visibility check", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      const list = [
        createStudySetContentWithChaptersFixture({ id: "ssc-1" }),
        createStudySetContentWithChaptersFixture({ id: "ssc-2" }),
      ];
      repo.findContentsByStudySet.mockResolvedValue(list);
      const result = await service.listContentsByStudySet(
        { studySetId: sampleStudySetId },
        "user-1"
      );
      expect(result).toBe(list);
      expect(repo.findContentsByStudySet).toHaveBeenCalledWith(
        sampleStudySetId
      );
    });

    it("propagates NOT_FOUND when study set is not visible", async ({
      expect,
    }) => {
      const { guard, service } = setupService();
      guard.assertStudySetVisibleByIdOrNotFound.mockImplementation(
        throwNotFound
      );
      const err = await captureError(
        service.listContentsByStudySet(
          { studySetId: sampleStudySetId },
          "user-1"
        )
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("listContentsByChapter", () => {
    it("returns contents after chapter visibility check", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findChapterById.mockResolvedValue({
        id: sampleChapterId,
        studySetId: sampleStudySetId,
      });
      const list = [createStudySetContentWithChaptersFixture({ id: "ssc-1" })];
      repo.findContentsByChapter.mockResolvedValue(list);
      const result = await service.listContentsByChapter(
        { chapterId: sampleChapterId },
        "user-1"
      );
      expect(result).toBe(list);
      expect(repo.findContentsByChapter).toHaveBeenCalledWith(sampleChapterId);
    });

    it("throws NOT_FOUND when chapter does not exist", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findChapterById.mockResolvedValue(null);
      const err = await captureError(
        service.listContentsByChapter({ chapterId: sampleChapterId }, "user-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws NOT_FOUND when study set is not visible", async ({ expect }) => {
      const { repo, guard, service } = setupService();
      repo.findChapterById.mockResolvedValue({
        id: sampleChapterId,
        studySetId: sampleStudySetId,
      });
      guard.assertStudySetVisibleByIdOrNotFound.mockImplementation(
        throwNotFound
      );
      const err = await captureError(
        service.listContentsByChapter({ chapterId: sampleChapterId }, "user-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("linkChapter", () => {
    it("links a chapter to content in the same study set", async ({
      expect,
    }) => {
      const { repo, guard, service } = setupService();
      guard.assertContentOwnerOrForbidden.mockResolvedValue(
        createStudySetContentFixture({
          id: sampleContentId,
          studySetId: sampleStudySetId,
        })
      );
      repo.findChapterById.mockResolvedValue({
        id: sampleChapterId,
        studySetId: sampleStudySetId,
      });
      repo.linkChapter.mockResolvedValue({
        chapterId: sampleChapterId,
        contentId: sampleContentId,
      });
      await expect(
        service.linkChapter(
          { chapterId: sampleChapterId, contentId: sampleContentId },
          "owner-1"
        )
      ).resolves.toBeUndefined();
    });

    it("throws FORBIDDEN when chapter is in a different study set", async ({
      expect,
    }) => {
      const { repo, guard, service } = setupService();
      guard.assertContentOwnerOrForbidden.mockResolvedValue(
        createStudySetContentFixture({
          id: sampleContentId,
          studySetId: sampleStudySetId,
        })
      );
      repo.findChapterById.mockResolvedValue({
        id: sampleChapterId,
        studySetId: "other-study-set",
      });
      const err = await captureError(
        service.linkChapter(
          { chapterId: sampleChapterId, contentId: sampleContentId },
          "owner-1"
        )
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "FORBIDDEN" });
    });

    it("throws NOT_FOUND when chapter does not exist", async ({ expect }) => {
      const { repo, guard, service } = setupService();
      guard.assertContentOwnerOrForbidden.mockResolvedValue(
        createStudySetContentFixture({
          id: sampleContentId,
          studySetId: sampleStudySetId,
        })
      );
      repo.findChapterById.mockResolvedValue(null);
      const err = await captureError(
        service.linkChapter(
          { chapterId: sampleChapterId, contentId: sampleContentId },
          "owner-1"
        )
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws NOT_FOUND when link returns null (duplicate or missing content)", async ({
      expect,
    }) => {
      const { repo, guard, service } = setupService();
      guard.assertContentOwnerOrForbidden.mockResolvedValue(
        createStudySetContentFixture({
          id: sampleContentId,
          studySetId: sampleStudySetId,
        })
      );
      repo.findChapterById.mockResolvedValue({
        id: sampleChapterId,
        studySetId: sampleStudySetId,
      });
      repo.linkChapter.mockResolvedValue(null);
      const err = await captureError(
        service.linkChapter(
          { chapterId: sampleChapterId, contentId: sampleContentId },
          "owner-1"
        )
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("unlinkChapter", () => {
    it("removes a chapter link from content", async ({ expect }) => {
      const { repo, guard, service } = setupService();
      guard.assertContentOwnerOrForbidden.mockResolvedValue(
        createStudySetContentFixture({
          id: sampleContentId,
          studySetId: sampleStudySetId,
        })
      );
      repo.unlinkChapter.mockResolvedValue(true);
      await expect(
        service.unlinkChapter(
          { chapterId: sampleChapterId, contentId: sampleContentId },
          "owner-1"
        )
      ).resolves.toBeUndefined();
    });

    it("throws NOT_FOUND when link does not exist", async ({ expect }) => {
      const { repo, guard, service } = setupService();
      guard.assertContentOwnerOrForbidden.mockResolvedValue(
        createStudySetContentFixture({
          id: sampleContentId,
          studySetId: sampleStudySetId,
        })
      );
      repo.unlinkChapter.mockResolvedValue(false);
      const err = await captureError(
        service.unlinkChapter(
          { chapterId: sampleChapterId, contentId: sampleContentId },
          "owner-1"
        )
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });

    it("propagates FORBIDDEN from guard", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.assertContentOwnerOrForbidden.mockImplementation(throwForbidden);
      const err = await captureError(
        service.unlinkChapter(
          { chapterId: sampleChapterId, contentId: sampleContentId },
          "owner-1"
        )
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "FORBIDDEN" });
    });
  });

  describe("setChapters", () => {
    it("replaces all chapter links", async ({ expect }) => {
      const { repo, guard, service } = setupService();
      guard.assertContentOwnerOrForbidden.mockResolvedValue(
        createStudySetContentFixture({
          id: sampleContentId,
          studySetId: sampleStudySetId,
        })
      );
      repo.findChapterById.mockResolvedValue({
        id: sampleChapterId,
        studySetId: sampleStudySetId,
      });
      await service.setChapters(
        { chapterIds: [sampleChapterId], contentId: sampleContentId },
        "owner-1"
      );
      expect(repo.setChapters).toHaveBeenCalledWith(sampleContentId, [
        sampleChapterId,
      ]);
    });

    it("allows empty chapterIds array to clear all links", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      await service.setChapters(
        { chapterIds: [], contentId: sampleContentId },
        "owner-1"
      );
      expect(repo.setChapters).toHaveBeenCalledWith(sampleContentId, []);
    });

    it("throws NOT_FOUND when a chapter does not exist", async ({ expect }) => {
      const { repo, guard, service } = setupService();
      guard.assertContentOwnerOrForbidden.mockResolvedValue(
        createStudySetContentFixture({
          id: sampleContentId,
          studySetId: sampleStudySetId,
        })
      );
      repo.findChapterById.mockResolvedValue(null);
      const err = await captureError(
        service.setChapters(
          { chapterIds: [sampleChapterId], contentId: sampleContentId },
          "owner-1"
        )
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws FORBIDDEN when a chapter is in a different study set", async ({
      expect,
    }) => {
      const { repo, guard, service } = setupService();
      guard.assertContentOwnerOrForbidden.mockResolvedValue(
        createStudySetContentFixture({
          id: sampleContentId,
          studySetId: sampleStudySetId,
        })
      );
      repo.findChapterById.mockResolvedValue({
        id: sampleChapterId,
        studySetId: "other-study-set",
      });
      const err = await captureError(
        service.setChapters(
          { chapterIds: [sampleChapterId], contentId: sampleContentId },
          "owner-1"
        )
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "FORBIDDEN" });
    });
  });
});
