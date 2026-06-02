import { StudySetDrizzleRepository } from './study-set.repository.drizzle.ts';
import { StudySetGuard } from './study-set.guard.ts';
import { StudySetService } from './study-set.service.ts';

const studySetRepo = new StudySetDrizzleRepository();
export const studySetGuard = new StudySetGuard(studySetRepo);
export const studySetService = new StudySetService(studySetRepo, studySetGuard);
