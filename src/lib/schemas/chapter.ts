import * as v from 'valibot';
import {
	CHAPTER_DESCRIPTION_MAX_LENGTH,
	CHAPTER_TITLE_MAX_LENGTH,
	CHAPTER_TITLE_MIN_LENGTH
} from './chapter.constant.ts';
import { createPrefixedIdSchema } from './id-schema.ts';
import { STUDY_SET_ID_PREFIX } from './study-set.ts';

export const CHAPTER_ID_PREFIX = 'chp';

const trimmedTitleSchema = v.pipe(
	v.string(),
	v.trim(),
	v.minLength(
		CHAPTER_TITLE_MIN_LENGTH,
		`Judul minimal ${CHAPTER_TITLE_MIN_LENGTH} karakter setelah dipangkas`
	),
	v.maxLength(CHAPTER_TITLE_MAX_LENGTH, `Judul maksimal ${CHAPTER_TITLE_MAX_LENGTH} karakter`)
);

const descriptionSchema = v.optional(
	v.pipe(
		v.string(),
		v.maxLength(
			CHAPTER_DESCRIPTION_MAX_LENGTH,
			`Deskripsi maksimal ${CHAPTER_DESCRIPTION_MAX_LENGTH} karakter`
		)
	)
);

const chapterIdSchema = createPrefixedIdSchema(CHAPTER_ID_PREFIX);
const studySetIdSchema = createPrefixedIdSchema(STUDY_SET_ID_PREFIX);

export const createChapterInputSchema = v.object({
	studySetId: studySetIdSchema,
	title: trimmedTitleSchema,
	description: descriptionSchema
});

export const updateChapterInputSchema = v.object({
	id: chapterIdSchema,
	title: v.optional(trimmedTitleSchema),
	description: v.optional(
		v.union([
			v.pipe(
				v.string(),
				v.maxLength(
					CHAPTER_DESCRIPTION_MAX_LENGTH,
					`Deskripsi maksimal ${CHAPTER_DESCRIPTION_MAX_LENGTH} karakter`
				)
			),
			v.literal(''),
			v.null()
		])
	)
});

export const deleteChapterInputSchema = v.object({
	id: chapterIdSchema
});

export const getChaptersInputSchema = v.object({ studySetId: studySetIdSchema });

export const getChapterInputSchema = v.object({
	id: chapterIdSchema
});

export const chapterSchema = v.object({
	id: v.string(),
	slug: v.string(),
	title: v.string(),
	description: v.nullable(v.string()),
	studySetId: v.string(),
	ownerId: v.string(),
	createdAt: v.date(),
	updatedAt: v.date()
});

export const chapterListOutputSchema = v.array(chapterSchema);

export const chapterDeleteOutputSchema = v.object({ success: v.literal(true) });

export type CreateChapterInput = v.InferOutput<typeof createChapterInputSchema>;
export type UpdateChapterInput = v.InferOutput<typeof updateChapterInputSchema>;
export type DeleteChapterInput = v.InferOutput<typeof deleteChapterInputSchema>;
export type GetChaptersInput = v.InferOutput<typeof getChaptersInputSchema>;
export type GetChapterInput = v.InferOutput<typeof getChapterInputSchema>;
