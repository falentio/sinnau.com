import { ORPCError } from "@orpc/server";

import type { FlashcardSession } from "../../infras/db/schema/flashcard-session.ts";
import type { StudySet } from "../../infras/db/schema/study-set.ts";
import type { FlashcardRepository } from "../flashcard/flashcard.repository.ts";
import type { StudySetGuard } from "../study-set/study-set.guard.ts";
import type { FlashcardSessionRepository } from "./flashcard-session.repository.ts";

export class FlashcardSessionGuard {
  private readonly repo: FlashcardSessionRepository;
  private readonly studySetGuard: StudySetGuard;
  private readonly flashcardRepo: FlashcardRepository;

  constructor(
    repo: FlashcardSessionRepository,
    studySetGuardInstance: StudySetGuard,
    flashcardRepo: FlashcardRepository
  ) {
    this.repo = repo;
    this.studySetGuard = studySetGuardInstance;
    this.flashcardRepo = flashcardRepo;
  }

  // oxlint-disable-next-line class-methods-use-this, typescript/strict-boolean-expressions
  requireUser(userId: string | null | undefined): string {
    if (userId === null || userId === undefined) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Authentication is required",
      });
    }
    return userId;
  }

  async assertStudySetVisibleOrNotFound(
    studySetId: string,
    userId: string
  ): Promise<StudySet> {
    return await this.studySetGuard.assertStudySetVisibleByIdOrNotFound(
      studySetId,
      userId
    );
  }

  async assertSessionOwnerOrNotFound(
    sessionId: string,
    userId: string
  ): Promise<FlashcardSession> {
    const session = await this.repo.findSessionById(sessionId);
    if (!session || session.userId !== userId) {
      throw new ORPCError("NOT_FOUND", {
        message: "Flashcard session not found",
      });
    }
    return session;
  }

  async assertFlashcardBelongsToStudySetOrValidationFailed(
    flashcardId: string,
    studySetId: string
  ): Promise<void> {
    const card = await this.flashcardRepo.findFlashcardById(flashcardId);
    if (!card || card.studySetId !== studySetId) {
      throw new ORPCError("VALIDATION_FAILED", {
        message: "Flashcard does not belong to the study set",
      });
    }
  }

  async canViewStudySet(studySetId: string, userId: string): Promise<boolean> {
    try {
      await this.studySetGuard.assertStudySetVisibleByIdOrNotFound(
        studySetId,
        userId
      );
      return true;
    } catch {
      return false;
    }
  }
}
