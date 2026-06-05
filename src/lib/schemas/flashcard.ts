import * as v from 'valibot';
import { CHAPTER_ID_PREFIX } from './chapter.ts';
import {
	FLASHCARD_BATCH_MAX,
	FLASHCARD_HINT_MAX_LENGTH,
	FLASHCARD_TEXT_MAX_LENGTH
} from './flashcard.constant.ts';
import { createPrefixedIdSchema } from './id-schema.ts';
import { STUDY_SET_ID_PREFIX } from './study-set.ts';

export {
	FLASHCARD_BATCH_MAX,
	FLASHCARD_HINT_MAX_LENGTH,
	FLASHCARD_TEXT_MAX_LENGTH
} from './flashcard.constant.ts';

export const FLASHCARD_ID_PREFIX = 'fcd';

const flashcardIdSchema = createPrefixedIdSchema(FLASHCARD_ID_PREFIX);
const chapterIdSchema = createPrefixedIdSchema(CHAPTER_ID_PREFIX);
const studySetIdSchema = createPrefixedIdSchema(STUDY_SET_ID_PREFIX);

export const trimmedTextSchema = v.pipe(
	v.string(),
	v.trim(),
	v.minLength(1, 'Tidak boleh kosong setelah dipangkas'),
	v.maxLength(FLASHCARD_TEXT_MAX_LENGTH, `Maksimal ${FLASHCARD_TEXT_MAX_LENGTH} karakter`)
);

export const hintSchema = v.optional(
	v.union([
		v.pipe(
			v.string(),
			v.trim(),
			v.maxLength(
				FLASHCARD_HINT_MAX_LENGTH,
				`Petunjuk maksimal ${FLASHCARD_HINT_MAX_LENGTH} karakter`
			)
		),
		v.literal(''),
		v.null()
	])
);

export const importanceSchema = v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)));

const flashcardInputItemSchema = v.object({
	chapterId: v.optional(chapterIdSchema),
	front: trimmedTextSchema,
	back: trimmedTextSchema,
	hint: hintSchema,
	importance: importanceSchema
});

export const createFlashcardsInputSchema = v.object({
	studySetId: studySetIdSchema,
	flashcards: v.pipe(
		v.array(flashcardInputItemSchema),
		v.minLength(1, 'Minimal satu flashcard diperlukan'),
		v.maxLength(FLASHCARD_BATCH_MAX, `Maksimal ${FLASHCARD_BATCH_MAX} flashcard per batch`)
	)
});

export const updateFlashcardInputSchema = v.object({
	id: flashcardIdSchema,
	front: trimmedTextSchema,
	back: trimmedTextSchema,
	hint: hintSchema,
	importance: importanceSchema
});

export const deleteFlashcardsInputSchema = v.object({
	ids: v.pipe(
		v.array(flashcardIdSchema),
		v.minLength(1, 'Minimal satu id diperlukan'),
		v.maxLength(FLASHCARD_BATCH_MAX, `Maksimal ${FLASHCARD_BATCH_MAX} id per batch`)
	)
});

export const getFlashcardsInputSchema = v.object({
	studySetId: studySetIdSchema
});

export const getFlashcardInputSchema = v.object({
	id: flashcardIdSchema
});

export const flashcardSchema = v.object({
	id: v.string(),
	chapterId: v.nullable(v.string()),
	studySetId: v.string(),
	front: v.string(),
	back: v.string(),
	hint: v.nullable(v.string()),
	importance: v.number(),
	ownerId: v.string(),
	createdAt: v.date(),
	updatedAt: v.date()
});

export const flashcardListOutputSchema = v.array(flashcardSchema);

export const flashcardCreateOutputSchema = v.object({
	success: v.literal(true),
	data: flashcardListOutputSchema
});

export const flashcardDeleteOutputSchema = v.object({ success: v.literal(true) });

export const flashcardPartialForbiddenDataSchema = v.object({
	ids: v.array(v.string())
});

export type CreateFlashcardsInput = v.InferOutput<typeof createFlashcardsInputSchema>;
export type UpdateFlashcardInput = v.InferOutput<typeof updateFlashcardInputSchema>;
export type DeleteFlashcardsInput = v.InferOutput<typeof deleteFlashcardsInputSchema>;
export type GetFlashcardsInput = v.InferOutput<typeof getFlashcardsInputSchema>;
export type GetFlashcardInput = v.InferOutput<typeof getFlashcardInputSchema>;
export type FlashcardPartialForbiddenData = v.InferOutput<
	typeof flashcardPartialForbiddenDataSchema
>;
