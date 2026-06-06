import { chapterCreate } from "./commands/chapter.create.ts";
import { chapterDelete } from "./commands/chapter.delete.ts";
import { chapterUpdate } from "./commands/chapter.update.ts";
import { chapterGet } from "./queries/chapter.get.ts";
import { chapterList } from "./queries/chapter.list.ts";

export const chapterRouter = {
  create: chapterCreate,
  delete: chapterDelete,
  get: chapterGet,
  list: chapterList,
  update: chapterUpdate,
};

export type ChapterRouter = typeof chapterRouter;
