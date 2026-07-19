import { CHAPTER_ID_PREFIX } from "$lib/schemas/chapter";
import { ORPCError } from "@orpc/server";

import type {
  CreateChapterInput,
  DeleteChapterInput,
  GetChapterInput,
  GetChaptersInput,
  UpdateChapterInput,
} from "../../../schemas/chapter.ts";
import type { Chapter } from "../../infras/db/schema/chapter.ts";
import { generateSlug, SlugConflictError } from "../../infras/slug.ts";
import { generateId } from "../../utils/nanoid.ts";
import type { ChapterGuard } from "./chapter.guard.ts";
import type { ChapterRepository } from "./chapter.repository.ts";

export type { Chapter };

export class ChapterService {
  private readonly repo: ChapterRepository;
  private readonly guard: ChapterGuard;

  constructor(repo: ChapterRepository, guard: ChapterGuard) {
    this.repo = repo;
    this.guard = guard;
  }

  async createChapter(
    input: CreateChapterInput,
    ownerId: string
  ): Promise<Chapter> {
    await this.guard.assertStudySetOwnerOrForbidden(input.studySetId, ownerId);

    const isSlugTakenInStudySet = async (candidate: string) =>
      await this.repo.isSlugTakenInStudySet(input.studySetId, candidate);

    const slug = await generateSlug(input.title, isSlugTakenInStudySet).catch(
      (error: unknown) => {
        if (error instanceof SlugConflictError) {
          throw new ORPCError("CHAPTER_SLUG_CONFLICT", {
            message: error.message,
          });
        }
        throw error;
      }
    );

    return await this.repo.insertChapter({
      description: input.description ?? null,
      id: generateId(CHAPTER_ID_PREFIX),
      ownerId,
      slug,
      studySetId: input.studySetId,
      title: input.title,
    });
  }

  async updateChapter(
    input: UpdateChapterInput,
    ownerId: string
  ): Promise<Chapter> {
    const existing = await this.guard.assertOwnerOrForbidden(input.id, ownerId);

    const patch: Partial<Chapter> = {};
    if (input.title !== undefined) {
      patch.title = input.title;
    }
    if (input.description !== undefined) {
      patch.description =
        input.description === "" || input.description === null
          ? null
          : input.description;
    }

    if (Object.keys(patch).length === 0) {
      return existing;
    }

    const updated = await this.repo.updateChapter(input.id, ownerId, patch);
    if (!updated) {
      throw new ORPCError("NOT_FOUND", { message: "Chapter not found" });
    }
    return updated;
  }

  async deleteChapter(
    input: DeleteChapterInput,
    ownerId: string
  ): Promise<void> {
    await this.guard.assertOwnerOrForbidden(input.id, ownerId);

    const children = await this.repo.countChildren(input.id);
    if (children > 0) {
      throw new ORPCError("CHAPTER_NOT_EMPTY", {
        message: "Chapter is not empty",
      });
    }

    const ok = await this.repo.deleteChapter(input.id, ownerId);
    if (!ok) {
      throw new ORPCError("NOT_FOUND", { message: "Chapter not found" });
    }
  }

  async getChaptersByStudySet(
    input: GetChaptersInput,
    userId: string
  ): Promise<Chapter[]> {
    await this.guard.assertStudySetVisibleByIdOrNotFound(
      input.studySetId,
      userId
    );
    return await this.repo.findChaptersByStudySet(userId, input.studySetId);
  }

  async getChapter(input: GetChapterInput, userId: string): Promise<Chapter> {
    return await this.guard.assertVisibleByIdOrNotFound(input.id, userId);
  }
}
