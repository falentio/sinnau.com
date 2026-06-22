import type { SearchStudySetsInput } from "$lib/schemas/study-set-search";
import { STUDY_SET_SEARCH_LIMIT } from "$lib/schemas/study-set-search.constant";

import type { StudySetSearchGuard } from "./study-set-search.guard.ts";
import type {
  StudySetSearchParams,
  StudySetSearchRepository,
  StudySetSearchResult,
} from "./study-set-search.repository.ts";
import { sanitizeFts5Query } from "./study-set-search.utils.ts";

export class StudySetSearchService {
  private readonly repo: StudySetSearchRepository;
  private readonly guard: StudySetSearchGuard;

  constructor(repo: StudySetSearchRepository, guard: StudySetSearchGuard) {
    this.repo = repo;
    this.guard = guard;
  }

  // oxlint-disable-next-line require-await
  async search(
    input: SearchStudySetsInput,
    userId: string | null | undefined
  ): Promise<StudySetSearchResult[]> {
    this.guard.requireUser(userId);
    const params: StudySetSearchParams = {
      limit: STUDY_SET_SEARCH_LIMIT,
      query: sanitizeFts5Query(input.query),
    };
    return await this.repo.search(params);
  }
}
