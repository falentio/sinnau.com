import { chapterCreate } from './commands/chapter.create.ts';
import { chapterUpdate } from './commands/chapter.update.ts';
import { chapterDelete } from './commands/chapter.delete.ts';
import { chapterList } from './queries/chapter.list.ts';
import { chapterGet } from './queries/chapter.get.ts';

export const chapterRouter = {
	create: chapterCreate,
	update: chapterUpdate,
	delete: chapterDelete,
	list: chapterList,
	get: chapterGet
};

export type ChapterRouter = typeof chapterRouter;
