import { studySetAdminCleanupVisits } from "./commands/study-set.admin-cleanup-visits.ts";
import { studySetCreate } from "./commands/study-set.create.ts";
import { studySetDelete } from "./commands/study-set.delete.ts";
import { studySetRefreshVisit } from "./commands/study-set.refresh-visit.ts";
import { studySetUpdate } from "./commands/study-set.update.ts";
import { studySetGetRecent } from "./queries/study-set.get-recent.ts";
import { studySetGet } from "./queries/study-set.get.ts";
import { studySetList } from "./queries/study-set.list.ts";

export const studySetRouter = {
  admin: {
    cleanupVisits: studySetAdminCleanupVisits,
  },
  create: studySetCreate,
  delete: studySetDelete,
  get: studySetGet,
  list: studySetList,
  update: studySetUpdate,
  visit: {
    getRecent: studySetGetRecent,
    refresh: studySetRefreshVisit,
  },
};

export type StudySetRouter = typeof studySetRouter;
