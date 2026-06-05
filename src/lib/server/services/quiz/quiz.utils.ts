import { QUIZ_ID_PREFIX, QUIZ_OPTION_ID_PREFIX } from '$lib/schemas/quiz';
import type { Quiz, QuizOption } from '../../infras/db/schema/quiz.ts';
import { generateId } from '../../utils/nanoid.ts';
import type { QuizWithOptions } from './quiz.repository.ts';

let stubs: QuizWithOptions[] | null = null;

export function getQuizStubs(
	count: number,
	studySetId: string,
	ownerId: string
): QuizWithOptions[] {
	if (!stubs) {
		const now = new Date();
		stubs = Array.from({ length: count }, (_, i) => {
			const quizId = generateId(QUIZ_ID_PREFIX);
			const options: QuizOption[] = [
				{
					id: generateId(QUIZ_OPTION_ID_PREFIX),
					quizId,
					optionText: 'Opsi A (benar)',
					isCorrect: true,
					explanation: null,
					createdAt: now,
					updatedAt: now
				},
				{
					id: generateId(QUIZ_OPTION_ID_PREFIX),
					quizId,
					optionText: 'Opsi B',
					isCorrect: false,
					explanation: null,
					createdAt: now,
					updatedAt: now
				},
				{
					id: generateId(QUIZ_OPTION_ID_PREFIX),
					quizId,
					optionText: 'Opsi C',
					isCorrect: false,
					explanation: null,
					createdAt: now,
					updatedAt: now
				},
				{
					id: generateId(QUIZ_OPTION_ID_PREFIX),
					quizId,
					optionText: 'Opsi D',
					isCorrect: false,
					explanation: null,
					createdAt: now,
					updatedAt: now
				}
			];
			const quiz: Quiz = {
				id: quizId,
				chapterId: null,
				studySetId,
				type: 'MULTIPLE_CHOICE',
				questionText: `Pertanyaan stub #${i + 1}?`,
				ownerId,
				createdAt: new Date(now.getTime() - (count - i) * 3_600_000),
				updatedAt: new Date(now.getTime() - (count - i) * 1_800_000)
			};
			return { ...quiz, options };
		});
	}
	return stubs;
}
