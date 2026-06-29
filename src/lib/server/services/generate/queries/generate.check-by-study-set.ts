import { authorizedProcedure } from "$lib/server/api/base";
import * as v from "valibot";

import { generateService } from "../index";

const inputSchema = v.object({ studySetId: v.string() });
const outputSchema = v.nullable(
  v.object({
    generateId: v.string(),
    status: v.picklist(["CREATED", "ONGOING"]),
    studySetId: v.string(),
  })
);

export const generateCheckByStudySet = authorizedProcedure
  .input(inputSchema)
  .output(outputSchema)
  .handler(async ({ input, context }) => {
    const row = await generateService.findActiveByStudySet(
      input.studySetId,
      context.user.id
    );
    if (!row) {
      return null;
    }
    return {
      generateId: row.id,
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      status: row.status as "CREATED" | "ONGOING",
      studySetId: row.studySetId,
    };
  });
