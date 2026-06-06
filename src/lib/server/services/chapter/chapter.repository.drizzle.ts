import { ORPCError } from "@orpc/server";
import { and, desc, eq, or, sql } from "drizzle-orm";

import { db as defaultDb } from "../../infras/db/client.ts";
import type { DB } from "../../infras/db/client.ts";
import { chapter } from "../../infras/db/schema/chapter.ts";
import type { Chapter } from "../../infras/db/schema/chapter.ts";
import { flashcard } from "../../infras/db/schema/flashcard.ts";
import { studySet } from "../../infras/db/schema/study-set.ts";
import type {
  ChapterRepository,
  ChapterUpdatePatch,
} from "./chapter.repository.ts";

export class ChapterDrizzleRepository implements ChapterRepository {
  private readonly dbInstance: DB;

  constructor(dbInstance: DB = defaultDb) {
    this.dbInstance = dbInstance;
  }

  static withDatabase(db: DB): ChapterDrizzleRepository {
    return new ChapterDrizzleRepository(db);
  }

  async insertChapter(
    row: Omit<Chapter, "createdAt" | "updatedAt">
  ): Promise<Chapter> {
    try {
      const [created] = await this.dbInstance
        .insert(chapter)
        .values(row)
        .returning();
      if (!created) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Internal server error",
        });
      }
      return created;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async updateChapter(
    id: string,
    ownerId: string,
    patch: ChapterUpdatePatch
  ): Promise<Chapter | null> {
    try {
      const [updated] = await this.dbInstance
        .update(chapter)
        .set(patch)
        .where(and(eq(chapter.id, id), eq(chapter.ownerId, ownerId)))
        .returning();
      return updated ?? null;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async deleteChapter(id: string, ownerId: string): Promise<boolean> {
    try {
      const deleted = await this.dbInstance
        .delete(chapter)
        .where(and(eq(chapter.id, id), eq(chapter.ownerId, ownerId)))
        .returning({ id: chapter.id });
      return deleted.length > 0;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async findChapterById(id: string): Promise<Chapter | null> {
    try {
      const [row] = await this.dbInstance
        .select()
        .from(chapter)
        .where(eq(chapter.id, id))
        .limit(1);
      return row ?? null;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async findChaptersByStudySet(
    userId: string,
    studySetId: string
  ): Promise<Chapter[]> {
    try {
      return await this.dbInstance
        .select({
          createdAt: chapter.createdAt,
          description: chapter.description,
          id: chapter.id,
          ownerId: chapter.ownerId,
          slug: chapter.slug,
          studySetId: chapter.studySetId,
          title: chapter.title,
          updatedAt: chapter.updatedAt,
        })
        .from(chapter)
        .innerJoin(studySet, eq(chapter.studySetId, studySet.id))
        .where(
          and(
            eq(chapter.studySetId, studySetId),
            or(eq(studySet.ownerId, userId), eq(studySet.visibility, "PUBLIC"))
          )
        )
        .orderBy(desc(chapter.createdAt));
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async isSlugTakenInStudySet(
    studySetId: string,
    slug: string
  ): Promise<boolean> {
    try {
      const [row] = await this.dbInstance
        .select({ id: chapter.id })
        .from(chapter)
        .where(
          and(
            sql`lower(${chapter.slug}) = lower(${slug})`,
            eq(chapter.studySetId, studySetId)
          )
        )
        .limit(1);
      return row !== undefined;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async countChildren(chapterId: string): Promise<number> {
    try {
      const [row] = await this.dbInstance
        .select({ count: sql<number>`count(*)` })
        .from(flashcard)
        .where(eq(flashcard.chapterId, chapterId));
      return Number(row?.count ?? 0);
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
