import { studySetContentCreate } from "./commands/study-set-content.create.ts";
import { studySetContentDelete } from "./commands/study-set-content.delete.ts";
import { studySetContentLinkChapter } from "./commands/study-set-content.link-chapter.ts";
import { studySetContentSetChapters } from "./commands/study-set-content.set-chapters.ts";
import { studySetContentUnlinkChapter } from "./commands/study-set-content.unlink-chapter.ts";
import { studySetContentUpdate } from "./commands/study-set-content.update.ts";
import { studySetContentGet } from "./queries/study-set-content.get.ts";
import { studySetContentListByChapter } from "./queries/study-set-content.list-by-chapter.ts";
import { studySetContentList } from "./queries/study-set-content.list.ts";

export const studySetContentRouter = {
  chapter: {
    link: studySetContentLinkChapter,
    set: studySetContentSetChapters,
    unlink: studySetContentUnlinkChapter,
  },
  create: studySetContentCreate,
  delete: studySetContentDelete,
  get: studySetContentGet,
  list: studySetContentList,
  listByChapter: studySetContentListByChapter,
  update: studySetContentUpdate,
};

export type StudySetContentRouter = typeof studySetContentRouter;
