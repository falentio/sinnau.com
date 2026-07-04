import { ORPCError } from "@orpc/server";
import { describe, it, vi } from "vitest";

import type { Flashcard } from "../../infras/db/schema/flashcard.ts";
import { StudySetGuard } from "../study-set/study-set.guard.ts";
import {
  createStudySetFixture,
  createMockRepository as createMockStudySetRepo,
} from "../study-set/study-set.testing.ts";
import { FlashcardSessionGuard } from "./flashcard-session.guard.ts";
import {
  captureError,
  createMockRepository,
  createFlashcardSessionFixture,
} from "./flashcard-session.testing.ts";

const setupGuard = () => {
  const repo = createMockRepository();
  repo.findSessionById.mockResolvedValue(null);

  const flashcardGuard = {
    assertFlashcardExistsOrNotFound: vi
      .fn<(id: string) => Promise<Flashcard>>()
      .mockResolvedValue({
        back: "back",
        chapterId: null,
        createdAt: new Date(),
        front: "front",
        hint: null,
        id: "flc_placeholder",
        importance: 0,
        isAiGenerated: false,
        ownerId: "user-1",
        studySetId: "set-1",
        updatedAt: new Date(),
      } as Flashcard),
  };

  const studySetRepo = createMockStudySetRepo();
  studySetRepo.findStudySetById.mockResolvedValue(null);
  const studySetGuard = new StudySetGuard(studySetRepo);

  const guard = new FlashcardSessionGuard(
    repo,
    studySetGuard,
    // oxlint-disable-next-line no-unsafe-type-assertion
    flashcardGuard as unknown as ConstructorParameters<
      typeof FlashcardSessionGuard
    >[2]
  );
  return { flashcardGuard, guard, repo, studySetRepo };
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
      const userId: string | undefined = undefined;
      expect(() => guard.requireUser(userId)).toThrow(ORPCError);
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

  describe("assertFlashcardBelongsToStudySetOrNotFound", () => {
    it("resolves and returns the flashcard when it belongs to the study set", async ({
      expect,
    }) => {
      const { flashcardGuard, guard } = setupGuard();
      const card = {
        back: "back",
        chapterId: null,
        createdAt: new Date(),
        front: "front",
        hint: null,
        id: "flc_1",
        importance: 0,
        isAiGenerated: false,
        ownerId: "user-1",
        studySetId: "set-1",
        updatedAt: new Date(),
      } as Flashcard;
      flashcardGuard.assertFlashcardExistsOrNotFound.mockResolvedValue(card);

      const result = await guard.assertFlashcardBelongsToStudySetOrNotFound(
        "flc_1",
        "set-1"
      );
      expect(result).toBe(card);
      expect(
        flashcardGuard.assertFlashcardExistsOrNotFound
      ).toHaveBeenCalledWith("flc_1");
    });

    it("propagates NOT_FOUND from assertFlashcardExistsOrNotFound when the flashcard does not exist", async ({
      expect,
    }) => {
      const { flashcardGuard, guard } = setupGuard();
      flashcardGuard.assertFlashcardExistsOrNotFound.mockImplementation(
        async () => {
          throw new ORPCError("NOT_FOUND", { message: "Flashcard not found" });
        }
      );
      const err = await captureError(
        guard.assertFlashcardBelongsToStudySetOrNotFound("missing", "set-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws VALIDATION_FAILED when the flashcard belongs to a different study set", async ({
      expect,
    }) => {
      const { flashcardGuard, guard } = setupGuard();
      flashcardGuard.assertFlashcardExistsOrNotFound.mockResolvedValue({
        back: "back",
        chapterId: null,
        createdAt: new Date(),
        front: "front",
        hint: null,
        id: "flc_1",
        importance: 0,
        isAiGenerated: false,
        ownerId: "user-1",
        studySetId: "other-set",
        updatedAt: new Date(),
      } as Flashcard);
      const err = await captureError(
        guard.assertFlashcardBelongsToStudySetOrNotFound("flc_1", "set-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "VALIDATION_FAILED" });
    });
  });
});
