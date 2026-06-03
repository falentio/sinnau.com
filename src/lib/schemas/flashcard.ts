import * as v from 'valibot';
import {
	FLASHCARD_BATCH_MAX,
	FLASHCARD_HINT_MAX_LENGTH,
	FLASHCARD_TEXT_MAX_LENGTH
} from '../server/services/flashcard/flashcard.constant.ts';

const uuidSchema = v.pipe(v.string(), v.uuid());

const trimmedTextSchema = v.pipe(
	v.string(),
	v.trim(),
	v.minLength(1, 'Must not be empty after trim'),
	v.maxLength(FLASHCARD_TEXT_MAX_LENGTH, `Must be at most ${FLASHCARD_TEXT_MAX_LENGTH} characters`)
);

const hintSchema = v.optional(
	v.union([
		v.pipe(
			v.string(),
			v.trim(),
			v.maxLength(
				FLASHCARD_HINT_MAX_LENGTH,
				`Hint must be at most ${FLASHCARD_HINT_MAX_LENGTH} characters`
			)
		),
		v.literal(''),
		v.null()
	])
);

const importanceSchema = v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)));

const flashcardInputItemSchema = v.object({
	chapterId: v.optional(uuidSchema),
	front: trimmedTextSchema,
	back: trimmedTextSchema,
	hint: hintSchema,
	importance: importanceSchema
});

export const createFlashcardsInputSchema = v.object({
	studySetId: uuidSchema,
	flashcards: v.pipe(
		v.array(flashcardInputItemSchema),
		v.minLength(1, 'At least one flashcard is required'),
		v.maxLength(FLASHCARD_BATCH_MAX, `At most ${FLASHCARD_BATCH_MAX} flashcards per batch`)
	)
});

export const updateFlashcardInputSchema = v.object({
	id: uuidSchema,
	front: trimmedTextSchema,
	back: trimmedTextSchema,
	hint: hintSchema,
	importance: importanceSchema
});

export const deleteFlashcardsInputSchema = v.object({
	ids: v.pipe(
		v.array(uuidSchema),
		v.minLength(1, 'At least one id is required'),
		v.maxLength(FLASHCARD_BATCH_MAX, `At most ${FLASHCARD_BATCH_MAX} ids per batch`)
	)
});

export const getFlashcardsInputSchema = v.object({
	studySetId: uuidSchema
});

export const getFlashcardInputSchema = v.object({
	id: uuidSchema
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
