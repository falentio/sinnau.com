import { ORPCError } from "@orpc/server";

import { validateQuizOptions } from "../../../schemas/quiz.ts";
import type {
  CreateQuizInput,
  DeleteQuizOptionsInput,
  DeleteQuizzesInput,
  GetQuizInput,
  GetQuizzesInput,
  UpdateQuizInput,
} from "../../../schemas/quiz.ts";
import type {
  Quiz,
  QuizOption,
  QuizType,
} from "../../infras/db/schema/quiz.ts";
import type { QuizGuard } from "./quiz.guard.ts";
import type {
  NewQuizOptionRow,
  QuizOptionUpdatePatch,
  QuizRepository,
  QuizWithOptions,
} from "./quiz.repository.ts";

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

    if (input.chapterId !== undefined && input.chapterId !== null) {
      const quizRow = await this.repo.findQuizById(input.id);
      if (!quizRow) {
        throw new ORPCError("FORBIDDEN", {
          message: "Cannot modify a quiz you do not own",
        });
      }
      await this.guard.assertChapterInStudySetOrForbidden(
        input.chapterId,
        ownerId,
        quizRow.studySetId
      );
    }

    const quizPatch: {
      chapterId?: string | null;
      questionText?: string;
      updatedAt?: Date;
    } = {
      updatedAt: new Date(),
    };

    if (input.questionText !== undefined) {
      quizPatch.questionText = input.questionText;
    }
    if (input.chapterId !== undefined) {
      quizPatch.chapterId = input.chapterId;
    }

    let optionsToDelete: string[] = [];
    let optionsToUpdate: { id: string; patch: QuizOptionUpdatePatch }[] = [];
    let optionsToCreate: NewQuizOptionRow[] = [];

    if (input.options) {
      const processed = await this.processOptions(input.id, input.options);
      ({ optionsToDelete } = processed);
      ({ optionsToUpdate } = processed);
      ({ optionsToCreate } = processed);
    }

    const result = await this.repo.updateQuizWithOptions(
      input.id,
      ownerId,
      quizPatch,
      optionsToDelete,
      optionsToUpdate,
      optionsToCreate
    );

    if (!result) {
      throw new ORPCError("FORBIDDEN", {
        message: "Cannot modify a quiz you do not own",
      });
    }

    return result;
  }

  private async processOptions(
    quizId: string,
    inputOptions: NonNullable<UpdateQuizInput["options"]>
  ): Promise<{
    optionsToDelete: string[];
    optionsToUpdate: { id: string; patch: QuizOptionUpdatePatch }[];
    optionsToCreate: NewQuizOptionRow[];
  }> {
    const existingOptions = await this.repo.findOptionsByQuizIds([quizId]);

    const inputOptionIds: string[] = [];
    for (const o of inputOptions) {
      if (o.id !== undefined) {
        inputOptionIds.push(o.id);
      }
    }
    if (inputOptionIds.length > 0) {
      await this.guard.assertQuizOptionsBelongToQuizOrNotFound(
        quizId,
        inputOptionIds
      );
    }

    const inputIds = new Set<string>();
    for (const o of inputOptions) {
      if (o.id !== undefined) {
        inputIds.add(o.id);
      }
    }

    const optionsToDelete = existingOptions
      .filter((o) => !inputIds.has(o.id))
      .map((o) => o.id);

    const optionsToUpdate: { id: string; patch: QuizOptionUpdatePatch }[] = [];
    const optionsToCreate: NewQuizOptionRow[] = [];

    for (const inputOpt of inputOptions) {
      if (inputOpt.id === undefined) {
        optionsToCreate.push({
          explanation: inputOpt.explanation ?? null,
          id: crypto.randomUUID(),
          isCorrect: inputOpt.isCorrect,
          optionText: inputOpt.optionText,
          quizId,
        });
      } else {
        const patch: QuizOptionUpdatePatch = {
          updatedAt: new Date(),
        };
        if (inputOpt.optionText !== undefined) {
          patch.optionText = inputOpt.optionText;
        }
        patch.isCorrect = inputOpt.isCorrect;
        if (inputOpt.explanation !== undefined) {
          patch.explanation =
            inputOpt.explanation === "" || inputOpt.explanation === null
              ? null
              : inputOpt.explanation;
        }
        optionsToUpdate.push({ id: inputOpt.id, patch });
      }
    }

    const existingByIdMap = new Map(existingOptions.map((o) => [o.id, o]));
    const projected = inputOptions.map((o) => {
      if (o.id === undefined) {
        return {
          explanation: o.explanation ?? null,
          id: "new",
          isCorrect: o.isCorrect,
          optionText: o.optionText,
          quizId,
        };
      }
      const existing = existingByIdMap.get(o.id);
      if (!existing) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Internal server error",
        });
      }
      let explanation: string | null;
      if (o.explanation === undefined) {
        ({ explanation } = existing);
      } else if (o.explanation === "" || o.explanation === null) {
        explanation = null;
      } else {
        ({ explanation } = o);
      }
      return {
        ...existing,
        explanation,
        isCorrect: o.isCorrect,
        optionText: o.optionText,
      };
    });

    const quizRow = await this.repo.findQuizById(quizId);
    if (!quizRow) {
      throw new ORPCError("FORBIDDEN", {
        message: "Cannot modify a quiz you do not own",
      });
    }
    QuizService.validateMergedOptionsForType(quizRow.type, projected);

    return { optionsToCreate, optionsToDelete, optionsToUpdate };
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
