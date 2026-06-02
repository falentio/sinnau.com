import { adminProcedure } from '$lib/server/api/base';
import { studySetAdminCleanupVisitsOutputSchema } from '$lib/schemas/study-set';
import { studySetService } from '../index';

export const studySetAdminCleanupVisits = adminProcedure
	.output(studySetAdminCleanupVisitsOutputSchema)
	.handler(async () => studySetService.cleanupOldStudySetVisits());
