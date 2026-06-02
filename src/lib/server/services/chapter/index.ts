import { ChapterDrizzleRepository } from './chapter.repository.drizzle.ts';
import { ChapterGuard } from './chapter.guard.ts';
import { ChapterService } from './chapter.service.ts';
import { studySetGuard } from '../study-set/index.ts';

const chapterRepo = new ChapterDrizzleRepository();
export const chapterGuard = new ChapterGuard(chapterRepo, studySetGuard);
export const chapterService = new ChapterService(chapterRepo, chapterGuard);
