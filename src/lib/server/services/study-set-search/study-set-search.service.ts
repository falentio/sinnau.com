import { STUDY_SET_SEARCH_LIMIT } from "$lib/schemas/study-set-search.constant";

import type { StudySetSearchGuard } from "./study-set-search.guard.ts";
import type {
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
    query: string,
    userId: string | null | undefined
  ): Promise<StudySetSearchResult[]> {
    const authedUserId = this.guard.requireUser(userId);
    const fts5Query = sanitizeFts5Query(query);
    return await this.repo.search(
      fts5Query,
      STUDY_SET_SEARCH_LIMIT,
      authedUserId
    );
  }
}
