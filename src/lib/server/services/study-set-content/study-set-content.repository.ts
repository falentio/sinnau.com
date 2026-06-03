import type {
	StudySetContent,
	StudySetContentToChapter
} from '../../infras/db/schema/study-set-content.ts';

export type StudySetContentUpdatePatch = Partial<Pick<StudySetContent, 'content' | 'updatedAt'>>;

export type StudySetContentWithChapters = StudySetContent & { chapterIds: string[] };

export interface StudySetContentRepository {
	insertContent(row: Omit<StudySetContent, 'createdAt' | 'updatedAt'>): Promise<StudySetContent>;
	updateContent(
		id: string,
		studySetId: string,
		patch: StudySetContentUpdatePatch
	): Promise<StudySetContent | null>;
	deleteContent(id: string, studySetId: string): Promise<boolean>;
	findContentById(id: string): Promise<StudySetContent | null>;
	findContentByIdWithChapters(id: string): Promise<StudySetContentWithChapters | null>;
	findContentsByStudySet(studySetId: string): Promise<StudySetContentWithChapters[]>;
	findContentsByChapter(chapterId: string): Promise<StudySetContentWithChapters[]>;
	linkChapter(contentId: string, chapterId: string): Promise<StudySetContentToChapter | null>;
	unlinkChapter(contentId: string, chapterId: string): Promise<boolean>;
	setChapters(contentId: string, chapterIds: string[]): Promise<void>;
	findChapterById(chapterId: string): Promise<{ id: string; studySetId: string } | null>;
}
