import { generateAdminCleanupChunks } from "./commands/generate.admin-cleanup-chunks.ts";
import { generateCreate } from "./commands/generate.create.ts";
import { generateCheck } from "./queries/generate.check.ts";

export const generateRouter = {
  admin: {
    cleanupChunks: generateAdminCleanupChunks,
  },
  check: generateCheck,
  create: generateCreate,
};

export type GenerateRouter = typeof generateRouter;
