import { ORPCError } from "@orpc/server";

import { validateQuizOptions } from "../../../schemas/quiz.ts";
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

    if (input.chapterId !== undefined) {
      await this.guard.assertChapterInStudySetOrForbidden(
        input.chapterId,
        ownerId,
        input.studySetId
      );
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const optionRows = input.options.map((opt) => ({
      explanation: opt.explanation ?? null,
      id: crypto.randomUUID(),
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

    return await this.hydrateQuiz(updated);
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
      quizIds.map(
        async (id) => await this.guard.assertQuizOwnerOrForbidden(id, ownerId)
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

    return await this.repo.insertQuizOptions(rows);
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
    return await this.repo.findQuizzesByStudySetId(input.studySetId);
  }

  async getQuiz(input: GetQuizInput, userId: string): Promise<QuizWithOptions> {
    const quizRow = await this.guard.assertQuizVisibleByIdOrNotFound(
      input.id,
      userId
    );
    return await this.hydrateQuiz(quizRow);
  }

  private async hydrateQuiz(quiz: Quiz): Promise<QuizWithOptions> {
    const options = await this.repo.findOptionsByQuizIds([quiz.id]);
    return { ...quiz, options };
  }

  private static validateMergedOptionsForType(
    type: QuizType,
    options: { isCorrect: boolean }[]
  ): void {
    if (!validateQuizOptions(type, options)) {
      throw new ORPCError("VALIDATION_FAILED", {
        message: "Quiz options violate type constraints",
      });
    }
  }
}
