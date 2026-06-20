import { ORPCError } from "@orpc/server";
import { describe, it, vi } from "vitest";

import { StudySetGuard } from "../study-set/study-set.guard.ts";
import {
  createStudySetFixture,
  createMockRepository as createMockStudySetRepo,
} from "../study-set/study-set.testing.ts";
import { FlashcardSessionGuard } from "./flashcard-session.guard.ts";
import {
  captureError,
  createMockGuard as _createMockGuard,
  createMockRepository,
  createFlashcardSessionFixture,
} from "./flashcard-session.testing.ts";

const setupGuard = () => {
  const repo = createMockRepository();
  repo.findSessionById.mockResolvedValue(null);

  const flashcardRepo = {
    findFlashcardById: vi.fn().mockResolvedValue(null),
  } as unknown as import("./flashcard-session.repository.ts").FlashcardSessionRepository;

  const studySetRepo = createMockStudySetRepo();
  studySetRepo.findStudySetById.mockResolvedValue(null);
  const studySetGuard = new StudySetGuard(studySetRepo);

  const guard = new FlashcardSessionGuard(
    repo,
    studySetGuard,
    flashcardRepo as any
  );
  return { flashcardRepo: flashcardRepo as any, guard, repo, studySetRepo };
};

describe.concurrent(FlashcardSessionGuard, () => {
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
      expect(() => guard.requireUser()).toThrow(ORPCError);
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

  describe("assertSessionOwnerOrNotFound", () => {
    it("returns the session when the caller is the owner", async ({
      expect,
    }) => {
      const { guard, repo } = setupGuard();
      const session = createFlashcardSessionFixture({
        id: "fse_session1",
        userId: "user-1",
      });
      repo.findSessionById.mockResolvedValue(session);

      const result = await guard.assertSessionOwnerOrNotFound(
        "fse_session1",
        "user-1"
      );
      expect(repo.findSessionById).toHaveBeenCalledWith("fse_session1");
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
        createFlashcardSessionFixture({ id: "fse_s1", userId: "owner-1" })
      );
      const err = await captureError(
        guard.assertSessionOwnerOrNotFound("fse_s1", "other-user")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("assertFlashcardBelongsToStudySetOrValidationFailed", () => {
    it("resolves when the flashcard belongs to the study set", async ({
      expect,
    }) => {
      const { flashcardRepo, guard } = setupGuard();
      flashcardRepo.findFlashcardById.mockResolvedValue({
        id: "flc_1",
        studySetId: "set-1",
      });

      await expect(
        guard.assertFlashcardBelongsToStudySetOrValidationFailed(
          "flc_1",
          "set-1"
        )
      ).resolves.toBeUndefined();
      expect(flashcardRepo.findFlashcardById).toHaveBeenCalledWith("flc_1");
    });

    it("throws VALIDATION_FAILED when the flashcard does not exist", async ({
      expect,
    }) => {
      const { guard } = setupGuard();
      const err = await captureError(
        guard.assertFlashcardBelongsToStudySetOrValidationFailed(
          "missing",
          "set-1"
        )
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "VALIDATION_FAILED" });
    });

    it("throws VALIDATION_FAILED when the flashcard belongs to a different study set", async ({
      expect,
    }) => {
      const { flashcardRepo, guard } = setupGuard();
      flashcardRepo.findFlashcardById.mockResolvedValue({
        id: "flc_1",
        studySetId: "other-set",
      });
      const err = await captureError(
        guard.assertFlashcardBelongsToStudySetOrValidationFailed(
          "flc_1",
          "set-1"
        )
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "VALIDATION_FAILED" });
    });
  });

  describe("canViewStudySet", () => {
    it("returns true when the study set is visible", async ({ expect }) => {
      const { guard, studySetRepo } = setupGuard();
      studySetRepo.findStudySetById.mockResolvedValue(
        createStudySetFixture({ id: "set-1", visibility: "PUBLIC" })
      );
      const result = await guard.canViewStudySet("set-1", "user-1");
      expect(result).toBe(true);
    });

    it("returns false when the study set is not visible", async ({
      expect,
    }) => {
      const { guard } = setupGuard();
      const result = await guard.canViewStudySet("missing", "user-1");
      expect(result).toBe(false);
    });
  });
});
