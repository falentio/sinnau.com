import type { StudySetSearchResult } from "$lib/schemas/study-set-search";

export type { StudySetSearchResult };

export interface StudySetSearchParams {
  query: string;
  limit: number;
}

export interface StudySetSearchRepository {
  search(params: StudySetSearchParams): Promise<StudySetSearchResult[]>;
}
