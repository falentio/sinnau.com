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
    row: Omit<Chapter, "createdAt" | "updatedAt" | "isAiGenerated">
  ): Promise<Chapter> {
    const [created] = await this.dbInstance
      .insert(chapter)
      .values(row)
      .returning();
    if (!created) {
      throw new Error("Failed to insert chapter");
    }
    return created;
  }

  async updateChapter(
    id: string,
    ownerId: string,
    patch: ChapterUpdatePatch
  ): Promise<Chapter | null> {
    const [updated] = await this.dbInstance
      .update(chapter)
      .set(patch)
      .where(and(eq(chapter.id, id), eq(chapter.ownerId, ownerId)))
      .returning();
    return updated ?? null;
  }

  async deleteChapter(id: string, ownerId: string): Promise<boolean> {
    const deleted = await this.dbInstance
      .delete(chapter)
      .where(and(eq(chapter.id, id), eq(chapter.ownerId, ownerId)))
      .returning({ id: chapter.id });
    return deleted.length > 0;
  }

  async findChapterById(id: string): Promise<Chapter | null> {
    const [row] = await this.dbInstance
      .select()
      .from(chapter)
      .where(eq(chapter.id, id))
      .limit(1);
    return row ?? null;
  }

  async findChaptersByStudySet(
    userId: string,
    studySetId: string
  ): Promise<Chapter[]> {
    return await this.dbInstance
      .select({
        createdAt: chapter.createdAt,
        description: chapter.description,
        id: chapter.id,
        isAiGenerated: chapter.isAiGenerated,
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
  }

  async isSlugTakenInStudySet(
    studySetId: string,
    slug: string
  ): Promise<boolean> {
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
  }

  async countChildren(chapterId: string): Promise<number> {
    const [row] = await this.dbInstance
      .select({ count: sql<number>`count(*)` })
      .from(flashcard)
      .where(eq(flashcard.chapterId, chapterId));
    return row?.count ?? 0;
  }
}
