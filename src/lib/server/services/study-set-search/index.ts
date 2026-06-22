import { StudySetSearchGuard } from "./study-set-search.guard.ts";
import { StudySetSearchDrizzleRepository } from "./study-set-search.repository.drizzle.ts";
import { StudySetSearchService } from "./study-set-search.service.ts";

const studySetSearchRepo = new StudySetSearchDrizzleRepository();
studySetSearchRepo.setup();
export const studySetSearchGuard = new StudySetSearchGuard();
export const studySetSearchService = new StudySetSearchService(
  studySetSearchRepo,
  studySetSearchGuard
);
