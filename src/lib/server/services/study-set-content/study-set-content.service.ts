import { STUDY_SET_CONTENT_ID_PREFIX } from "$lib/schemas/study-set-content.constant";
import { ORPCError } from "@orpc/server";

import type {
  CreateStudySetContentInput,
  UpdateStudySetContentInput,
  DeleteStudySetContentInput,
  GetStudySetContentInput,
  ListStudySetContentInput,
  ListByChapterStudySetContentInput,
  LinkChapterToContentInput,
  UnlinkChapterFromContentInput,
  SetContentChaptersInput,
} from "../../../schemas/study-set-content.ts";
import type {
  StudySetContent,
  StudySetContentWithChapters,
} from "../../infras/db/schema/study-set-content.ts";
import { generateId } from "../../utils/nanoid.ts";
import type { StudySetContentGuard } from "./study-set-content.guard.ts";
import type { StudySetContentRepository } from "./study-set-content.repository.ts";

export type { StudySetContent, StudySetContentWithChapters };

export class StudySetContentService {
  private readonly repo: StudySetContentRepository;
  private readonly guard: StudySetContentGuard;

  constructor(repo: StudySetContentRepository, guard: StudySetContentGuard) {
    this.repo = repo;
    this.guard = guard;
  }

  async createContent(
    input: CreateStudySetContentInput,
    ownerId: string
  ): Promise<StudySetContentWithChapters> {
    await this.guard.assertStudySetOwnerOrForbidden(input.studySetId, ownerId);

    const content = await this.repo.insertContent({
      content: input.content,
      id: generateId(STUDY_SET_CONTENT_ID_PREFIX),
      studySetId: input.studySetId,
    });

    if (input.chapterIds && input.chapterIds.length > 0) {
      await this.repo.setChapters(content.id, input.chapterIds);
    }

    const result = await this.repo.findContentByIdWithChapters(content.id);
    if (!result) {
      throw new ORPCError("NOT_FOUND", { message: "Content not found" });
    }
    return result;
  }

  async updateContent(
    input: UpdateStudySetContentInput,
    ownerId: string
  ): Promise<StudySetContentWithChapters> {
    const existing = await this.guard.assertContentOwnerOrForbidden(
      input.id,
      ownerId
    );

    const updated = await this.repo.updateContent(
      input.id,
      existing.studySetId,
      {
        content: input.content,
      }
    );
    if (!updated) {
      throw new ORPCError("NOT_FOUND", { message: "Content not found" });
    }

    const result = await this.repo.findContentByIdWithChapters(input.id);
    if (!result) {
      throw new ORPCError("NOT_FOUND", { message: "Content not found" });
    }
    return result;
  }

  async deleteContent(
    input: DeleteStudySetContentInput,
    ownerId: string
  ): Promise<void> {
    const content = await this.guard.assertContentOwnerOrForbidden(
      input.id,
      ownerId
    );

    const ok = await this.repo.deleteContent(input.id, content.studySetId);
    if (!ok) {
      throw new ORPCError("NOT_FOUND", { message: "Content not found" });
    }
  }

  async getContent(
    input: GetStudySetContentInput,
    userId: string
  ): Promise<StudySetContentWithChapters> {
    await this.guard.assertContentVisibleByIdOrNotFound(input.id, userId);
    const result = await this.repo.findContentByIdWithChapters(input.id);
    if (!result) {
      throw new ORPCError("NOT_FOUND", { message: "Content not found" });
    }
    return result;
  }

  async listContentsByStudySet(
    input: ListStudySetContentInput,
    userId: string
  ): Promise<StudySetContentWithChapters[]> {
    await this.guard.assertStudySetVisibleByIdOrNotFound(
      input.studySetId,
      userId
    );
    return await this.repo.findContentsByStudySet(input.studySetId);
  }

  async listContentsByChapter(
    input: ListByChapterStudySetContentInput,
    userId: string
  ): Promise<StudySetContentWithChapters[]> {
    const chapter = await this.repo.findChapterById(input.chapterId);
    if (!chapter) {
      throw new ORPCError("NOT_FOUND", { message: "Chapter not found" });
    }

    await this.guard.assertStudySetVisibleByIdOrNotFound(
      chapter.studySetId,
      userId
    );
    return await this.repo.findContentsByChapter(input.chapterId);
  }

  async linkChapter(
    input: LinkChapterToContentInput,
    ownerId: string
  ): Promise<void> {
    const content = await this.guard.assertContentOwnerOrForbidden(
      input.contentId,
      ownerId
    );

    const chapter = await this.repo.findChapterById(input.chapterId);
    if (!chapter) {
      throw new ORPCError("NOT_FOUND", { message: "Chapter not found" });
    }

    if (chapter.studySetId !== content.studySetId) {
      throw new ORPCError("FORBIDDEN", {
        message: "Chapter must belong to the same study set as the content",
      });
    }

    const linked = await this.repo.linkChapter(
      input.contentId,
      input.chapterId
    );
    if (!linked) {
      throw new ORPCError("NOT_FOUND", {
        message: "Content or chapter not found",
      });
    }
  }

  async unlinkChapter(
    input: UnlinkChapterFromContentInput,
    ownerId: string
  ): Promise<void> {
    await this.guard.assertContentOwnerOrForbidden(input.contentId, ownerId);

    const ok = await this.repo.unlinkChapter(input.contentId, input.chapterId);
    if (!ok) {
      throw new ORPCError("NOT_FOUND", { message: "Link not found" });
    }
  }

  async setChapters(
    input: SetContentChaptersInput,
    ownerId: string
  ): Promise<void> {
    const content = await this.guard.assertContentOwnerOrForbidden(
      input.contentId,
      ownerId
    );

    for (const chapterId of input.chapterIds) {
      // oxlint-disable-next-line no-await-in-loop -- independent read per chapter, no FK constraint between them
      const chapter = await this.repo.findChapterById(chapterId);
      if (!chapter) {
        throw new ORPCError("NOT_FOUND", {
          message: `Chapter ${chapterId} not found`,
        });
      }
      if (chapter.studySetId !== content.studySetId) {
        throw new ORPCError("FORBIDDEN", {
          message: `Chapter ${chapterId} must belong to the same study set as the content`,
        });
      }
    }

    await this.repo.setChapters(input.contentId, input.chapterIds);
  }
}
