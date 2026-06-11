import { ORPCError } from "@orpc/server";

import type { QuizSession } from "../../infras/db/schema/quiz-session.ts";
import type { StudySet } from "../../infras/db/schema/study-set.ts";
import type { StudySetGuard } from "../study-set/study-set.guard.ts";
import type { QuizSessionRepository } from "./quiz-session.repository.ts";

export class QuizSessionGuard {
  private readonly repo: QuizSessionRepository;
  private readonly studySetGuard: StudySetGuard;

  constructor(repo: QuizSessionRepository, studySetGuard: StudySetGuard) {
    this.repo = repo;
    this.studySetGuard = studySetGuard;
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

  async assertSessionOwnerOrNotFound(
    sessionId: string,
    userId: string
  ): Promise<QuizSession> {
    const session = await this.repo.findSessionById(sessionId);
    if (!session || session.userId !== userId) {
      throw new ORPCError("NOT_FOUND", {
        message: "Quiz session not found",
      });
    }
    return session;
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

  async assertChapterInStudySetOrValidationFailed(
    chapterId: string,
    studySetId: string
  ): Promise<void> {
    const ch = await this.repo.findChapterById(chapterId);
    if (!ch) {
      throw new ORPCError("NOT_FOUND", { message: "Chapter not found" });
    }
    if (ch.studySetId !== studySetId) {
      throw new ORPCError("VALIDATION_FAILED", {
        message: "Chapter does not belong to the study set",
      });
    }
  }

  async assertQuizInSessionScopeOrValidationFailed(
    quizId: string,
    studySetId: string,
    chapterId: string | null
  ): Promise<void> {
    const quiz = await this.repo.findQuizByIdInScope(
      quizId,
      studySetId,
      chapterId
    );
    if (!quiz) {
      throw new ORPCError("VALIDATION_FAILED", {
        message: "Quiz is not in session scope",
      });
    }
  }

  async assertQuizOptionsValidOrValidationFailed(
    quizId: string,
    selectedOptionIds: string[]
  ): Promise<void> {
    const options = await this.repo.findQuizOptionsByQuizId(quizId);
    const validOptionIds = new Set(options.map((o) => o.id));
    for (const id of selectedOptionIds) {
      if (!validOptionIds.has(id)) {
        throw new ORPCError("VALIDATION_FAILED", {
          message: "Selected option does not belong to the quiz",
        });
      }
    }
  }
}
