import { listPlansOutputSchema } from "$lib/schemas/plan";
import { publicProcedure } from "$lib/server/api/base";

import { planService } from "../index";

export const planListPlans = publicProcedure
  .output(listPlansOutputSchema)
  .handler(() => planService.listPlans());
