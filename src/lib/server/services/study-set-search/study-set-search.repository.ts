import type { StudySetSearchResult } from "$lib/schemas/study-set-search";

export type { StudySetSearchResult };

export interface StudySetSearchRepository {
  search(
    fts5Query: string,
    limit: number,
    userId: string | null | undefined
  ): Promise<StudySetSearchResult[]>;
}
