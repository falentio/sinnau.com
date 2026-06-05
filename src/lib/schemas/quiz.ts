import * as v from 'valibot';
import { CHAPTER_ID_PREFIX } from './chapter.ts';
import { createPrefixedIdSchema } from './id-schema.ts';
import {
	MCQ_OPTION_MAX,
	MCQ_OPTION_MIN,
	MS_OPTION_MAX,
	MS_OPTION_MIN,
	QUIZ_OPTION_BATCH_MAX,
	QUIZ_OPTION_EXPLANATION_MAX_LENGTH,
	QUIZ_OPTION_TEXT_MAX_LENGTH,
	QUIZ_OPTION_TEXT_MIN_LENGTH,
	QUIZ_QUESTION_TEXT_MAX_LENGTH,
	QUIZ_QUESTION_TEXT_MIN_LENGTH,
	QUIZ_TYPES
} from './quiz.constant.ts';
import { STUDY_SET_ID_PREFIX } from './study-set.ts';

export const QUIZ_ID_PREFIX = 'qiz';
export const QUIZ_OPTION_ID_PREFIX = 'qzo';

const quizIdSchema = createPrefixedIdSchema(QUIZ_ID_PREFIX);
const quizOptionIdSchema = createPrefixedIdSchema(QUIZ_OPTION_ID_PREFIX);
const studySetIdSchema = createPrefixedIdSchema(STUDY_SET_ID_PREFIX);
const chapterIdSchema = createPrefixedIdSchema(CHAPTER_ID_PREFIX);

const quizTypeSchema = v.picklist(QUIZ_TYPES);

const questionTextSchema = v.pipe(
	v.string(),
	v.trim(),
	v.minLength(QUIZ_QUESTION_TEXT_MIN_LENGTH, 'Teks pertanyaan tidak boleh kosong'),
	v.maxLength(QUIZ_QUESTION_TEXT_MAX_LENGTH, 'Teks pertanyaan terlalu panjang')
);

const optionTextSchema = v.pipe(
	v.string(),
	v.trim(),
	v.minLength(QUIZ_OPTION_TEXT_MIN_LENGTH, 'Teks opsi tidak boleh kosong'),
	v.maxLength(QUIZ_OPTION_TEXT_MAX_LENGTH, 'Teks opsi terlalu panjang')
);

const optionExplanationSchema = v.optional(
	v.pipe(
		v.string(),
		v.maxLength(QUIZ_OPTION_EXPLANATION_MAX_LENGTH, 'Penjelasan opsi terlalu panjang')
	)
);

const embeddedCreateOptionInputSchema = v.object({
	optionText: optionTextSchema,
	isCorrect: v.boolean(),
	explanation: optionExplanationSchema
});

const createQuizOptionInputSchema = v.object({
	quizId: quizIdSchema,
	optionText: optionTextSchema,
	isCorrect: v.boolean(),
	explanation: optionExplanationSchema
});

export const updateQuizOptionInputSchema = v.object({
	id: quizOptionIdSchema,
	optionText: v.optional(optionTextSchema),
	isCorrect: v.optional(v.boolean()),
	explanation: v.optional(
		v.union([
			v.pipe(v.string(), v.maxLength(QUIZ_OPTION_EXPLANATION_MAX_LENGTH)),
			v.literal(''),
			v.null()
		])
	)
});

export const createQuizInputSchema = v.object({
	studySetId: studySetIdSchema,
	chapterId: v.optional(chapterIdSchema),
	type: quizTypeSchema,
	questionText: questionTextSchema,
	options: v.optional(v.array(embeddedCreateOptionInputSchema))
});

export const updateQuizInputSchema = v.object({
	id: quizIdSchema,
	questionText: questionTextSchema
});

export const deleteQuizzesInputSchema = v.object({
	ids: v.pipe(
		v.array(quizIdSchema),
		v.minLength(1, 'Minimal satu id diperlukan'),
		v.maxLength(100, 'Maksimal 100 id per batch')
	)
});

export const createQuizOptionsInputSchema = v.object({
	options: v.pipe(
		v.array(createQuizOptionInputSchema),
		v.minLength(1, 'Minimal satu opsi diperlukan'),
		v.maxLength(QUIZ_OPTION_BATCH_MAX, `Maksimal ${QUIZ_OPTION_BATCH_MAX} opsi per batch`)
	)
});

export const deleteQuizOptionsInputSchema = v.object({
	ids: v.pipe(
		v.array(quizOptionIdSchema),
		v.minLength(1, 'Minimal satu id diperlukan'),
		v.maxLength(100, 'Maksimal 100 id per batch')
	)
});

export const getQuizInputSchema = v.object({
	id: quizIdSchema
});

export const getQuizzesInputSchema = v.object({
	studySetId: studySetIdSchema
});

const quizTypeOutputSchema = v.picklist(QUIZ_TYPES);

const quizOptionOutputSchema = v.object({
	id: v.string(),
	quizId: v.string(),
	optionText: v.string(),
	isCorrect: v.boolean(),
	explanation: v.nullable(v.string()),
	createdAt: v.date(),
	updatedAt: v.date()
});

export const quizOptionSchema = quizOptionOutputSchema;

export const quizSchema = v.object({
	id: v.string(),
	chapterId: v.nullable(v.string()),
	studySetId: v.string(),
	type: quizTypeOutputSchema,
	questionText: v.string(),
	options: v.array(quizOptionOutputSchema),
	ownerId: v.string(),
	createdAt: v.date(),
	updatedAt: v.date()
});

export const quizDeleteOutputSchema = v.object({ success: v.literal(true) });
export const quizOptionsDeleteOutputSchema = v.object({ success: v.literal(true) });

export const partialForbiddenErrorSchema = v.object({
	code: v.literal('PARTIAL_FORBIDDEN'),
	data: v.object({ ids: v.array(v.string()) })
});

export const quizOptionWithErrorsSchema = v.object({
	index: v.number(),
	reason: v.string()
});

export type CreateQuizInput = v.InferOutput<typeof createQuizInputSchema>;
export type UpdateQuizInput = v.InferOutput<typeof updateQuizInputSchema>;
export type DeleteQuizzesInput = v.InferOutput<typeof deleteQuizzesInputSchema>;
export type CreateQuizOptionsInput = v.InferOutput<typeof createQuizOptionsInputSchema>;
export type UpdateQuizOptionInput = v.InferOutput<typeof updateQuizOptionInputSchema>;
export type DeleteQuizOptionsInput = v.InferOutput<typeof deleteQuizOptionsInputSchema>;
export type GetQuizInput = v.InferOutput<typeof getQuizInputSchema>;
export type GetQuizzesInput = v.InferOutput<typeof getQuizzesInputSchema>;

export const MCQ_OPTION_COUNT_HINT = { min: MCQ_OPTION_MIN, max: MCQ_OPTION_MAX } as const;
export const MS_OPTION_COUNT_HINT = { min: MS_OPTION_MIN, max: MS_OPTION_MAX } as const;
