import { STUDY_SET_ID_PREFIX } from "$lib/schemas/study-set";
import {
  STUDY_SET_VISIT_ID_PREFIX,
  STUDY_SET_VISIT_TTL_MS,
} from "$lib/schemas/study-set.constant";
import { ORPCError } from "@orpc/server";
import { describe, it } from "vitest";

import type { StudySetVisit } from "../../infras/db/schema/study-set.ts";
import { generateId } from "../../utils/nanoid.ts";
import type { StudySetGuard } from "./study-set.guard.ts";
import { StudySetService } from "./study-set.service.ts";
import {
  captureError,
  createMockGuard,
  createMockRepository,
  createStudySetFixture,
  EMPTY_STUDY_SET_LIST,
} from "./study-set.testing.ts";

const setupService = () => {
  const repo = createMockRepository();
  const guard = createMockGuard();

  // Repo defaults so individual tests only override the methods they care about.
  repo.isSlugTaken.mockResolvedValue(false);
  // oxlint-disable-next-line require-await
  repo.insertStudySet.mockImplementation(async (row) => ({
    ...createStudySetFixture(),
    ...row,
  }));
  repo.updateStudySet.mockResolvedValue(null);
  repo.deleteStudySet.mockResolvedValue(false);
  repo.findStudySetById.mockResolvedValue(null);
  repo.findStudySetBySlug.mockResolvedValue(null);
  repo.findOwnedStudySets.mockResolvedValue(EMPTY_STUDY_SET_LIST);
  repo.upsertVisit.mockImplementation(
    // oxlint-disable-next-line require-await
    async (userId, studySetId, visitedAt) =>
      Promise.resolve({
        id: generateId(STUDY_SET_VISIT_ID_PREFIX),
        studySetId,
        userId,
        visitedAt: new Date(visitedAt),
      }) satisfies Promise<StudySetVisit>
  );
  repo.deleteOldVisits.mockResolvedValue(0);
  repo.findRecentVisits.mockResolvedValue([]);

  // Guard defaults: happy-path passthrough so tests only configure failures explicitly.
  guard.assertOwnerOrForbidden.mockResolvedValue(createStudySetFixture());
  guard.assertVisibleByIdOrNotFound.mockResolvedValue(createStudySetFixture());
  guard.assertVisibleBySlugOrNotFound.mockResolvedValue(
    createStudySetFixture()
  );
  const service = new StudySetService(repo, guard as unknown as StudySetGuard);
  return { guard, repo, service };
};

const throwForbidden = (): never => {
  throw new ORPCError("FORBIDDEN", {
    message: "Cannot modify a study set you do not own",
  });
};

const throwNotFound = (): never => {
  throw new ORPCError("NOT_FOUND", { message: "Study set not found" });
};

