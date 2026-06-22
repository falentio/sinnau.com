import { ORPCError } from "@orpc/server";
import { sql } from "drizzle-orm";

import type { DB } from "../../infras/db/client.ts";
import { db as defaultDb } from "../../infras/db/client.ts";
import type {
  StudySetSearchRepository,
  StudySetSearchResult,
} from "./study-set-search.repository.ts";

export class StudySetSearchDrizzleRepository implements StudySetSearchRepository {
  private readonly dbInstance: DB;

  constructor(dbInstance: DB = defaultDb) {
    this.dbInstance = dbInstance;
  }

  // FTS5 search index for study_set.
  //
  // Strategy:
  //   - virtual table `study_set_fts` (created by migration
  //     `drizzle/0008_study_set_fts.sql`) mirrors id/title/description
  //     for the public, non-deleted subset of `study_set`.
  //   - `study_set_id UNINDEXED` so the trigram tokenizer does not
  //     index id substrings (which would match user queries that
  //     happen to contain trigrams of any id).
  //   - `tokenize='trigram'` enables substring matching without
  //     requiring prefix wildcards; the trigram floor (3 chars) is
  //     enforced at the schema layer.
  //   - SQLite triggers (also created by the migration) keep the
  //     index in sync on insert/update/delete of public, non-deleted
  //     rows. The UPDATE trigger has a WHEN clause so SQLite skips
  //     the body for unrelated column changes.
  //   - the backfill below is self-healing: the DELETE removes any
  //     drifted rows the triggers may have left behind (concurrent
  //     trigger-fired inserts, partial rebuilds, legacy data inserted
  //     before the triggers existed) and the INSERT re-populates
  //     from the source of truth.
  //   - `setup()` is called explicitly during boot (or by the test
  //     env) rather than from the constructor, so module import
  //     does not perform the backfill.
  // Failures bubble up as raw Error; the ORPCError wrapper below
  // (in `search`) translates them for the request scope.
  setup(): void {
    this.dbInstance.run(
      sql.raw(
        `DELETE FROM study_set_fts WHERE study_set_id IN (
				SELECT id FROM study_set
				WHERE visibility = 'PUBLIC' AND deleted_at IS NULL
			)`
      )
    );

    this.dbInstance.run(
      sql.raw(
        `INSERT INTO study_set_fts(study_set_id, slug, title, description)
			SELECT id, slug, title, COALESCE(description, '') FROM study_set
			WHERE visibility = 'PUBLIC' AND deleted_at IS NULL`
      )
    );
  }

  static withDatabase(db: DB): StudySetSearchDrizzleRepository {
    return new StudySetSearchDrizzleRepository(db);
  }

  // Visibility filtering is index-level; userId is accepted for API
  // symmetry with other domains but does not change the result set.
  // oxlint-disable-next-line require-await, max-params, no-unused-vars
  async search(
    fts5Query: string,
    limit: number,
    _userId: string | null | undefined
  ): Promise<StudySetSearchResult[]> {
    try {
      // oxlint-disable-next-line no-unsafe-type-assertion
      const rows = this.dbInstance.all(
        sql`SELECT s.id, s.title, s.description, s.slug, s.owner_id AS ownerId
				FROM study_set_fts fts
				JOIN study_set s ON s.id = fts.study_set_id
				WHERE study_set_fts MATCH ${fts5Query}
					AND s.visibility = 'PUBLIC'
					AND s.deleted_at IS NULL
				ORDER BY rank
				LIMIT ${limit}`
      ) as StudySetSearchResult[];

      return rows;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }
}
