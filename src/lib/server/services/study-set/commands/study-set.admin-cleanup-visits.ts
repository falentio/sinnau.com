import { adminProcedure } from '$lib/server/api/base';
import { studySetAdminCleanupVisitsOutputSchema } from '$lib/schemas/study-set';
import { studySetService } from '../study-set.service';

export const studySetAdminCleanupVisits = adminProcedure
	.output(studySetAdminCleanupVisitsOutputSchema)
	.handler(async () => studySetService.cleanupOldStudySetVisits());
