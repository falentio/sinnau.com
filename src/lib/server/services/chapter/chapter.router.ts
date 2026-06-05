import { chapterCreate } from './commands/chapter.create.ts';
import { chapterDelete } from './commands/chapter.delete.ts';
import { chapterUpdate } from './commands/chapter.update.ts';
import { chapterGet } from './queries/chapter.get.ts';
import { chapterList } from './queries/chapter.list.ts';

export const chapterRouter = {
	create: chapterCreate,
	update: chapterUpdate,
	delete: chapterDelete,
	list: chapterList,
	get: chapterGet
};

export type ChapterRouter = typeof chapterRouter;
