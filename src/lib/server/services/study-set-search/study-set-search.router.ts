import { studySetSearch } from "./queries/study-set-search.search.ts";

export const studySetSearchRouter = {
  search: studySetSearch,
};

export type StudySetSearchRouter = typeof studySetSearchRouter;
