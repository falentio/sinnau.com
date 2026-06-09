import type {
  StudySet,
  StudySetVisit,
} from "../../infras/db/schema/study-set.ts";

export interface StudySetListPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface StudySetListResult {
  data: StudySet[];
  pagination: StudySetListPagination;
}

export type StudySetUpdatePatch = Partial<
  Pick<StudySet, "title" | "description" | "visibility" | "files" | "updatedAt">
>;

export interface StudySetRepository {
  insertStudySet(
    row: Omit<StudySet, "createdAt" | "updatedAt" | "deletedAt">
  ): Promise<StudySet>;
  updateStudySet(
    id: string,
    ownerId: string,
    patch: StudySetUpdatePatch
  ): Promise<StudySet | null>;
  deleteStudySet(id: string, ownerId: string): Promise<StudySet | null>;
  restoreStudySet(id: string, ownerId: string): Promise<StudySet | null>;
  hasUserVisitedStudySet(userId: string, studySetId: string): Promise<boolean>;
  findStudySetById(id: string): Promise<StudySet | null>;
  findStudySetBySlug(slug: string): Promise<StudySet | null>;
  findOwnedStudySets(
    ownerId: string,
    orderBy: "createdAt" | "updatedAt",
    orderDirection: "asc" | "desc",
    page: number
  ): Promise<StudySetListResult>;
  isSlugTaken(slug: string): Promise<boolean>;
  upsertVisit(
    userId: string,
    studySetId: string,
    visitedAt: number
  ): Promise<StudySetVisit>;
  deleteOldVisits(cutoffMs: number): Promise<number>;
  findRecentVisits(userId: string, count: number): Promise<StudySet[]>;
}
