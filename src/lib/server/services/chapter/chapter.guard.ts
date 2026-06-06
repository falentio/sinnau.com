import { ORPCError } from "@orpc/server";

import type { Chapter } from "../../infras/db/schema/chapter.ts";
import type { StudySetGuard } from "../study-set/study-set.guard.ts";
import type { ChapterRepository } from "./chapter.repository.ts";

export class ChapterGuard {
  private readonly repo: ChapterRepository;
  private readonly resolvedStudySetGuard: StudySetGuard;

  constructor(repo: ChapterRepository, studySetGuardInstance: StudySetGuard) {
    this.repo = repo;
    this.resolvedStudySetGuard = studySetGuardInstance;
  }

  async assertOwnerOrForbidden(id: string, ownerId: string): Promise<Chapter> {
    const ch = await this.repo.findChapterById(id);
    if (!ch || ch.ownerId !== ownerId) {
      throw new ORPCError("FORBIDDEN", {
        message: "Cannot modify a chapter you do not own",
      });
    }
    return ch;
  }

  async assertVisibleByIdOrNotFound(
    id: string,
    userId: string
  ): Promise<Chapter> {
    const ch = await this.repo.findChapterById(id);
    if (!ch) {
      throw new ORPCError("NOT_FOUND", { message: "Chapter not found" });
    }
    try {
      await this.resolvedStudySetGuard.assertStudySetVisibleByIdOrNotFound(
        ch.studySetId,
        userId
      );
    } catch (error) {
      if (error instanceof ORPCError && error.code === "NOT_FOUND") {
        throw new ORPCError("NOT_FOUND", { message: "Chapter not found" });
      }
      throw error;
    }
    return ch;
  }

  async assertStudySetOwnerOrForbidden(
    studySetId: string,
    ownerId: string
  ): Promise<void> {
    await this.resolvedStudySetGuard.assertStudySetOwnerOrForbidden(
      studySetId,
      ownerId
    );
  }
}
