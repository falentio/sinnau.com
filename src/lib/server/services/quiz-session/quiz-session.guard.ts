import { ORPCError } from "@orpc/server";

import type {
  QuizSession,
  QuizSessionQuiz,
  QuizSessionQuizOption,
} from "../../infras/db/schema/quiz-session.ts";
import type { StudySet } from "../../infras/db/schema/study-set.ts";
import type { ChapterRepository } from "../chapter/chapter.repository.ts";
import type { StudySetGuard } from "../study-set/study-set.guard.ts";
import type { QuizSessionRepository } from "./quiz-session.repository.ts";

export class QuizSessionGuard {
  private readonly repo: QuizSessionRepository;
  private readonly resolvedStudySetGuard: StudySetGuard;
  private readonly chapterRepo: ChapterRepository;

  constructor(
    repo: QuizSessionRepository,
    studySetGuardInstance: StudySetGuard,
    chapterRepo: ChapterRepository
  ) {
    this.repo = repo;
    this.resolvedStudySetGuard = studySetGuardInstance;
    this.chapterRepo = chapterRepo;
  }

  // oxlint-disable-next-line class-methods-use-this
  requireUser(userId: string | null | undefined): string {
    // oxlint-disable-next-line typescript/strict-boolean-expressions
    if (!userId) {
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
    return await this.resolvedStudySetGuard.assertStudySetVisibleByIdOrNotFound(
      studySetId,
      userId
    );
  }

  async assertChapterBelongsToStudySetOrValidationFailed(
    chapterId: string,
    studySetId: string
  ): Promise<void> {
    const ch = await this.chapterRepo.findChapterById(chapterId);
    if (!ch || ch.studySetId !== studySetId) {
      throw new ORPCError("VALIDATION_FAILED", {
        message: "Chapter does not belong to the study set",
      });
    }
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

  // oxlint-disable-next-line class-methods-use-this
  assertSessionActive(session: QuizSession): void {
    if (session.status !== "ACTIVE") {
      throw new ORPCError("SESSION_ALREADY_COMPLETED", {
        message: "Cannot modify a completed session",
      });
    }
  }

  async assertQuizInSessionOrValidationFailed(
    sessionQuizId: string,
    sessionId: string
  ): Promise<QuizSessionQuiz> {
    const quizRow = await this.repo.findSessionQuizById(sessionQuizId);
    if (!quizRow) {
      throw new ORPCError("NOT_FOUND", {
        message: "Session quiz not found",
      });
    }
    if (quizRow.sessionId !== sessionId) {
      throw new ORPCError("VALIDATION_FAILED", {
        message: "Quiz does not belong to this session",
      });
    }
    return quizRow;
  }

  async assertOptionsBelongToSessionQuizOrValidationFailed(
    optionIds: string[],
    sessionQuizId: string
  ): Promise<QuizSessionQuizOption[]> {
    if (optionIds.length === 0) {
      return [];
    }
    const options = await this.repo.findSessionQuizOptionsByIds(optionIds);
    const foundIds = new Set(options.map((o) => o.id));
    const notFound = optionIds.filter((id) => !foundIds.has(id));

    if (notFound.length > 0) {
      throw new ORPCError("VALIDATION_FAILED", {
        message: "Some option IDs do not exist",
      });
    }

    const notBelong = options.filter((o) => o.sessionQuizId !== sessionQuizId);
    if (notBelong.length > 0) {
      throw new ORPCError("VALIDATION_FAILED", {
        message: "Some options do not belong to this quiz",
      });
    }

    return options;
  }
}
