import { ORPCError } from "@orpc/server";
import { and, eq, inArray } from "drizzle-orm";

import { db as defaultDb } from "../../infras/db/client.ts";
import type { DB } from "../../infras/db/client.ts";
import { chapter } from "../../infras/db/schema/chapter.ts";
import {
  studySetContent,
  studySetContentToChapter,
} from "../../infras/db/schema/study-set-content.ts";
import type {
  StudySetContent,
  StudySetContentWithChapters,
} from "../../infras/db/schema/study-set-content.ts";
import type {
  StudySetContentRepository,
  StudySetContentUpdatePatch,
} from "./study-set-content.repository.ts";

export class StudySetContentDrizzleRepository implements StudySetContentRepository {
  private readonly dbInstance: DB;

  constructor(dbInstance: DB = defaultDb) {
    this.dbInstance = dbInstance;
  }

  static withDatabase(db: DB): StudySetContentDrizzleRepository {
    return new StudySetContentDrizzleRepository(db);
  }

  async insertContent(
    row: Omit<StudySetContent, "createdAt" | "updatedAt">
  ): Promise<StudySetContent> {
    try {
      const [created] = await this.dbInstance
        .insert(studySetContent)
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

  async updateContent(
    id: string,
    studySetId: string,
    patch: StudySetContentUpdatePatch
  ): Promise<StudySetContent | null> {
    try {
      const [updated] = await this.dbInstance
        .update(studySetContent)
        .set(patch)
        .where(
          and(
            eq(studySetContent.id, id),
            eq(studySetContent.studySetId, studySetId)
          )
        )
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

  async deleteContent(id: string, studySetId: string): Promise<boolean> {
    try {
      const deleted = await this.dbInstance
        .delete(studySetContent)
        .where(
          and(
            eq(studySetContent.id, id),
            eq(studySetContent.studySetId, studySetId)
          )
        )
        .returning({ id: studySetContent.id });
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

  async findContentById(id: string): Promise<StudySetContent | null> {
    try {
      const [row] = await this.dbInstance
        .select()
        .from(studySetContent)
        .where(eq(studySetContent.id, id))
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

  async findContentByIdWithChapters(
    id: string
  ): Promise<StudySetContentWithChapters | null> {
    try {
      const rows = await this.dbInstance
        .select({
          chapterId: studySetContentToChapter.chapterId,
          content: studySetContent.content,
          createdAt: studySetContent.createdAt,
          id: studySetContent.id,
          studySetId: studySetContent.studySetId,
          updatedAt: studySetContent.updatedAt,
        })
        .from(studySetContent)
        .leftJoin(
          studySetContentToChapter,
          eq(studySetContent.id, studySetContentToChapter.contentId)
        )
        .where(eq(studySetContent.id, id));
      if (rows.length === 0) {
        return null;
      }
      return (
        StudySetContentDrizzleRepository.buildWithChapters(rows)[0] ?? null
      );
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async findContentsByStudySet(
    studySetId: string
  ): Promise<StudySetContentWithChapters[]> {
    try {
      const rows = await this.dbInstance
        .select({
          chapterId: studySetContentToChapter.chapterId,
          content: studySetContent.content,
          createdAt: studySetContent.createdAt,
          id: studySetContent.id,
          studySetId: studySetContent.studySetId,
          updatedAt: studySetContent.updatedAt,
        })
        .from(studySetContent)
        .leftJoin(
          studySetContentToChapter,
          eq(studySetContent.id, studySetContentToChapter.contentId)
        )
        .where(eq(studySetContent.studySetId, studySetId));
      return StudySetContentDrizzleRepository.buildWithChapters(rows);
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async findContentsByChapter(
    chapterId: string
  ): Promise<StudySetContentWithChapters[]> {
    try {
      const junctionRows = await this.dbInstance
        .select({ contentId: studySetContentToChapter.contentId })
        .from(studySetContentToChapter)
        .where(eq(studySetContentToChapter.chapterId, chapterId));

      const contentIds = junctionRows.map((r) => r.contentId);
      if (contentIds.length === 0) {
        return [];
      }

      const rows = await this.dbInstance
        .select({
          chapterId: studySetContentToChapter.chapterId,
          content: studySetContent.content,
          createdAt: studySetContent.createdAt,
          id: studySetContent.id,
          studySetId: studySetContent.studySetId,
          updatedAt: studySetContent.updatedAt,
        })
        .from(studySetContent)
        .leftJoin(
          studySetContentToChapter,
          eq(studySetContent.id, studySetContentToChapter.contentId)
        )
        .where(inArray(studySetContent.id, contentIds));

      return StudySetContentDrizzleRepository.buildWithChapters(rows);
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async linkChapter(
    contentId: string,
    chapterId: string
  ): Promise<{ contentId: string; chapterId: string } | null> {
    try {
      const [linked] = await this.dbInstance
        .insert(studySetContentToChapter)
        .values({ chapterId, contentId })
        .returning();
      return linked ?? null;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      return null;
    }
  }

  async unlinkChapter(contentId: string, chapterId: string): Promise<boolean> {
    try {
      const deleted = await this.dbInstance
        .delete(studySetContentToChapter)
        .where(
          and(
            eq(studySetContentToChapter.contentId, contentId),
            eq(studySetContentToChapter.chapterId, chapterId)
          )
        )
        .returning({ contentId: studySetContentToChapter.contentId });
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

  async setChapters(contentId: string, chapterIds: string[]): Promise<void> {
    try {
      await Promise.resolve();
      this.dbInstance.transaction((tx) => {
        tx.delete(studySetContentToChapter)
          .where(eq(studySetContentToChapter.contentId, contentId))
          .run();

        if (chapterIds.length > 0) {
          tx.insert(studySetContentToChapter)
            .values(chapterIds.map((chapterId) => ({ chapterId, contentId })))
            .run();
        }
      });
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async findChapterById(
    chapterId: string
  ): Promise<{ id: string; studySetId: string } | null> {
    try {
      const [row] = await this.dbInstance
        .select({ id: chapter.id, studySetId: chapter.studySetId })
        .from(chapter)
        .where(eq(chapter.id, chapterId))
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

  private static buildWithChapters(
    rows: {
      id: string;
      studySetId: string;
      content: string;
      createdAt: Date;
      updatedAt: Date;
      chapterId: string | null;
    }[]
  ): StudySetContentWithChapters[] {
    const map = new Map<string, StudySetContentWithChapters>();
    for (const row of rows) {
      let entry = map.get(row.id);
      if (!entry) {
        entry = {
          chapterIds: [],
          content: row.content,
          createdAt: row.createdAt,
          id: row.id,
          studySetId: row.studySetId,
          updatedAt: row.updatedAt,
        };
        map.set(row.id, entry);
      }
      if (row.chapterId !== null) {
        entry.chapterIds.push(row.chapterId);
      }
    }
    return [...map.values()];
  }
}
