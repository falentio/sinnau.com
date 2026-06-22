import { STUDY_SET_SEARCH_LIMIT } from "$lib/schemas/study-set-search.constant";
import { studySet } from "$lib/server/infras/db/schema/study-set";
import { eq, sql } from "drizzle-orm";
import { describe, it } from "vitest";

import { StudySetSearchTestEnv } from "./study-set-search.testing.ts";
import { sanitizeFts5Query } from "./study-set-search.utils.ts";

const searchParams = (query: string) => ({
  limit: STUDY_SET_SEARCH_LIMIT,
  query: sanitizeFts5Query(query),
});

describe.concurrent("StudySetSearchDrizzleRepository", () => {
  describe.concurrent("setup (backfill)", () => {
    it("re-indexes study sets whose FTS row was lost to drift", async ({
      expect,
    }) => {
      await using env = new StudySetSearchTestEnv();
      const id = env.seedStudySet({
        description: "Intro to biology",
        title: "Biology 101",
      });
      // Simulate drift: the FTS row was lost (e.g. legacy data
      // inserted before the triggers existed, or a manual admin
      // delete). setup() must rebuild it from the source of truth.
      env.db.run(sql`DELETE FROM study_set_fts WHERE study_set_id = ${id}`);
      env.repo.setup();

      const results = await env.repo.search(searchParams("Biology"));
      expect(results).toHaveLength(1);
      expect(results[0]?.title).toBe("Biology 101");
    });
  });

  describe.concurrent("search", () => {
    it("returns matching public study sets", async ({ expect }) => {
      await using env = new StudySetSearchTestEnv();
      env.seedStudySet({
        description: "Intro to biology",
        title: "Biology 101",
      });
      env.seedStudySet({
        description: "Organic chemistry",
        title: "Chemistry Basics",
      });

      const results = await env.repo.search(searchParams("Biology"));
      expect(results).toHaveLength(1);
      expect(results[0]?.title).toBe("Biology 101");
      expect(results[0]?.description).toBe("Intro to biology");
      expect(results[0]?.id).toBeDefined();
      expect(results[0]?.slug).toBeDefined();
      expect(results[0]?.ownerId).toBeDefined();
    });

    it("does not return private study sets", async ({ expect }) => {
      await using env = new StudySetSearchTestEnv();
      env.seedStudySet({ title: "Public Biology", visibility: "PUBLIC" });
      env.seedStudySet({ title: "Private Biology", visibility: "PRIVATE" });

      const results = await env.repo.search(searchParams("Biology"));
      expect(results).toHaveLength(1);
      expect(results[0]?.title).toBe("Public Biology");
    });

    it("does not return soft-deleted study sets", async ({ expect }) => {
      await using env = new StudySetSearchTestEnv();
      env.seedStudySet({ title: "Active Biology" });
      env.seedStudySet({ deletedAt: new Date(), title: "Deleted Biology" });

      const results = await env.repo.search(searchParams("Biology"));
      expect(results).toHaveLength(1);
      expect(results[0]?.title).toBe("Active Biology");
    });

    it("performs substring matching via trigram", async ({ expect }) => {
      await using env = new StudySetSearchTestEnv();
      env.seedStudySet({
        description: "Global affairs",
        title: "International Studies",
      });

      const results = await env.repo.search(searchParams("nation"));
      expect(results).toHaveLength(1);
      expect(results[0]?.title).toBe("International Studies");
    });

    it("is case-insensitive", async ({ expect }) => {
      await using env = new StudySetSearchTestEnv();
      env.seedStudySet({ title: "Biology 101" });

      const results = await env.repo.search(searchParams("biology"));
      expect(results).toHaveLength(1);
      expect(results[0]?.title).toBe("Biology 101");
    });

    it("handles special characters in query by quoting", async ({ expect }) => {
      await using env = new StudySetSearchTestEnv();
      env.seedStudySet({ title: 'Test "Quotes" Here' });

      const results = await env.repo.search(searchParams('Test "Quotes" Here'));
      expect(results).toHaveLength(1);
    });

    it("respects the limit parameter", async ({ expect }) => {
      await using env = new StudySetSearchTestEnv();
      for (let i = 0; i < 25; i += 1) {
        env.seedStudySet({ title: `Biology Set ${i}` });
      }

      const results = await env.repo.search(searchParams("Biology"));
      expect(results).toHaveLength(STUDY_SET_SEARCH_LIMIT);
    });

    it("returns empty array when no matches", async ({ expect }) => {
      await using env = new StudySetSearchTestEnv();
      env.seedStudySet({ title: "Biology 101" });

      const results = await env.repo.search(searchParams("xyznomatch"));
      expect(results).toHaveLength(0);
    });

    it("searches description as well as title", async ({ expect }) => {
      await using env = new StudySetSearchTestEnv();
      env.seedStudySet({
        description: "Contains biology content",
        title: "My Study Set",
      });

      const results = await env.repo.search(searchParams("biology"));
      expect(results).toHaveLength(1);
      expect(results[0]?.title).toBe("My Study Set");
    });

    it("does not match rows by trigrams of the study_set_id", async ({
      expect,
    }) => {
      await using env = new StudySetSearchTestEnv();
      // Explicit slug that doesn't include any id characters, so a
      // match on the trigram can only come from study_set_id.
      const id = env.seedStudySet({
        slug: "biology-101",
        title: "Biology 101",
      });
      // The id is "sts_xxxxxxxx..." — searching for any 3-char substring
      // of the id tail must not match, because study_set_id is UNINDEXED.
      const trigram = id.slice(-3);
      const results = await env.repo.search(searchParams(trigram));
      expect(results).toHaveLength(0);
    });
  });

  describe.concurrent("schema constraints", () => {
    it("backfill is idempotent and does not duplicate FTS rows", async ({
      expect,
    }) => {
      await using env = new StudySetSearchTestEnv();
      const id1 = env.seedStudySet({ title: "Biology 101" });
      env.seedStudySet({ title: "Chemistry 101" });

      // Force setup again to verify the backfill re-runs and does not duplicate.
      env.repo.setup();

      // Manually inject a duplicate row (simulates an out-of-band insert or
      // a partial FTS rebuild that produced duplicates).
      env.db.run(
        sql`INSERT INTO study_set_fts(study_set_id, title, description) VALUES (${id1}, ${"Biology 101"}, ${null})`
      );

      // After the duplicate, FTS has 3 rows (2 originals + 1 injected).
      // Re-running setup must self-correct: NOT IN filter drops already-indexed rows.
      env.repo.setup();

      // oxlint-disable-next-line no-unsafe-type-assertion
      const row = env.db.all(sql`SELECT COUNT(*) AS c FROM study_set_fts`) as {
        c: number;
      }[];
      await Promise.resolve();
      expect(row[0]?.c).toBe(2);
    });
  });

  describe.concurrent("triggers", () => {
    it("makes newly inserted public sets searchable", async ({ expect }) => {
      await using env = new StudySetSearchTestEnv();

      let results = await env.repo.search(searchParams("Biology"));
      expect(results).toHaveLength(0);

      env.seedStudySet({ title: "Biology 101" });

      results = await env.repo.search(searchParams("Biology"));
      expect(results).toHaveLength(1);
    });

    it("removes sets from index when updated to PRIVATE", async ({
      expect,
    }) => {
      await using env = new StudySetSearchTestEnv();
      const id = env.seedStudySet({ title: "Biology 101" });

      let results = await env.repo.search(searchParams("Biology"));
      expect(results).toHaveLength(1);

      env.db
        .update(studySet)
        .set({ visibility: "PRIVATE" })
        .where(eq(studySet.id, id))
        .run();

      results = await env.repo.search(searchParams("Biology"));
      expect(results).toHaveLength(0);
    });

    it("removes sets from index when deleted", async ({ expect }) => {
      await using env = new StudySetSearchTestEnv();
      const id = env.seedStudySet({ title: "Biology 101" });

      let results = await env.repo.search(searchParams("Biology"));
      expect(results).toHaveLength(1);

      env.db
        .update(studySet)
        .set({ deletedAt: new Date() })
        .where(eq(studySet.id, id))
        .run();

      results = await env.repo.search(searchParams("Biology"));
      expect(results).toHaveLength(0);
    });

    it("does not re-index when an unrelated column is updated", async ({
      expect,
    }) => {
      await using env = new StudySetSearchTestEnv();
      env.seedStudySet({ title: "Biology 101" });

      // Structural assertion: the UPDATE trigger should declare a WHEN
      // clause so SQLite skips the body for unrelated column changes.
      // (FTS5 reuses rowid on identical DELETE+INSERT, so we cannot
      // observe the optimization via rowid; we verify the SQL shape.)
      // oxlint-disable-next-line no-unsafe-type-assertion
      const trigger = env.db.all(
        sql`SELECT sql AS trigger_sql FROM sqlite_master WHERE name = 'study_set_fts_au'`
      ) as { trigger_sql: string }[];
      await Promise.resolve();
      expect(trigger[0]?.trigger_sql).toMatch(/WHEN/iu);
    });

    it("re-indexes a row that is restored from soft-delete", async ({
      expect,
    }) => {
      await using env = new StudySetSearchTestEnv();
      const id = env.seedStudySet({ title: "Biology 101" });

      // Soft-delete
      env.db
        .update(studySet)
        .set({ deletedAt: new Date() })
        .where(eq(studySet.id, id))
        .run();

      // Restore
      env.db
        .update(studySet)
        .set({ deletedAt: null })
        .where(eq(studySet.id, id))
        .run();

      const results = await env.repo.search(searchParams("Biology"));
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe(id);
    });

    it("re-indexes a row that is flipped PRIVATE → PUBLIC", async ({
      expect,
    }) => {
      await using env = new StudySetSearchTestEnv();
      const id = env.seedStudySet({ title: "Biology 101" });

      env.db
        .update(studySet)
        .set({ visibility: "PRIVATE" })
        .where(eq(studySet.id, id))
        .run();
      env.db
        .update(studySet)
        .set({ visibility: "PUBLIC" })
        .where(eq(studySet.id, id))
        .run();

      const results = await env.repo.search(searchParams("Biology"));
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe(id);
    });

    it("keeps a row searchable after an owner change", async ({ expect }) => {
      await using env = new StudySetSearchTestEnv();
      const id = env.seedStudySet({ title: "Biology 101" });
      const newOwnerId = env.seedUser({ name: "New Owner" });

      env.db
        .update(studySet)
        .set({ ownerId: newOwnerId })
        .where(eq(studySet.id, id))
        .run();

      const results = await env.repo.search(searchParams("Biology"));
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe(id);
      expect(results[0]?.ownerId).toBe(newOwnerId);
    });
  });

  describe.concurrent("schema constraints (NULL handling)", () => {
    it("matches by title when description is NULL", async ({ expect }) => {
      await using env = new StudySetSearchTestEnv();
      env.seedStudySet({ title: "Biology 101" });

      const results = await env.repo.search(searchParams("Biology"));
      expect(results).toHaveLength(1);
      expect(results[0]?.description).toBeNull();
    });
  });
});
