import {
  FITB_OPTION_EXACT,
  MCQ_OPTION_MAX,
  MCQ_OPTION_MIN,
  MS_OPTION_MAX,
} from "$lib/schemas/quiz.constant";
import { ORPCError } from "@orpc/server";

import type {
  CreateQuizInput,
  CreateQuizOptionsInput,
  DeleteQuizOptionsInput,
  DeleteQuizzesInput,
  GetQuizInput,
  GetQuizzesInput,
  UpdateQuizInput,
  UpdateQuizOptionInput,
} from "../../../schemas/quiz.ts";
import type {
  Quiz,
  QuizOption,
  QuizType,
} from "../../infras/db/schema/quiz.ts";
import type { QuizGuard } from "./quiz.guard.ts";
import type { QuizRepository, QuizWithOptions } from "./quiz.repository.ts";

export type { Quiz, QuizOption, QuizType };

export class QuizService {
  private readonly repo: QuizRepository;
  private readonly guard: QuizGuard;

  constructor(repo: QuizRepository, guard: QuizGuard) {
    this.repo = repo;
    this.guard = guard;
  }

  async createQuiz(
    input: CreateQuizInput,
    ownerId: string
  ): Promise<QuizWithOptions> {
    await this.guard.assertStudySetOwnerOrForbidden(input.studySetId, ownerId);

    if (input.chapterId) {
      await this.guard.assertChapterInStudySetOrForbidden(
        input.chapterId,
        ownerId,
        input.studySetId
      );
    }

    const options: {
      id: string;
      optionText: string;
      isCorrect: boolean;
      explanation: string | null;
    }[] = [];
    if (input.options && input.options.length > 0) {
      QuizService.validateMergedOptionsForType(input.type, input.options);
      for (const opt of input.options) {
        options.push({
          explanation: opt.explanation ?? null,
          id: crypto.randomUUID(),
          isCorrect: opt.isCorrect,
          optionText: opt.optionText,
        });
      }
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const optionRows = options.map((opt) => ({
      explanation: opt.explanation,
      id: opt.id,
      isCorrect: opt.isCorrect,
      optionText: opt.optionText,
      quizId: id,
    }));
    const created = await this.repo.insertQuiz(
      {
        chapterId: input.chapterId ?? null,
        id,
        ownerId,
        questionText: input.questionText,
        studySetId: input.studySetId,
        type: input.type,
      },
      optionRows
    );

    return {
      ...created,
      options: optionRows.map((row) => ({
        ...row,
        createdAt: now,
        updatedAt: now,
      })),
    };
  }

  async updateQuiz(
    input: UpdateQuizInput,
    ownerId: string
  ): Promise<QuizWithOptions> {
    await this.guard.assertQuizOwnerOrForbidden(input.id, ownerId);

    const updated = await this.repo.updateQuiz(input.id, ownerId, {
      questionText: input.questionText,
    });
    if (!updated) {
      throw new ORPCError("NOT_FOUND", { message: "Quiz not found" });
    }

    return this.hydrateQuiz(updated);
  }

  async deleteQuizzes(
    input: DeleteQuizzesInput,
    ownerId: string
  ): Promise<void> {
    await this.guard.assertQuizOwnerBatchOrPartialForbidden(input.ids, ownerId);

    const ok = await this.repo.deleteQuizzes(input.ids, ownerId);
    if (!ok) {
      throw new ORPCError("NOT_FOUND", {
        message: "Some quizzes could not be deleted",
      });
    }
  }

  async createQuizOptions(
    input: CreateQuizOptionsInput,
    ownerId: string
  ): Promise<QuizOption[]> {
    const quizIds = [...new Set(input.options.map((o) => o.quizId))];
    const quizzes = await Promise.all(
      quizIds.map(async (id) =>
        this.guard.assertQuizOwnerOrForbidden(id, ownerId)
      )
    );

    const existingOptions = await this.repo.findOptionsByQuizIds(quizIds);
    const existingByQuiz = new Map<string, QuizOption[]>();
    for (const opt of existingOptions) {
      const list = existingByQuiz.get(opt.quizId) ?? [];
      list.push(opt);
      existingByQuiz.set(opt.quizId, list);
    }

    for (const quizRow of quizzes) {
      const newOptions = input.options.filter((o) => o.quizId === quizRow.id);
      const existing = existingByQuiz.get(quizRow.id) ?? [];
      const merged = [...existing, ...newOptions];
      QuizService.validateMergedOptionsForType(quizRow.type, merged);
    }

    const rows = input.options.map((opt) => ({
      explanation: opt.explanation ?? null,
      id: crypto.randomUUID(),
      isCorrect: opt.isCorrect,
      optionText: opt.optionText,
      quizId: opt.quizId,
    }));

    return this.repo.insertQuizOptions(rows);
  }

  async updateQuizOption(
    input: UpdateQuizOptionInput,
    ownerId: string
  ): Promise<QuizOption> {
    const existing = await this.repo.findOptionByIdForOwner(input.id, ownerId);
    if (!existing) {
      throw new ORPCError("NOT_FOUND", { message: "Quiz option not found" });
    }

    const quizRow = await this.repo.findQuizById(existing.quizId);
    if (!quizRow) {
      throw new ORPCError("NOT_FOUND", { message: "Quiz not found" });
    }

    const nextIsCorrect = input.isCorrect ?? existing.isCorrect;
    let nextExplanation: string | null;
    if (input.explanation === undefined) {
      nextExplanation = existing.explanation;
    } else if (input.explanation === "" || input.explanation === null) {
      nextExplanation = null;
    } else {
      nextExplanation = input.explanation;
    }
    const projected = {
      ...existing,
      explanation: nextExplanation,
      isCorrect: nextIsCorrect,
      optionText: input.optionText ?? existing.optionText,
    };

    const allOptions = await this.repo.findOptionsByQuizIds([existing.quizId]);
    const others = allOptions.filter((o) => o.id !== existing.id);
    const merged = [...others, projected];
    QuizService.validateMergedOptionsForType(quizRow.type, merged);

    const patch: {
      optionText?: string;
      isCorrect?: boolean;
      explanation?: string | null;
    } = {};
    if (input.optionText !== undefined) {
      patch.optionText = input.optionText;
    }
    if (input.isCorrect !== undefined) {
      patch.isCorrect = input.isCorrect;
    }
    if (input.explanation !== undefined) {
      patch.explanation =
        input.explanation === "" || input.explanation === null
          ? null
          : input.explanation;
    }

    const updated = await this.repo.updateQuizOption(
      existing.id,
      ownerId,
      patch
    );
    if (!updated) {
      throw new ORPCError("NOT_FOUND", { message: "Quiz option not found" });
    }
    return updated;
  }

  async deleteQuizOptions(
    input: DeleteQuizOptionsInput,
    ownerId: string
  ): Promise<void> {
    const owned = await this.guard.assertQuizOptionOwnerBatchOrPartialForbidden(
      input.ids,
      ownerId
    );

    const groupedByQuiz = new Map<string, QuizOption[]>();
    for (const opt of owned) {
      const list = groupedByQuiz.get(opt.quizId) ?? [];
      list.push(opt);
      groupedByQuiz.set(opt.quizId, list);
    }

    const quizIds = [...groupedByQuiz.keys()];
    const [quizzes, allOptions] = await Promise.all([
      this.repo.findQuizzesByIds(quizIds),
      this.repo.findOptionsByQuizIds(quizIds),
    ]);
    const quizzesById = new Map(quizzes.map((q) => [q.id, q]));
    const optionsByQuiz = new Map<string, QuizOption[]>();
    for (const opt of allOptions) {
      const list = optionsByQuiz.get(opt.quizId) ?? [];
      list.push(opt);
      optionsByQuiz.set(opt.quizId, list);
    }

    for (const [quizId, optionsToDelete] of groupedByQuiz) {
      const quizRow = quizzesById.get(quizId);
      if (!quizRow) {
        throw new ORPCError("NOT_FOUND", { message: "Quiz not found" });
      }
      const allForQuiz = optionsByQuiz.get(quizId) ?? [];
      const remaining = allForQuiz.filter(
        (o) => !optionsToDelete.some((d) => d.id === o.id)
      );
      QuizService.assertRemainingOptionsValid(
        quizRow.type,
        allForQuiz,
        remaining
      );
      QuizService.validateMergedOptionsForType(quizRow.type, remaining);
    }

    const ok = await this.repo.deleteQuizOptions(input.ids, ownerId);
    if (!ok) {
      throw new ORPCError("NOT_FOUND", {
        message: "Some quiz options could not be deleted",
      });
    }
  }

  async getQuizzes(
    input: GetQuizzesInput,
    userId: string
  ): Promise<QuizWithOptions[]> {
    await this.guard.assertStudySetVisibleOrNotFound(input.studySetId, userId);
    return this.repo.findQuizzesByStudySetId(input.studySetId);
  }

  async getQuiz(input: GetQuizInput, userId: string): Promise<QuizWithOptions> {
    const quizRow = await this.guard.assertQuizVisibleByIdOrNotFound(
      input.id,
      userId
    );
    return this.hydrateQuiz(quizRow);
  }

  private async hydrateQuiz(quiz: Quiz): Promise<QuizWithOptions> {
    const options = await this.repo.findOptionsByQuizIds([quiz.id]);
    return { ...quiz, options };
  }

  private static validateMergedOptionsForType(
    type: QuizType,
    options: { isCorrect: boolean }[]
  ): void {
    switch (type) {
      case "MULTIPLE_CHOICE": {
        if (options.length > MCQ_OPTION_MAX) {
          throw new ORPCError("VALIDATION_FAILED", {
            message: `Multiple choice quizzes allow at most ${MCQ_OPTION_MAX} options`,
          });
        }
        if (options.length >= MCQ_OPTION_MIN) {
          const correct = options.filter((o) => o.isCorrect);
          if (correct.length !== 1) {
            throw new ORPCError("MC_ALREADY_HAS_CORRECT", {
              message:
                "Multiple choice quizzes must have exactly one correct option",
            });
          }
        }
        return;
      }
      case "MULTIPLE_SELECT": {
        if (options.length > MS_OPTION_MAX) {
          throw new ORPCError("VALIDATION_FAILED", {
            message: `Multiple select quizzes allow at most ${MS_OPTION_MAX} options`,
          });
        }
        if (options.length > 0) {
          const correct = options.filter((o) => o.isCorrect);
          if (correct.length === 0) {
            throw new ORPCError("VALIDATION_FAILED", {
              message:
                "Multiple select quizzes must have at least one correct option",
            });
          }
        }
        return;
      }
      case "FILL_IN_THE_BLANK": {
        if (options.length > FITB_OPTION_EXACT) {
          throw new ORPCError("FITB_MULTIPLE_OPTIONS", {
            message: "Fill-in-the-blank quizzes allow exactly one option",
          });
        }
        if (options.length === 1 && !options.some((o) => o.isCorrect)) {
          throw new ORPCError("CANNOT_DELETE_LAST_CORRECT", {
            message: "Fill-in-the-blank option must be correct",
          });
        }
        return;
      }
      default: {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Internal server error",
        });
      }
    }
  }

  private static assertRemainingOptionsValid(
    type: QuizType,
    previousOptions: { isCorrect: boolean }[],
    remainingOptions: { isCorrect: boolean }[]
  ): void {
    const hadCorrect = previousOptions.some((o) => o.isCorrect);
    const hasCorrect = remainingOptions.some((o) => o.isCorrect);
    switch (type) {
      case "FILL_IN_THE_BLANK": {
        if (remainingOptions.length === 0 && previousOptions.length > 0) {
          throw new ORPCError("CANNOT_DELETE_LAST_CORRECT", {
            message: "Cannot delete the only fill-in-the-blank option",
          });
        }
        return;
      }
      case "MULTIPLE_CHOICE": {
        if (hadCorrect && !hasCorrect) {
          throw new ORPCError("CANNOT_DELETE_LAST_CORRECT", {
            message:
              "Cannot delete the last correct option from a multiple choice quiz",
          });
        }
        return;
      }
      case "MULTIPLE_SELECT": {
        if (hadCorrect && !hasCorrect) {
          throw new ORPCError("CANNOT_DELETE_LAST_CORRECT", {
            message:
              "Cannot delete the last correct option from a multiple select quiz",
          });
        }
        return;
      }
      default: {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Internal server error",
        });
      }
    }
  }
}
