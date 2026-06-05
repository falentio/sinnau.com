import { studySetGuard } from '../study-set/index.ts';
import { StudySetContentGuard } from './study-set-content.guard.ts';
import { StudySetContentDrizzleRepository } from './study-set-content.repository.drizzle.ts';
import { StudySetContentService } from './study-set-content.service.ts';

const studySetContentRepo = new StudySetContentDrizzleRepository();
export const studySetContentGuard = new StudySetContentGuard(studySetContentRepo, studySetGuard);
export const studySetContentService = new StudySetContentService(
	studySetContentRepo,
	studySetContentGuard
);
