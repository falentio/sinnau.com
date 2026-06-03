import * as v from 'valibot';
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
} from '../server/services/quiz/quiz.constant.ts';

const uuidSchema = v.pipe(v.string(), v.uuid());

const quizTypeSchema = v.picklist(QUIZ_TYPES);

const questionTextSchema = v.pipe(
	v.string(),
	v.trim(),
	v.minLength(QUIZ_QUESTION_TEXT_MIN_LENGTH, 'Question text must not be empty'),
	v.maxLength(QUIZ_QUESTION_TEXT_MAX_LENGTH, 'Question text is too long')
);

const optionTextSchema = v.pipe(
	v.string(),
	v.trim(),
	v.minLength(QUIZ_OPTION_TEXT_MIN_LENGTH, 'Option text must not be empty'),
	v.maxLength(QUIZ_OPTION_TEXT_MAX_LENGTH, 'Option text is too long')
);

const optionExplanationSchema = v.optional(
	v.pipe(
		v.string(),
		v.maxLength(QUIZ_OPTION_EXPLANATION_MAX_LENGTH, 'Option explanation is too long')
	)
);

const embeddedCreateOptionInputSchema = v.object({
	optionText: optionTextSchema,
	isCorrect: v.boolean(),
	explanation: optionExplanationSchema
});

const createQuizOptionInputSchema = v.object({
	quizId: uuidSchema,
	optionText: optionTextSchema,
	isCorrect: v.boolean(),
	explanation: optionExplanationSchema
});

export const updateQuizOptionInputSchema = v.object({
	id: uuidSchema,
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
	studySetId: uuidSchema,
	chapterId: v.optional(uuidSchema),
	type: quizTypeSchema,
	questionText: questionTextSchema,
	options: v.optional(v.array(embeddedCreateOptionInputSchema))
});

export const updateQuizInputSchema = v.object({
	id: uuidSchema,
	questionText: questionTextSchema
});

export const deleteQuizzesInputSchema = v.object({
	ids: v.pipe(
		v.array(uuidSchema),
		v.minLength(1, 'At least one id is required'),
		v.maxLength(100, 'At most 100 ids per batch')
	)
});

export const createQuizOptionsInputSchema = v.object({
	options: v.pipe(
		v.array(createQuizOptionInputSchema),
		v.minLength(1, 'At least one option is required'),
		v.maxLength(QUIZ_OPTION_BATCH_MAX, `At most ${QUIZ_OPTION_BATCH_MAX} options per batch`)
	)
});

export const deleteQuizOptionsInputSchema = v.object({
	ids: v.pipe(
		v.array(uuidSchema),
		v.minLength(1, 'At least one id is required'),
		v.maxLength(100, 'At most 100 ids per batch')
	)
});

export const getQuizInputSchema = v.object({
	id: uuidSchema
});

export const getQuizzesInputSchema = v.object({
	studySetId: uuidSchema
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
