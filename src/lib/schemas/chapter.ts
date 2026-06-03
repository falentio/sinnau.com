import * as v from 'valibot';
import {
	CHAPTER_DESCRIPTION_MAX_LENGTH,
	CHAPTER_TITLE_MAX_LENGTH,
	CHAPTER_TITLE_MIN_LENGTH
} from '../server/services/chapter/chapter.constant.ts';

const trimmedTitleSchema = v.pipe(
	v.string(),
	v.trim(),
	v.minLength(
		CHAPTER_TITLE_MIN_LENGTH,
		`Title must be at least ${CHAPTER_TITLE_MIN_LENGTH} characters after trim`
	),
	v.maxLength(
		CHAPTER_TITLE_MAX_LENGTH,
		`Title must be at most ${CHAPTER_TITLE_MAX_LENGTH} characters`
	)
);

const descriptionSchema = v.optional(
	v.pipe(
		v.string(),
		v.maxLength(
			CHAPTER_DESCRIPTION_MAX_LENGTH,
			`Description must be at most ${CHAPTER_DESCRIPTION_MAX_LENGTH} characters`
		)
	)
);

const uuidSchema = v.pipe(v.string(), v.uuid());

export const createChapterInputSchema = v.object({
	studySetId: uuidSchema,
	title: trimmedTitleSchema,
	description: descriptionSchema
});

export const updateChapterInputSchema = v.object({
	id: uuidSchema,
	title: v.optional(trimmedTitleSchema),
	description: v.optional(
		v.union([
			v.pipe(
				v.string(),
				v.maxLength(
					CHAPTER_DESCRIPTION_MAX_LENGTH,
					`Description must be at most ${CHAPTER_DESCRIPTION_MAX_LENGTH} characters`
				)
			),
			v.literal(''),
			v.null()
		])
	)
});

export const deleteChapterInputSchema = v.object({
	id: uuidSchema
});

export const getChaptersInputSchema = v.object({});

export const getChapterInputSchema = v.object({
	id: uuidSchema
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
