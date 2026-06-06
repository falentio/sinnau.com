import { studySetGuard } from "../study-set/index.ts";
import { ChapterGuard } from "./chapter.guard.ts";
import { ChapterDrizzleRepository } from "./chapter.repository.drizzle.ts";
import { ChapterService } from "./chapter.service.ts";

const chapterRepo = new ChapterDrizzleRepository();
export const chapterGuard = new ChapterGuard(chapterRepo, studySetGuard);
export const chapterService = new ChapterService(chapterRepo, chapterGuard);
