import { ORPCError } from "@orpc/server";

import type { StudySetContent } from "../../infras/db/schema/study-set-content.ts";
import type { StudySetGuard } from "../study-set/study-set.guard.ts";
import type { StudySetContentRepository } from "./study-set-content.repository.ts";

export class StudySetContentGuard {
  private readonly repo: StudySetContentRepository;
  private readonly resolvedStudySetGuard: StudySetGuard;

  constructor(
    repo: StudySetContentRepository,
    studySetGuardInstance: StudySetGuard
  ) {
    this.repo = repo;
    this.resolvedStudySetGuard = studySetGuardInstance;
  }

  async assertContentOwnerOrForbidden(
    id: string,
    ownerId: string
  ): Promise<StudySetContent> {
    const content = await this.repo.findContentById(id);
    if (!content) {
      throw new ORPCError("FORBIDDEN", {
        message: "Cannot modify content you do not own",
      });
    }
    try {
      await this.resolvedStudySetGuard.assertStudySetOwnerOrForbidden(
        content.studySetId,
        ownerId
      );
    } catch (error) {
      if (error instanceof ORPCError && error.code === "FORBIDDEN") {
        throw new ORPCError("FORBIDDEN", {
          message: "Cannot modify content you do not own",
        });
      }
      throw error;
    }
    return content;
  }

  async assertContentVisibleByIdOrNotFound(
    id: string,
    userId: string
  ): Promise<StudySetContent> {
    const content = await this.repo.findContentById(id);
    if (!content) {
      throw new ORPCError("NOT_FOUND", { message: "Content not found" });
    }
    try {
      await this.resolvedStudySetGuard.assertStudySetVisibleByIdOrNotFound(
        content.studySetId,
        userId
      );
    } catch (error) {
      if (error instanceof ORPCError && error.code === "NOT_FOUND") {
        throw new ORPCError("NOT_FOUND", { message: "Content not found" });
      }
      throw error;
    }
    return content;
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

  async assertStudySetVisibleByIdOrNotFound(
    studySetId: string,
    userId: string
  ): Promise<void> {
    await this.resolvedStudySetGuard.assertStudySetVisibleByIdOrNotFound(
      studySetId,
      userId
    );
  }
}
