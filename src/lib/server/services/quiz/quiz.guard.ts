import { ORPCError } from "@orpc/server";

import type { Chapter } from "../../infras/db/schema/chapter.ts";
import type { Quiz, QuizOption } from "../../infras/db/schema/quiz.ts";
import type { StudySet } from "../../infras/db/schema/study-set.ts";
import type { ChapterGuard } from "../chapter/chapter.guard.ts";
import type { StudySetGuard } from "../study-set/study-set.guard.ts";
import type { QuizRepository } from "./quiz.repository.ts";

export class QuizGuard {
  private readonly repo: QuizRepository;
  private readonly resolvedStudySetGuard: StudySetGuard;
  private readonly resolvedChapterGuard: ChapterGuard;

  constructor(
    repo: QuizRepository,
    studySetGuardInstance: StudySetGuard,
    chapterGuardInstance: ChapterGuard
  ) {
    this.repo = repo;
    this.resolvedStudySetGuard = studySetGuardInstance;
    this.resolvedChapterGuard = chapterGuardInstance;
  }

  async assertStudySetOwnerOrForbidden(
    studySetId: string,
    ownerId: string
  ): Promise<StudySet> {
    try {
      return await this.resolvedStudySetGuard.assertStudySetOwnerOrForbidden(
        studySetId,
        ownerId
      );
    } catch (error) {
      if (error instanceof ORPCError && error.code === "FORBIDDEN") {
        throw new ORPCError("FORBIDDEN", {
          message: "Cannot modify a study set you do not own",
        });
      }
      throw error;
    }
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

  async assertChapterOwnerOrForbidden(
    chapterId: string,
    ownerId: string
  ): Promise<Chapter> {
    return await this.resolvedChapterGuard.assertOwnerOrForbidden(
      chapterId,
      ownerId
    );
  }

  async assertChapterInStudySetOrForbidden(
    chapterId: string,
    ownerId: string,
    expectedStudySetId: string
  ): Promise<Chapter> {
    const ch = await this.repo.findChapterById(chapterId);
    if (!ch) {
      throw new ORPCError("NOT_FOUND", { message: "Chapter not found" });
    }
    if (ch.studySetId !== expectedStudySetId) {
      throw new ORPCError("VALIDATION_FAILED", {
        message: "Chapter does not belong to the target study set",
      });
    }
    if (ch.ownerId !== ownerId) {
      throw new ORPCError("FORBIDDEN", {
        message: "Cannot use a chapter you do not own",
      });
    }
    return ch;
  }

  async assertQuizOwnerOrForbidden(
    quizId: string,
    ownerId: string
  ): Promise<Quiz> {
    const quizRow = await this.repo.findQuizById(quizId);
    if (!quizRow || quizRow.ownerId !== ownerId) {
      throw new ORPCError("FORBIDDEN", {
        message: "Cannot modify a quiz you do not own",
      });
    }
    return quizRow;
  }

  async assertQuizOwnerBatchOrPartialForbidden(
    ids: string[],
    ownerId: string
  ): Promise<Quiz[]> {
    const rows = await this.repo.findQuizzesByIds(ids);
    const foundIds = new Set(rows.map((row) => row.id));
    const blockedIds: string[] = [];
    for (const id of ids) {
      if (!foundIds.has(id)) {
        blockedIds.push(id);
        continue;
      }
      const row = rows.find((r) => r.id === id);
      if (!row) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Internal server error",
        });
      }
      if (row.ownerId !== ownerId) {
        blockedIds.push(id);
      }
    }
    if (blockedIds.length > 0) {
      throw new ORPCError("PARTIAL_FORBIDDEN", {
        data: { ids: blockedIds },
        message: "Some ids cannot be modified by this user",
      });
    }
    return rows;
  }

  async assertQuizOptionOwnerBatchOrPartialForbidden(
    ids: string[],
    ownerId: string
  ): Promise<QuizOption[]> {
    const owned = await this.repo.findOptionsByIdsForOwner(ids, ownerId);
    const ownedIds = new Set(owned.map((o) => o.id));
    const blockedIds = ids.filter((id) => !ownedIds.has(id));
    if (blockedIds.length > 0) {
      throw new ORPCError("PARTIAL_FORBIDDEN", {
        data: { ids: blockedIds },
        message: "Some ids cannot be modified by this user",
      });
    }
    return owned;
  }

  async assertQuizVisibleByIdOrNotFound(
    quizId: string,
    userId: string
  ): Promise<Quiz> {
    const quizRow = await this.repo.findQuizById(quizId);
    if (!quizRow) {
      throw new ORPCError("NOT_FOUND", { message: "Quiz not found" });
    }
    try {
      await this.resolvedStudySetGuard.assertStudySetVisibleByIdOrNotFound(
        quizRow.studySetId,
        userId
      );
    } catch (error) {
      if (error instanceof ORPCError && error.code === "NOT_FOUND") {
        throw new ORPCError("NOT_FOUND", { message: "Quiz not found" });
      }
      throw error;
    }
    return quizRow;
  }
}
