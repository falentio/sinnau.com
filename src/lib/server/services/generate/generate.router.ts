import { generateAdminCleanupChunks } from "./commands/generate.admin-cleanup-chunks.ts";
import { generateCreate } from "./commands/generate.create.ts";
import { generateCheckByStudySet } from "./queries/generate.check-by-study-set.ts";
import { generateCheck } from "./queries/generate.check.ts";
import { generateLanguageStyles } from "./queries/generate.language-styles.ts";

export const generateRouter = {
  admin: {
    cleanupChunks: generateAdminCleanupChunks,
  },
  check: generateCheck,
  checkByStudySet: generateCheckByStudySet,
  create: generateCreate,
  languageStyles: generateLanguageStyles,
};

export type GenerateRouter = typeof generateRouter;
