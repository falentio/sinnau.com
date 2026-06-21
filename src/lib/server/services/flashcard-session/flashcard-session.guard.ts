import { ORPCError } from "@orpc/server";

import type { FlashcardSession } from "../../infras/db/schema/flashcard-session.ts";
import type { Flashcard } from "../../infras/db/schema/flashcard.ts";
import type { StudySet } from "../../infras/db/schema/study-set.ts";
import type { FlashcardGuard } from "../flashcard/flashcard.guard.ts";
import type { StudySetGuard } from "../study-set/study-set.guard.ts";
import type { FlashcardSessionRepository } from "./flashcard-session.repository.ts";

export class FlashcardSessionGuard {
  private readonly repo: FlashcardSessionRepository;
  private readonly resolvedStudySetGuard: StudySetGuard;
  private readonly flashcardGuard: FlashcardGuard;

  constructor(
    repo: FlashcardSessionRepository,
    studySetGuardInstance: StudySetGuard,
    flashcardGuardInstance: FlashcardGuard
  ) {
    this.repo = repo;
    this.resolvedStudySetGuard = studySetGuardInstance;
    this.flashcardGuard = flashcardGuardInstance;
  }

  // oxlint-disable-next-line class-methods-use-this
  requireUser(userId: string | null | undefined): string {
    if (userId === null || userId === undefined) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Authentication is required",
      });
    }
    return userId;
  }

  // oxlint-disable-next-line require-await
  async assertStudySetVisibleOrNotFound(
    studySetId: string,
    userId: string
  ): Promise<StudySet> {
    return await this.resolvedStudySetGuard.assertStudySetVisibleByIdOrNotFound(
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

  async assertFlashcardBelongsToStudySetOrNotFound(
    flashcardId: string,
    studySetId: string
  ): Promise<Flashcard> {
    const card =
      await this.flashcardGuard.assertFlashcardExistsOrNotFound(flashcardId);
    if (card.studySetId !== studySetId) {
      throw new ORPCError("VALIDATION_FAILED", {
        message: "Flashcard does not belong to the study set",
      });
    }
    return card;
  }
}
