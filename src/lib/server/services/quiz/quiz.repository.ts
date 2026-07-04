import type { Chapter } from "../../infras/db/schema/chapter.ts";
import type { Quiz, QuizOption } from "../../infras/db/schema/quiz.ts";

export type QuizWithOptions = Quiz & { options: QuizOption[] };

export type NewQuizRow = Omit<
  Quiz,
  "createdAt" | "updatedAt" | "isAiGenerated"
>;
export type NewQuizOptionRow = Omit<QuizOption, "createdAt" | "updatedAt">;

export type QuizUpdatePatch = Partial<
  Pick<Quiz, "questionText" | "chapterId" | "updatedAt">
>;
export type QuizOptionUpdatePatch = Partial<
  Pick<QuizOption, "optionText" | "isCorrect" | "explanation" | "updatedAt">
>;

export interface QuizRepository {
  insertQuiz(row: NewQuizRow, options: NewQuizOptionRow[]): Promise<Quiz>;
  updateQuiz(
    id: string,
    ownerId: string,
    patch: QuizUpdatePatch
  ): Promise<Quiz | null>;
  deleteQuizzes(ids: string[], ownerId: string): Promise<boolean>;
  findQuizById(id: string): Promise<Quiz | null>;
  findQuizzesByIds(ids: string[]): Promise<Quiz[]>;
  findQuizzesByStudySetId(studySetId: string): Promise<QuizWithOptions[]>;
  findChapterById(id: string): Promise<Chapter | null>;
  findOptionsByQuizIds(quizIds: string[]): Promise<QuizOption[]>;
  findOptionsByIdsForOwner(
    ids: string[],
    ownerId: string
  ): Promise<QuizOption[]>;
  findOptionByIdForOwner(
    id: string,
    ownerId: string
  ): Promise<QuizOption | null>;
  insertQuizOptions(rows: NewQuizOptionRow[]): Promise<QuizOption[]>;
  updateQuizOption(
    id: string,
    ownerId: string,
    patch: QuizOptionUpdatePatch
  ): Promise<QuizOption | null>;
  deleteQuizOptions(ids: string[], ownerId: string): Promise<boolean>;
  findOptionsByIds(ids: string[]): Promise<QuizOption[]>;
  updateQuizWithOptions(
    quizId: string,
    ownerId: string,
    quizPatch: QuizUpdatePatch,
    optionsToDelete: string[],
    optionsToUpdate: { id: string; patch: QuizOptionUpdatePatch }[],
    optionsToCreate: NewQuizOptionRow[]
  ): Promise<QuizWithOptions | null>;
}