describe.concurrent(StudySetService, () => {
  describe("createStudySet", () => {
    it("creates a study set with generated slug, default visibility, and empty files", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      const result = await service.createStudySet(
        { title: "Biology 101" },
        "owner-1"
      );
      expect(repo.isSlugTaken).toHaveBeenCalled();
      expect(repo.insertStudySet).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          files: [],
          ownerId: "owner-1",
          title: "Biology 101",
          visibility: "PUBLIC",
        })
      );
      const inserted = repo.insertStudySet.mock.calls[0]?.[0];
      expect(inserted?.slug).toMatch(/^biology-101-[0-9A-Za-z]{8}$/u);
      expect(result.title).toBe("Biology 101");
      expect(result.ownerId).toBe("owner-1");
      expect(result.visibility).toBe("PUBLIC");
      expect(result.files).toEqual([]);
    });

    it("honors explicit PRIVATE visibility and files array", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      const created = createStudySetFixture({
        files: ["a.pdf", "b.png"],
        title: "Private Set",
        visibility: "PRIVATE",
      });
      repo.insertStudySet.mockResolvedValue(created);

      const result = await service.createStudySet(
        {
          files: ["a.pdf", "b.png"],
          title: "Private Set",
          visibility: "PRIVATE",
        },
        "owner-1"
      );

      expect(repo.insertStudySet).toHaveBeenCalledWith(
        expect.objectContaining({
          files: ["a.pdf", "b.png"],
          visibility: "PRIVATE",
        })
      );
      expect(result.visibility).toBe("PRIVATE");
      expect(result.files).toEqual(["a.pdf", "b.png"]);
    });

    it("uses short random slug when sanitized title is too short", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      await service.createStudySet({ title: "ab" }, "owner-1");
      const inserted = repo.insertStudySet.mock.calls[0]?.[0];
      expect(inserted?.slug).toMatch(/^[0-9A-Za-z]{12}$/u);
    });

    it("consults the repo via isSlugTaken for each generated candidate", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      await service.createStudySet({ title: "Biology 101" }, "owner-1");
      const candidates = repo.isSlugTaken.mock.calls.map(([c]) => c);
      expect(candidates.length).toBeGreaterThan(0);
      for (const candidate of candidates) {
        expect(candidate).toMatch(/^biology-101-[0-9A-Za-z]{8}$/u);
      }
    });
  });

  describe("updateStudySet", () => {
    it("propagates FORBIDDEN from guard.assertOwnerOrForbidden", async ({
      expect,
    }) => {
      const { repo, guard, service } = setupService();
      guard.assertOwnerOrForbidden.mockImplementation(throwForbidden);
      const err = await captureError(
        service.updateStudySet({ id: "set-1", title: "X" }, "owner-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "FORBIDDEN" });
      expect(guard.assertOwnerOrForbidden).toHaveBeenCalledWith(
        "set-1",
        "owner-1"
      );
      expect(repo.updateStudySet).not.toHaveBeenCalled();
    });

    it("updates allowed fields, preserves slug, and replaces files entirely", async ({
      expect,
    }) => {
      const { repo, guard, service } = setupService();
      const existing = createStudySetFixture({
        files: ["x.txt", "y.txt"],
        id: "set-1",
        ownerId: "owner-1",
        slug: "original-slug-abc123",
        title: "Original Title",
        visibility: "PUBLIC",
      });
      guard.assertOwnerOrForbidden.mockResolvedValue(existing);
      // oxlint-disable-next-line require-await
      repo.updateStudySet.mockImplementation(async (_id, _ownerId, patch) => ({
        ...existing,
        ...patch,
        updatedAt: new Date(),
      }));

      const result = await service.updateStudySet(
        {
          files: ["only.pdf"],
          id: "set-1",
          title: "Renamed",
          visibility: "PRIVATE",
        },
        "owner-1"
      );

      expect(repo.updateStudySet).toHaveBeenCalledWith(
        "set-1",
        "owner-1",
        expect.objectContaining({
          files: ["only.pdf"],
          title: "Renamed",
          visibility: "PRIVATE",
        })
      );
      expect(result.title).toBe("Renamed");
      expect(result.visibility).toBe("PRIVATE");
      expect(result.files).toEqual(["only.pdf"]);
      expect(result.slug).toBe("original-slug-abc123");
    });

    it("clears description when null is sent in update", async ({ expect }) => {
      const { repo, guard, service } = setupService();
      const existing = createStudySetFixture({
        description: "old description",
        id: "set-1",
        ownerId: "owner-1",
      });
      guard.assertOwnerOrForbidden.mockResolvedValue(existing);
      // oxlint-disable-next-line require-await
      repo.updateStudySet.mockImplementation(async (_id, _ownerId, patch) => ({
        ...existing,
        ...patch,
        updatedAt: new Date(),
      }));

      const result = await service.updateStudySet(
        { description: null, id: "set-1" },
        "owner-1"
      );
      expect(repo.updateStudySet).toHaveBeenCalledWith(
        "set-1",
        "owner-1",
        expect.objectContaining({ description: null })
      );
      expect(result.description).toBe(null);
    });

    it("returns the existing row without calling update when patch is empty", async ({
      expect,
    }) => {
      const { repo, guard, service } = setupService();
      const existing = createStudySetFixture({
        id: "set-1",
        ownerId: "owner-1",
        title: "Original Title",
      });
      guard.assertOwnerOrForbidden.mockResolvedValue(existing);

      const result = await service.updateStudySet({ id: "set-1" }, "owner-1");
      expect(result).toBe(existing);
      expect(repo.updateStudySet).not.toHaveBeenCalled();
    });

    it("throws NOT_FOUND when repo update returns null", async ({ expect }) => {
      const { repo, guard, service } = setupService();
      guard.assertOwnerOrForbidden.mockResolvedValue(
        createStudySetFixture({ id: "set-1", ownerId: "owner-1" })
      );
      repo.updateStudySet.mockResolvedValue(null);

      const err = await captureError(
        service.updateStudySet({ id: "set-1", title: "New" }, "owner-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("deleteStudySet", () => {
    it("throws NOT_FOUND when repo reports nothing was deleted", async ({
      expect,
    }) => {
      const { service } = setupService();
      const err = await captureError(
        service.deleteStudySet(
          { id: generateId(STUDY_SET_ID_PREFIX) },
          "owner-1"
        )
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });

    it("passes the id and owner to the repo when owner matches", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.deleteStudySet.mockResolvedValue(true);
      await service.deleteStudySet({ id: "set-1" }, "owner-1");
      expect(repo.deleteStudySet).toHaveBeenCalledWith("set-1", "owner-1");
    });
  });

  describe("getStudySets", () => {
    it("forwards default pagination (orderBy=createdAt, orderDirection=desc, page=1)", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      await service.getStudySets({}, "owner-1");
      expect(repo.findOwnedStudySets).toHaveBeenCalledWith(
        "owner-1",
        "createdAt",
        "desc",
        1
      );
    });

    it("forwards requested pagination options", async ({ expect }) => {
      const { repo, service } = setupService();
      await service.getStudySets(
        {
          pagination: { orderBy: "updatedAt", orderDirection: "asc", page: 2 },
        },
        "owner-1"
      );
      expect(repo.findOwnedStudySets).toHaveBeenCalledWith(
        "owner-1",
        "updatedAt",
        "asc",
        2
      );
    });
  });

  describe("getStudySet", () => {
    it("delegates to guard.assertVisibleByIdOrNotFound when input has an id", async ({
      expect,
    }) => {
      const { guard, service } = setupService();
      const expected = createStudySetFixture({
        id: "set-1",
        ownerId: "owner-1",
      });
      guard.assertVisibleByIdOrNotFound.mockResolvedValue(expected);

      const result = await service.getStudySet({ id: "set-1" }, "owner-1");
      expect(guard.assertVisibleByIdOrNotFound).toHaveBeenCalledWith(
        "set-1",
        "owner-1"
      );
      expect(guard.assertVisibleBySlugOrNotFound).not.toHaveBeenCalled();
      expect(result).toBe(expected);
    });

    it("delegates to guard.assertVisibleBySlugOrNotFound when input has a slug", async ({
      expect,
    }) => {
      const { guard, service } = setupService();
      const expected = createStudySetFixture({
        id: "set-1",
        slug: "slug-abc123",
      });
      guard.assertVisibleBySlugOrNotFound.mockResolvedValue(expected);

      const result = await service.getStudySet(
        { slug: "slug-abc123" },
        "owner-1"
      );
      expect(guard.assertVisibleBySlugOrNotFound).toHaveBeenCalledWith(
        "slug-abc123",
        "owner-1"
      );
      expect(guard.assertVisibleByIdOrNotFound).not.toHaveBeenCalled();
      expect(result).toBe(expected);
    });

    it("propagates NOT_FOUND from the id visibility check", async ({
      expect,
    }) => {
      const { guard, service } = setupService();
      guard.assertVisibleByIdOrNotFound.mockImplementation(throwNotFound);
      const err = await captureError(
        service.getStudySet({ id: generateId(STUDY_SET_ID_PREFIX) }, "owner-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });

    it("propagates NOT_FOUND from the slug visibility check", async ({
      expect,
    }) => {
      const { guard, service } = setupService();
      guard.assertVisibleBySlugOrNotFound.mockImplementation(throwNotFound);
      const err = await captureError(
        service.getStudySet({ slug: "missing-slug" }, "owner-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("refreshStudySetVisit", () => {
    it("upserts the visit with the current timestamp and returns it", async ({
      expect,
    }) => {
      const { repo, guard, service } = setupService();
      guard.assertVisibleByIdOrNotFound.mockResolvedValue(
        createStudySetFixture({ id: "set-1", ownerId: "owner-1" })
      );
      const result = await service.refreshStudySetVisit(
        { studySetId: "set-1" },
        "owner-1"
      );

      expect(guard.assertVisibleByIdOrNotFound).toHaveBeenCalledWith(
        "set-1",
        "owner-1"
      );
      expect(repo.upsertVisit).toHaveBeenCalledWith(
        "owner-1",
        "set-1",
        expect.any(Number)
      );
      expect(result.visitedAt).toEqual(expect.any(Number));
    });

    it("propagates NOT_FOUND from the visibility check and skips upsert", async ({
      expect,
    }) => {
      const { repo, guard, service } = setupService();
      guard.assertVisibleByIdOrNotFound.mockImplementation(throwNotFound);
      const err = await captureError(
        service.refreshStudySetVisit({ studySetId: "set-1" }, "other")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
      expect(repo.upsertVisit).not.toHaveBeenCalled();
    });
  });

  describe("getRecentStudySets", () => {
    it("forwards user and count to the repo and returns its result", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      const sets = [createStudySetFixture({ id: "set-1" })];
      repo.findRecentVisits.mockResolvedValue(sets);
      const result = await service.getRecentStudySets({ count: 5 }, "owner-1");
      expect(repo.findRecentVisits).toHaveBeenCalledWith("owner-1", 5);
      expect(result).toBe(sets);
    });
  });

  describe("cleanupOldStudySetVisits", () => {
    it("passes a cutoff of now - TTL and returns the deleted count", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.deleteOldVisits.mockResolvedValue(3);
      const before = Date.now();
      const result = await service.cleanupOldStudySetVisits();
      const after = Date.now();

      expect(repo.deleteOldVisits).toHaveBeenCalledOnce();
      const cutoff = repo.deleteOldVisits.mock.calls[0]?.[0] ?? 0;
      expect(cutoff).toBeGreaterThanOrEqual(before - STUDY_SET_VISIT_TTL_MS);
      expect(cutoff).toBeLessThanOrEqual(after - STUDY_SET_VISIT_TTL_MS);
      expect(result).toEqual({ deletedCount: 3 });
    });
  });
});
