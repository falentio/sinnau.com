import type { Chapter } from "../../infras/db/schema/chapter.ts";

export type ChapterUpdatePatch = Partial<
  Pick<Chapter, "title" | "description" | "updatedAt">
>;

export interface ChapterRepository {
  insertChapter(
    row: Omit<Chapter, "createdAt" | "updatedAt">
  ): Promise<Chapter>;
  updateChapter(
    id: string,
    ownerId: string,
    patch: ChapterUpdatePatch
  ): Promise<Chapter | null>;
  deleteChapter(id: string, ownerId: string): Promise<boolean>;
  findChapterById(id: string): Promise<Chapter | null>;
  findChaptersByStudySet(
    userId: string,
    studySetId: string
  ): Promise<Chapter[]>;
  isSlugTakenInStudySet(studySetId: string, slug: string): Promise<boolean>;
  countChildren(chapterId: string): Promise<number>;
}
