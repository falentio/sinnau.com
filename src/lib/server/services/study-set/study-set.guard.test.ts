import { ORPCError } from "@orpc/server";
import { describe, it } from "vitest";

import { StudySetGuard } from "./study-set.guard.ts";
import {
  captureError,
  createMockRepository,
  createStudySetFixture,
  EMPTY_STUDY_SET_LIST,
} from "./study-set.testing.ts";

const setupGuard = () => {
  const repo = createMockRepository();
  repo.isSlugTaken.mockResolvedValue(false);
  repo.findStudySetById.mockResolvedValue(null);
  repo.findStudySetBySlug.mockResolvedValue(null);
  repo.findOwnedStudySets.mockResolvedValue(EMPTY_STUDY_SET_LIST);
  repo.deleteStudySet.mockResolvedValue(null);
  repo.restoreStudySet.mockResolvedValue(null);
  repo.deleteOldVisits.mockResolvedValue(0);
  repo.findRecentVisits.mockResolvedValue([]);
  repo.hasUserVisitedStudySet.mockResolvedValue(false);
  const guard = new StudySetGuard(repo);
  return { guard, repo };
};

describe.concurrent(StudySetGuard, () => {
  describe("assertOwnerOrForbidden", () => {
    it("returns the set when the caller is the owner", async ({ expect }) => {
      const { repo, guard } = setupGuard();
      const set = createStudySetFixture({ id: "set-1", ownerId: "owner-1" });
      repo.findStudySetById.mockResolvedValue(set);

      const result = await guard.assertOwnerOrForbidden("set-1", "owner-1");
      expect(repo.findStudySetById).toHaveBeenCalledWith("set-1");
      expect(result).toBe(set);
    });

    it("throws FORBIDDEN when the set does not exist", async ({ expect }) => {
      const { repo, guard } = setupGuard();
      const err = await captureError(
        guard.assertOwnerOrForbidden("missing", "owner-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "FORBIDDEN" });
      expect(repo.findStudySetById).toHaveBeenCalledWith("missing");
    });

    it("throws FORBIDDEN when caller is not the owner", async ({ expect }) => {
      const { repo, guard } = setupGuard();
      repo.findStudySetById.mockResolvedValue(
        createStudySetFixture({ id: "set-1", ownerId: "owner-1" })
      );
      const err = await captureError(
        guard.assertOwnerOrForbidden("set-1", "someone-else")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "FORBIDDEN" });
    });

    it("throws FORBIDDEN regardless of visibility when caller is not the owner", async ({
      expect,
    }) => {
      const { repo, guard } = setupGuard();
      repo.findStudySetById.mockResolvedValue(
        createStudySetFixture({
          id: "set-1",
          ownerId: "owner-1",
          visibility: "PUBLIC",
        })
      );
      const err = await captureError(
        guard.assertOwnerOrForbidden("set-1", "someone-else")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "FORBIDDEN" });
    });
  });

  describe("assertVisibleByIdOrNotFound", () => {
    it("returns the set when the caller is the owner", async ({ expect }) => {
      const { repo, guard } = setupGuard();
      const set = createStudySetFixture({
        id: "set-1",
        ownerId: "owner-1",
        visibility: "PRIVATE",
      });
      repo.findStudySetById.mockResolvedValue(set);

      const result = await guard.assertVisibleByIdOrNotFound(
        "set-1",
        "owner-1"
      );
      expect(repo.findStudySetById).toHaveBeenCalledWith("set-1");
      expect(result).toBe(set);
    });

    it("returns a PUBLIC set to any authenticated caller", async ({
      expect,
    }) => {
      const { repo, guard } = setupGuard();
      const set = createStudySetFixture({
        id: "set-1",
        ownerId: "owner-1",
        visibility: "PUBLIC",
      });
      repo.findStudySetById.mockResolvedValue(set);

      const result = await guard.assertVisibleByIdOrNotFound(
        "set-1",
        "someone-else"
      );
      expect(result).toBe(set);
    });

    it("throws NOT_FOUND when the set does not exist", async ({ expect }) => {
      const { repo, guard } = setupGuard();
      const err = await captureError(
        guard.assertVisibleByIdOrNotFound("missing", "owner-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
      expect(repo.findStudySetById).toHaveBeenCalledWith("missing");
    });

    it("throws NOT_FOUND when a non-owner requests a PRIVATE set", async ({
      expect,
    }) => {
      const { repo, guard } = setupGuard();
      repo.findStudySetById.mockResolvedValue(
        createStudySetFixture({
          id: "set-1",
          ownerId: "owner-1",
          visibility: "PRIVATE",
        })
      );
      const err = await captureError(
        guard.assertVisibleByIdOrNotFound("set-1", "someone-else")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });

    it("returns a soft-deleted set to the owner", async ({ expect }) => {
      const { repo, guard } = setupGuard();
      const set = createStudySetFixture({
        deletedAt: new Date(),
        id: "set-1",
        ownerId: "owner-1",
        visibility: "PRIVATE",
      });
      repo.findStudySetById.mockResolvedValue(set);

      const result = await guard.assertVisibleByIdOrNotFound(
        "set-1",
        "owner-1"
      );
      expect(result).toBe(set);
      expect(repo.hasUserVisitedStudySet).not.toHaveBeenCalled();
    });

    it("returns a soft-deleted PUBLIC set to a non-owner who has visited it", async ({
      expect,
    }) => {
      const { repo, guard } = setupGuard();
      const set = createStudySetFixture({
        deletedAt: new Date(),
        id: "set-1",
        ownerId: "owner-1",
        visibility: "PUBLIC",
      });
      repo.findStudySetById.mockResolvedValue(set);
      repo.hasUserVisitedStudySet.mockResolvedValue(true);

      const result = await guard.assertVisibleByIdOrNotFound(
        "set-1",
        "someone-else"
      );
      expect(result).toBe(set);
      expect(repo.hasUserVisitedStudySet).toHaveBeenCalledWith(
        "someone-else",
        "set-1"
      );
    });

    it("throws NOT_FOUND for a soft-deleted PUBLIC set when the caller has never visited", async ({
      expect,
    }) => {
      const { repo, guard } = setupGuard();
      repo.findStudySetById.mockResolvedValue(
        createStudySetFixture({
          deletedAt: new Date(),
          id: "set-1",
          ownerId: "owner-1",
          visibility: "PUBLIC",
        })
      );
      repo.hasUserVisitedStudySet.mockResolvedValue(false);

      const err = await captureError(
        guard.assertVisibleByIdOrNotFound("set-1", "someone-else")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });

    it("does not look up by slug", async ({ expect }) => {
      const { repo, guard } = setupGuard();
      repo.findStudySetById.mockResolvedValue(
        createStudySetFixture({ id: "set-1", ownerId: "owner-1" })
      );
      await guard.assertVisibleByIdOrNotFound("set-1", "owner-1");
      expect(repo.findStudySetBySlug).not.toHaveBeenCalled();
    });
  });

  describe("assertVisibleBySlugOrNotFound", () => {
    it("returns the set when the caller is the owner", async ({ expect }) => {
      const { repo, guard } = setupGuard();
      const set = createStudySetFixture({
        ownerId: "owner-1",
        slug: "my-slug-abc123",
        visibility: "PRIVATE",
      });
      repo.findStudySetBySlug.mockResolvedValue(set);

      const result = await guard.assertVisibleBySlugOrNotFound(
        "my-slug-abc123",
        "owner-1"
      );
      expect(repo.findStudySetBySlug).toHaveBeenCalledWith("my-slug-abc123");
      expect(result).toBe(set);
    });

    it("returns a PUBLIC set to any authenticated caller", async ({
      expect,
    }) => {
      const { repo, guard } = setupGuard();
      const set = createStudySetFixture({
        ownerId: "owner-1",
        slug: "my-slug-abc123",
        visibility: "PUBLIC",
      });
      repo.findStudySetBySlug.mockResolvedValue(set);

      const result = await guard.assertVisibleBySlugOrNotFound(
        "my-slug-abc123",
        "someone-else"
      );
      expect(result).toBe(set);
    });

    it("throws NOT_FOUND when the slug does not resolve to a row", async ({
      expect,
    }) => {
      const { repo, guard } = setupGuard();
      const err = await captureError(
        guard.assertVisibleBySlugOrNotFound("missing-slug", "owner-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
      expect(repo.findStudySetBySlug).toHaveBeenCalledWith("missing-slug");
    });

    it("throws NOT_FOUND when a non-owner requests a PRIVATE set", async ({
      expect,
    }) => {
      const { repo, guard } = setupGuard();
      repo.findStudySetBySlug.mockResolvedValue(
        createStudySetFixture({
          ownerId: "owner-1",
          slug: "private-slug-abc123",
          visibility: "PRIVATE",
        })
      );
      const err = await captureError(
        guard.assertVisibleBySlugOrNotFound(
          "private-slug-abc123",
          "someone-else"
        )
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });

    it("returns a soft-deleted set by slug to the owner", async ({
      expect,
    }) => {
      const { repo, guard } = setupGuard();
      const set = createStudySetFixture({
        deletedAt: new Date(),
        ownerId: "owner-1",
        slug: "deleted-slug",
        visibility: "PRIVATE",
      });
      repo.findStudySetBySlug.mockResolvedValue(set);

      const result = await guard.assertVisibleBySlugOrNotFound(
        "deleted-slug",
        "owner-1"
      );
      expect(result).toBe(set);
      expect(repo.hasUserVisitedStudySet).not.toHaveBeenCalled();
    });

    it("throws NOT_FOUND for a soft-deleted PUBLIC set by slug when the caller has never visited", async ({
      expect,
    }) => {
      const { repo, guard } = setupGuard();
      repo.findStudySetBySlug.mockResolvedValue(
        createStudySetFixture({
          deletedAt: new Date(),
          ownerId: "owner-1",
          slug: "deleted-public",
          visibility: "PUBLIC",
        })
      );
      repo.hasUserVisitedStudySet.mockResolvedValue(false);

      const err = await captureError(
        guard.assertVisibleBySlugOrNotFound("deleted-public", "someone-else")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });

    it("does not look up by id", async ({ expect }) => {
      const { repo, guard } = setupGuard();
      repo.findStudySetBySlug.mockResolvedValue(
        createStudySetFixture({ ownerId: "owner-1", slug: "slug-abc123" })
      );
      await guard.assertVisibleBySlugOrNotFound("slug-abc123", "owner-1");
      expect(repo.findStudySetById).not.toHaveBeenCalled();
    });
  });

  describe("canView", () => {
    it("returns true for a PUBLIC set viewed by a non-owner", ({ expect }) => {
      const { guard } = setupGuard();
      const set = createStudySetFixture({
        ownerId: "owner-1",
        visibility: "PUBLIC",
      });
      expect(guard.canView(set, "someone-else")).toBe(true);
    });

    it("returns true for a PUBLIC set viewed by the owner", ({ expect }) => {
      const { guard } = setupGuard();
      const set = createStudySetFixture({
        ownerId: "owner-1",
        visibility: "PUBLIC",
      });
      expect(guard.canView(set, "owner-1")).toBe(true);
    });

    it("returns true for a PRIVATE set viewed by the owner", ({ expect }) => {
      const { guard } = setupGuard();
      const set = createStudySetFixture({
        ownerId: "owner-1",
        visibility: "PRIVATE",
      });
      expect(guard.canView(set, "owner-1")).toBe(true);
    });

    it("returns false for a PRIVATE set viewed by a non-owner", ({
      expect,
    }) => {
      const { guard } = setupGuard();
      const set = createStudySetFixture({
        ownerId: "owner-1",
        visibility: "PRIVATE",
      });
      expect(guard.canView(set, "someone-else")).toBe(false);
    });
  });
});
