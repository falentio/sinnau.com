import { chapter } from "$lib/server/infras/db/schema/chapter";
import { studySet } from "$lib/server/infras/db/schema/study-set";
import {
  studySetContent,
  studySetContentToChapter,
} from "$lib/server/infras/db/schema/study-set-content";
import { eq } from "drizzle-orm";
import { describe, it } from "vitest";

import { StudySetContentTestEnv } from "./study-set-content.testing";

describe.concurrent("StudySetContentDrizzleRepository", () => {
  describe("insertContent", () => {
    it("persists the row and returns it with timestamps", async ({
      expect,
    }) => {
      await using env = new StudySetContentTestEnv();
      const before = Date.now();
      const created = await env.repo.insertContent({
        content: "This is study content",
        id: "ssc-1",
        studySetId: env.studySetId,
      });
      const after = Date.now();

      expect(created.id).toBe("ssc-1");
      expect(created.studySetId).toBe(env.studySetId);
      expect(created.content).toBe("This is study content");
      expect(created.createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(created.createdAt.getTime()).toBeLessThanOrEqual(after);
      expect(created.updatedAt.getTime()).toBeGreaterThanOrEqual(before);

      const rows = env.db
        .select()
        .from(studySetContent)
        .where(eq(studySetContent.id, "ssc-1"))
        .all();
      expect(rows).toHaveLength(1);
    });

    it("allows inserting the max-length content string", async ({ expect }) => {
      await using env = new StudySetContentTestEnv();
      const longContent = "a".repeat(50_000);
      const created = await env.repo.insertContent({
        content: longContent,
        id: "ssc-long",
        studySetId: env.studySetId,
      });
      expect(created.content).toBe(longContent);
    });
  });

  describe("updateContent", () => {
    it("updates content when id and studySetId match", async ({ expect }) => {
      await using env = new StudySetContentTestEnv();
      await env.seedContent({ content: "Original content", id: "ssc-1" });
      const updated = await env.repo.updateContent("ssc-1", env.studySetId, {
        content: "Updated content",
      });
      expect(updated).not.toBeNull();
      expect(updated).toHaveProperty("content", "Updated content");
    });

    it("returns null when the id does not exist", async ({ expect }) => {
      await using env = new StudySetContentTestEnv();
      expect(
        await env.repo.updateContent("missing", env.studySetId, {
          content: "X",
        })
      ).toBeNull();
    });

    it("returns null when studySetId does not match", async ({ expect }) => {
      await using env = new StudySetContentTestEnv();
      await env.seedContent({ id: "ssc-1", studySetId: env.studySetId });
      const result = await env.repo.updateContent(
        "ssc-1",
        env.otherStudySetId,
        {
          content: "Hacked",
        }
      );
      expect(result).toBeNull();
      const [row] = env.db
        .select()
        .from(studySetContent)
        .where(eq(studySetContent.id, "ssc-1"))
        .all();
      expect(row?.content).toBe("Default content text");
    });
  });

  describe("deleteContent", () => {
    it("returns true and removes the row", async ({ expect }) => {
      await using env = new StudySetContentTestEnv();
      await env.seedContent({ id: "ssc-1" });
      const ok = await env.repo.deleteContent("ssc-1", env.studySetId);
      expect(ok).toBe(true);
      expect(
        env.db
          .select()
          .from(studySetContent)
          .where(eq(studySetContent.id, "ssc-1"))
          .all()
      ).toHaveLength(0);
    });

    it("returns false when the id does not exist", async ({ expect }) => {
      await using env = new StudySetContentTestEnv();
      expect(await env.repo.deleteContent("missing", env.studySetId)).toBe(
        false
      );
    });

    it("returns false when studySetId does not match", async ({ expect }) => {
      await using env = new StudySetContentTestEnv();
      await env.seedContent({ id: "ssc-1" });
      expect(await env.repo.deleteContent("ssc-1", env.otherStudySetId)).toBe(
        false
      );
      expect(
        env.db
          .select()
          .from(studySetContent)
          .where(eq(studySetContent.id, "ssc-1"))
          .all()
      ).toHaveLength(1);
    });

    it("cascades to junction table", async ({ expect }) => {
      await using env = new StudySetContentTestEnv();
      env.seedChapterSync("ch-1", env.studySetId, env.ownerId);
      await env.seedContent({ id: "ssc-1" });
      await env.repo.linkChapter("ssc-1", "ch-1");

      await env.repo.deleteContent("ssc-1", env.studySetId);

      const junctions = env.db
        .select()
        .from(studySetContentToChapter)
        .where(eq(studySetContentToChapter.contentId, "ssc-1"))
        .all();
      expect(junctions).toHaveLength(0);
    });
  });

  describe("findContentById", () => {
    it("returns the row when it exists", async ({ expect }) => {
      await using env = new StudySetContentTestEnv();
      await env.seedContent({ content: "Find me", id: "ssc-1" });
      const result = await env.repo.findContentById("ssc-1");
      expect(result?.id).toBe("ssc-1");
      expect(result?.content).toBe("Find me");
    });

    it("returns null when the id does not exist", async ({ expect }) => {
      await using env = new StudySetContentTestEnv();
      expect(await env.repo.findContentById("missing")).toBeNull();
    });
  });

  describe("findContentByIdWithChapters", () => {
    it("returns content with empty chapterIds when no links", async ({
      expect,
    }) => {
      await using env = new StudySetContentTestEnv();
      await env.seedContent({ content: "No chapters", id: "ssc-1" });
      const result = await env.repo.findContentByIdWithChapters("ssc-1");
      expect(result).not.toBeNull();
      expect(result).toHaveProperty("id", "ssc-1");
      expect(result).toHaveProperty("content", "No chapters");
      expect(result).toHaveProperty("chapterIds", []);
    });

    it("returns content with chapterIds when links exist", async ({
      expect,
    }) => {
      await using env = new StudySetContentTestEnv();
      env.seedChapterSync("ch-1", env.studySetId, env.ownerId);
      env.seedChapterSync("ch-2", env.studySetId, env.ownerId);
      await env.seedContent({ content: "Linked content", id: "ssc-1" });
      await env.repo.linkChapter("ssc-1", "ch-1");
      await env.repo.linkChapter("ssc-1", "ch-2");

      const result = await env.repo.findContentByIdWithChapters("ssc-1");
      expect(result).not.toBeNull();
      expect(result).toHaveProperty(
        "chapterIds",
        expect.arrayContaining(["ch-1", "ch-2"])
      );
      expect(result?.chapterIds).toHaveLength(2);
    });

    it("returns null when content does not exist", async ({ expect }) => {
      await using env = new StudySetContentTestEnv();
      expect(await env.repo.findContentByIdWithChapters("missing")).toBeNull();
    });
  });

  describe("findContentsByStudySet", () => {
    it("returns contents in the study set", async ({ expect }) => {
      await using env = new StudySetContentTestEnv();
      await env.seedContent({
        content: "Content A",
        id: "ssc-1",
        studySetId: env.studySetId,
      });
      await env.seedContent({
        content: "Content B",
        id: "ssc-2",
        studySetId: env.studySetId,
      });

      const results = await env.repo.findContentsByStudySet(env.studySetId);
      const ids = results.map((c) => c.id);
      expect(ids).toContain("ssc-1");
      expect(ids).toContain("ssc-2");
      expect(results).toHaveLength(2);
    });

    it("includes chapterIds in results", async ({ expect }) => {
      await using env = new StudySetContentTestEnv();
      env.seedChapterSync("ch-1", env.studySetId, env.ownerId);
      await env.seedContent({ id: "ssc-1", studySetId: env.studySetId });
      await env.repo.linkChapter("ssc-1", "ch-1");

      const results = await env.repo.findContentsByStudySet(env.studySetId);
      const found = results.find((c) => c.id === "ssc-1");
      expect(found?.chapterIds).toEqual(["ch-1"]);
    });

    it("returns empty array for study set with no content", async ({
      expect,
    }) => {
      await using env = new StudySetContentTestEnv();
      const results = await env.repo.findContentsByStudySet(env.studySetId);
      expect(results).toEqual([]);
    });
  });

  describe("findContentsByChapter", () => {
    it("returns contents linked to the chapter", async ({ expect }) => {
      await using env = new StudySetContentTestEnv();
      env.seedChapterSync("ch-1", env.studySetId, env.ownerId);
      await env.seedContent({ id: "ssc-1", studySetId: env.studySetId });
      await env.seedContent({ id: "ssc-2", studySetId: env.studySetId });
      await env.repo.linkChapter("ssc-1", "ch-1");

      const results = await env.repo.findContentsByChapter("ch-1");
      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty("id", "ssc-1");
    });

    it("returns empty array when chapter has no content", async ({
      expect,
    }) => {
      await using env = new StudySetContentTestEnv();
      env.seedChapterSync("ch-1", env.studySetId, env.ownerId);
      const results = await env.repo.findContentsByChapter("ch-1");
      expect(results).toEqual([]);
    });

    it("returns empty array when chapter does not exist", async ({
      expect,
    }) => {
      await using env = new StudySetContentTestEnv();
      const results = await env.repo.findContentsByChapter("does-not-exist");
      expect(results).toEqual([]);
    });
  });

  describe("linkChapter", () => {
    it("creates a junction row", async ({ expect }) => {
      await using env = new StudySetContentTestEnv();
      env.seedChapterSync("ch-1", env.studySetId, env.ownerId);
      await env.seedContent({ id: "ssc-1" });
      const result = await env.repo.linkChapter("ssc-1", "ch-1");
      expect(result).not.toBeNull();
      expect(result).toHaveProperty("contentId", "ssc-1");
      expect(result).toHaveProperty("chapterId", "ch-1");
    });

    it("returns null on duplicate (composite PK violation)", async ({
      expect,
    }) => {
      await using env = new StudySetContentTestEnv();
      env.seedChapterSync("ch-1", env.studySetId, env.ownerId);
      await env.seedContent({ id: "ssc-1" });
      await env.repo.linkChapter("ssc-1", "ch-1");
      const duplicate = await env.repo.linkChapter("ssc-1", "ch-1");
      expect(duplicate).toBeNull();
    });
  });

  describe("unlinkChapter", () => {
    it("removes the junction row", async ({ expect }) => {
      await using env = new StudySetContentTestEnv();
      env.seedChapterSync("ch-1", env.studySetId, env.ownerId);
      await env.seedContent({ id: "ssc-1" });
      await env.repo.linkChapter("ssc-1", "ch-1");
      const ok = await env.repo.unlinkChapter("ssc-1", "ch-1");
      expect(ok).toBe(true);
      const rows = env.db
        .select()
        .from(studySetContentToChapter)
        .where(eq(studySetContentToChapter.contentId, "ssc-1"))
        .all();
      expect(rows).toHaveLength(0);
    });

    it("returns false when link does not exist", async ({ expect }) => {
      await using env = new StudySetContentTestEnv();
      expect(await env.repo.unlinkChapter("ssc-1", "ch-1")).toBe(false);
    });
  });

  describe("setChapters", () => {
    it("replaces all existing links with new set", async ({ expect }) => {
      await using env = new StudySetContentTestEnv();
      env.seedChapterSync("ch-1", env.studySetId, env.ownerId);
      env.seedChapterSync("ch-2", env.studySetId, env.ownerId);
      env.seedChapterSync("ch-3", env.studySetId, env.ownerId);
      await env.seedContent({ id: "ssc-1" });
      await env.repo.linkChapter("ssc-1", "ch-1");
      await env.repo.linkChapter("ssc-1", "ch-2");

      await env.repo.setChapters("ssc-1", ["ch-3"]);

      const result = await env.repo.findContentByIdWithChapters("ssc-1");
      expect(result).toHaveProperty("chapterIds", ["ch-3"]);
    });

    it("sets empty array to clear all links", async ({ expect }) => {
      await using env = new StudySetContentTestEnv();
      env.seedChapterSync("ch-1", env.studySetId, env.ownerId);
      await env.seedContent({ id: "ssc-1" });
      await env.repo.linkChapter("ssc-1", "ch-1");

      await env.repo.setChapters("ssc-1", []);

      const result = await env.repo.findContentByIdWithChapters("ssc-1");
      expect(result).toHaveProperty("chapterIds", []);
    });

    it("creates links when content had none before", async ({ expect }) => {
      await using env = new StudySetContentTestEnv();
      env.seedChapterSync("ch-1", env.studySetId, env.ownerId);
      env.seedChapterSync("ch-2", env.studySetId, env.ownerId);
      await env.seedContent({ id: "ssc-1" });

      await env.repo.setChapters("ssc-1", ["ch-1", "ch-2"]);

      const result = await env.repo.findContentByIdWithChapters("ssc-1");
      expect(result).toHaveProperty(
        "chapterIds",
        expect.arrayContaining(["ch-1", "ch-2"])
      );
      expect(result?.chapterIds).toHaveLength(2);
    });
  });
});

describe.concurrent("StudySetContentDrizzleRepository (schema constraints)", () => {
  describe("foreign keys", () => {
    it("rejects inserting content for a non-existent study set", async ({
      expect,
    }) => {
      await using env = new StudySetContentTestEnv();
      const insertOrphan = () =>
        env.repo.insertContent({
          content: "Orphan",
          id: "ssc-orphan",
          studySetId: "does-not-exist",
        });
      await expect(insertOrphan()).rejects.toThrow();
    });

    it("returns null when linking to a non-existent content", async ({
      expect,
    }) => {
      await using env = new StudySetContentTestEnv();
      env.seedChapterSync("ch-1", env.studySetId, env.ownerId);
      expect(await env.repo.linkChapter("does-not-exist", "ch-1")).toBeNull();
    });

    it("returns null when linking to a non-existent chapter", async ({
      expect,
    }) => {
      await using env = new StudySetContentTestEnv();
      await env.seedContent({ id: "ssc-1" });
      expect(await env.repo.linkChapter("ssc-1", "does-not-exist")).toBeNull();
    });
  });

  describe("cascade from study set deletion", () => {
    it("removes content when the parent study set is deleted", async ({
      expect,
    }) => {
      await using env = new StudySetContentTestEnv();
      await env.seedContent({ id: "ssc-1" });
      expect(
        env.db
          .select()
          .from(studySetContent)
          .where(eq(studySetContent.id, "ssc-1"))
          .all()
      ).toHaveLength(1);

      env.db.delete(studySet).where(eq(studySet.id, env.studySetId)).run();

      expect(
        env.db
          .select()
          .from(studySetContent)
          .where(eq(studySetContent.id, "ssc-1"))
          .all()
      ).toHaveLength(0);
    });

    it("removes junction rows when the chapter is deleted", async ({
      expect,
    }) => {
      await using env = new StudySetContentTestEnv();
      env.seedChapterSync("ch-1", env.studySetId, env.ownerId);
      await env.seedContent({ id: "ssc-1" });
      await env.repo.linkChapter("ssc-1", "ch-1");

      env.db.delete(chapter).where(eq(chapter.id, "ch-1")).run();

      const rows = env.db
        .select()
        .from(studySetContentToChapter)
        .where(eq(studySetContentToChapter.contentId, "ssc-1"))
        .all();
      expect(rows).toHaveLength(0);
    });
  });
});
