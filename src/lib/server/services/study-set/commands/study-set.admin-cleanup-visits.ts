import { studySetAdminCleanupVisitsOutputSchema } from "$lib/schemas/study-set";
import { adminProcedure } from "$lib/server/api/base";

import { studySetService } from "../index";

export const studySetAdminCleanupVisits = adminProcedure
  .output(studySetAdminCleanupVisitsOutputSchema)
  .handler(() => studySetService.cleanupOldStudySetVisits());
