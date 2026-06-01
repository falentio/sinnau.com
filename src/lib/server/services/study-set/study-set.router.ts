import { studySetCreate } from './commands/study-set.create.ts';
import { studySetUpdate } from './commands/study-set.update.ts';
import { studySetDelete } from './commands/study-set.delete.ts';
import { studySetRefreshVisit } from './commands/study-set.refresh-visit.ts';
import { studySetAdminCleanupVisits } from './commands/study-set.admin-cleanup-visits.ts';
import { studySetList } from './queries/study-set.list.ts';
import { studySetGet } from './queries/study-set.get.ts';
import { studySetGetRecent } from './queries/study-set.get-recent.ts';

export const studySetRouter = {
	create: studySetCreate,
	update: studySetUpdate,
	delete: studySetDelete,
	list: studySetList,
	get: studySetGet,
	visit: {
		refresh: studySetRefreshVisit,
		getRecent: studySetGetRecent
	},
	admin: {
		cleanupVisits: studySetAdminCleanupVisits
	}
};

export type StudySetRouter = typeof studySetRouter;
