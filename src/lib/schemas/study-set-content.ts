import * as v from 'valibot';
import { createPrefixedIdSchema } from './id-schema.ts';
import { STUDY_SET_CONTENT_ID_PREFIX } from '../server/services/study-set-content/study-set-content.constant.ts';
import { STUDY_SET_CONTENT_MAX_LENGTH } from '../server/services/study-set-content/study-set-content.constant.ts';
import { STUDY_SET_ID_PREFIX } from './study-set.ts';
import { CHAPTER_ID_PREFIX } from './chapter.ts';

const contentIdSchema = createPrefixedIdSchema(STUDY_SET_CONTENT_ID_PREFIX);
const studySetIdSchema = createPrefixedIdSchema(STUDY_SET_ID_PREFIX);
const chapterIdSchema = createPrefixedIdSchema(CHAPTER_ID_PREFIX);

const contentStringSchema = v.pipe(
	v.string(),
	v.minLength(1, 'Content must not be empty'),
	v.maxLength(
		STUDY_SET_CONTENT_MAX_LENGTH,
		`Content must be at most ${STUDY_SET_CONTENT_MAX_LENGTH} characters`
	)
);

export const createStudySetContentInputSchema = v.object({
	studySetId: studySetIdSchema,
	content: contentStringSchema,
	chapterIds: v.optional(
		v.pipe(v.array(chapterIdSchema), v.maxLength(32, 'Maximum 32 chapter IDs'))
	)
});

export const updateStudySetContentInputSchema = v.object({
	id: contentIdSchema,
	content: contentStringSchema
});

export const deleteStudySetContentInputSchema = v.object({
	id: contentIdSchema
});

export const getStudySetContentInputSchema = v.object({
	id: contentIdSchema
});

export const listStudySetContentInputSchema = v.object({
	studySetId: studySetIdSchema
});

export const listByChapterStudySetContentInputSchema = v.object({
	chapterId: chapterIdSchema
});

export const linkChapterToContentInputSchema = v.object({
	contentId: contentIdSchema,
	chapterId: chapterIdSchema
});

export const unlinkChapterFromContentInputSchema = v.object({
	contentId: contentIdSchema,
	chapterId: chapterIdSchema
});

export const setContentChaptersInputSchema = v.object({
	contentId: contentIdSchema,
	chapterIds: v.array(chapterIdSchema)
});

export const studySetContentSchema = v.object({
	id: v.string(),
	studySetId: v.string(),
	content: v.string(),
	chapterIds: v.array(v.string()),
	createdAt: v.date(),
	updatedAt: v.date()
});

export const studySetContentListOutputSchema = v.array(studySetContentSchema);

export const studySetContentDeleteOutputSchema = v.object({ success: v.literal(true) });

export const linkChapterOutputSchema = v.object({ success: v.literal(true) });

export type CreateStudySetContentInput = v.InferOutput<typeof createStudySetContentInputSchema>;
export type UpdateStudySetContentInput = v.InferOutput<typeof updateStudySetContentInputSchema>;
export type DeleteStudySetContentInput = v.InferOutput<typeof deleteStudySetContentInputSchema>;
export type GetStudySetContentInput = v.InferOutput<typeof getStudySetContentInputSchema>;
export type ListStudySetContentInput = v.InferOutput<typeof listStudySetContentInputSchema>;
export type ListByChapterStudySetContentInput = v.InferOutput<
	typeof listByChapterStudySetContentInputSchema
>;
export type LinkChapterToContentInput = v.InferOutput<typeof linkChapterToContentInputSchema>;
export type UnlinkChapterFromContentInput = v.InferOutput<
	typeof unlinkChapterFromContentInputSchema
>;
export type SetContentChaptersInput = v.InferOutput<typeof setContentChaptersInputSchema>;
