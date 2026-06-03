import { describe, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { chapter as chapterTable } from '$lib/server/infras/db/schema/chapter';
import { quiz, quizOption } from '$lib/server/infras/db/schema/quiz';
import { QuizTestEnv } from './quiz.testing';

describe.concurrent('QuizDrizzleRepository', () => {
	describe('insertQuiz', () => {
		it('persists the row, inserts embedded options, and returns timestamps', async ({ expect }) => {
			await using env = new QuizTestEnv();
			const studySet = await env.seedStudySet({ ownerId: env.ownerId });
			const before = Date.now();
			const created = await env.repo.insertQuiz(
				{
					id: 'quiz-1',
					chapterId: null,
					studySetId: studySet.id,
					type: 'MULTIPLE_CHOICE',
					questionText: 'What is 2 + 2?',
					ownerId: env.ownerId
				},
				[
					{
						id: 'opt-1',
						quizId: 'quiz-1',
						optionText: '4',
						isCorrect: true,
						explanation: null
					}
				]
			);
			const after = Date.now();

			expect(created.id).toBe('quiz-1');
			expect(created.questionText).toBe('What is 2 + 2?');
			expect(created.ownerId).toBe(env.ownerId);
			expect(created.createdAt.getTime()).toBeGreaterThanOrEqual(before);
			expect(created.createdAt.getTime()).toBeLessThanOrEqual(after);

			const rows = env.db.select().from(quiz).where(eq(quiz.id, 'quiz-1')).all();
			expect(rows).toHaveLength(1);

			const optionRows = env.db
				.select()
				.from(quizOption)
				.where(eq(quizOption.quizId, 'quiz-1'))
				.all();
			expect(optionRows).toHaveLength(1);
			expect(optionRows[0]?.optionText).toBe('4');
			expect(optionRows[0]?.isCorrect).toBe(true);
		});

		it('inserts a quiz with no options when the options array is empty', async ({ expect }) => {
			await using env = new QuizTestEnv();
			const studySet = await env.seedStudySet({ ownerId: env.ownerId });
			await env.repo.insertQuiz(
				{
					id: 'quiz-empty',
					chapterId: null,
					studySetId: studySet.id,
					type: 'MULTIPLE_CHOICE',
					questionText: 'Empty?',
					ownerId: env.ownerId
				},
				[]
			);
			expect(
				env.db.select().from(quizOption).where(eq(quizOption.quizId, 'quiz-empty')).all()
			).toHaveLength(0);
		});
	});

	describe('updateQuiz', () => {
		it('updates the row when id and ownerId match', async ({ expect }) => {
			await using env = new QuizTestEnv();
			const studySet = await env.seedStudySet({ ownerId: env.ownerId });
			const created = await env.repo.insertQuiz(
				{
					id: 'quiz-1',
					chapterId: null,
					studySetId: studySet.id,
					type: 'MULTIPLE_CHOICE',
					questionText: 'Original',
					ownerId: env.ownerId
				},
				[]
			);
			const updated = await env.repo.updateQuiz('quiz-1', env.ownerId, {
				questionText: 'Updated'
			});
			expect(updated).not.toBeNull();
			expect(updated!.questionText).toBe('Updated');
			expect(updated!.createdAt.getTime()).toBe(created.createdAt.getTime());
		});

		it('returns null when the id does not exist', async ({ expect }) => {
			await using env = new QuizTestEnv();
			expect(await env.repo.updateQuiz('missing', env.ownerId, { questionText: 'X' })).toBeNull();
		});

		it('returns null when ownerId does not match', async ({ expect }) => {
			await using env = new QuizTestEnv();
			await env.seedQuiz({ id: 'quiz-1', ownerId: env.ownerId });
			expect(
				await env.repo.updateQuiz('quiz-1', env.otherId, { questionText: 'Hacked' })
			).toBeNull();
			const [row] = env.db.select().from(quiz).where(eq(quiz.id, 'quiz-1')).all();
			expect(row?.questionText).toBe('Seeded question?');
		});
	});

	describe('deleteQuizzes', () => {
		it('deletes the rows and cascades to their options', async ({ expect }) => {
			await using env = new QuizTestEnv();
			const studySet = await env.seedStudySet({ ownerId: env.ownerId });
			await env.repo.insertQuiz(
				{
					id: 'quiz-1',
					chapterId: null,
					studySetId: studySet.id,
					type: 'MULTIPLE_CHOICE',
					questionText: 'Q1',
					ownerId: env.ownerId
				},
				[
					{
						id: 'opt-1',
						quizId: 'quiz-1',
						optionText: 'A',
						isCorrect: true,
						explanation: null
					}
				]
			);
			const ok = await env.repo.deleteQuizzes(['quiz-1'], env.ownerId);
			expect(ok).toBe(true);
			expect(env.db.select().from(quiz).where(eq(quiz.id, 'quiz-1')).all()).toHaveLength(0);
			expect(
				env.db.select().from(quizOption).where(eq(quizOption.quizId, 'quiz-1')).all()
			).toHaveLength(0);
		});

		it('returns false when not all ids match the owner', async ({ expect }) => {
			await using env = new QuizTestEnv();
			await env.seedQuiz({ id: 'quiz-1', ownerId: env.ownerId });
			await env.seedQuiz({ id: 'quiz-2', ownerId: env.otherId });
			const ok = await env.repo.deleteQuizzes(['quiz-1', 'quiz-2'], env.ownerId);
			expect(ok).toBe(false);
			expect(env.db.select().from(quiz).where(eq(quiz.id, 'quiz-1')).all()).toHaveLength(1);
			expect(env.db.select().from(quiz).where(eq(quiz.id, 'quiz-2')).all()).toHaveLength(1);
		});

		it('returns false for an empty id list', async ({ expect }) => {
			await using env = new QuizTestEnv();
			expect(await env.repo.deleteQuizzes([], env.ownerId)).toBe(false);
		});
	});

	describe('findQuizById', () => {
		it('returns the row when it exists', async ({ expect }) => {
			await using env = new QuizTestEnv();
			const seeded = await env.seedQuiz({ id: 'quiz-1', ownerId: env.ownerId });
			const result = await env.repo.findQuizById('quiz-1');
			expect(result?.id).toBe(seeded.id);
			expect(result?.questionText).toBe(seeded.questionText);
		});

		it('returns null when the id does not exist', async ({ expect }) => {
			await using env = new QuizTestEnv();
			expect(await env.repo.findQuizById('missing')).toBeNull();
		});
	});

	describe('findQuizzesByStudySetId', () => {
		it('returns only quizzes for the given study set, ordered by createdAt desc', async ({
			expect
		}) => {
			await using env = new QuizTestEnv();
			const a = await env.seedStudySet({ ownerId: env.ownerId });
			const b = await env.seedStudySet({ ownerId: env.otherId });
			await env.seedQuiz({ id: 'q-1', ownerId: env.ownerId, studySetId: a.id });
			await new Promise((r) => setTimeout(r, 5));
			await env.seedQuiz({ id: 'q-2', ownerId: env.ownerId, studySetId: a.id });
			await env.seedQuiz({ id: 'q-3', ownerId: env.ownerId, studySetId: b.id });

			const result = await env.repo.findQuizzesByStudySetId(a.id);
			expect(result.map((q) => q.id)).toEqual(['q-2', 'q-1']);
			for (const q of result) {
				expect(q.options).toEqual([]);
			}
		});

		it('embeds options via the left join', async ({ expect }) => {
			await using env = new QuizTestEnv();
			const a = await env.seedStudySet({ ownerId: env.ownerId });
			const q = await env.seedQuiz({ id: 'q-1', ownerId: env.ownerId, studySetId: a.id });
			await env.repo.insertQuizOptions([
				{
					id: 'opt-1',
					quizId: q.id,
					optionText: 'A',
					isCorrect: true,
					explanation: null
				}
			]);

			const result = await env.repo.findQuizzesByStudySetId(a.id);
			expect(result).toHaveLength(1);
			expect(result[0]?.options).toHaveLength(1);
			expect(result[0]?.options[0]?.id).toBe('opt-1');
		});
	});

	describe('findQuizzesByIds', () => {
		it('returns the quizzes matching any of the given ids, ordered by createdAt desc', async ({
			expect
		}) => {
			await using env = new QuizTestEnv();
			await env.seedQuiz({ id: 'q-1', ownerId: env.ownerId });
			await new Promise((r) => setTimeout(r, 5));
			await env.seedQuiz({ id: 'q-2', ownerId: env.ownerId });
			await env.seedQuiz({ id: 'q-3', ownerId: env.otherId });

			const result = await env.repo.findQuizzesByIds(['q-1', 'q-2', 'q-3']);
			expect(result.map((q) => q.id)).toEqual(['q-3', 'q-2', 'q-1']);
		});

		it('returns an empty array when the input is empty', async ({ expect }) => {
			await using env = new QuizTestEnv();
			expect(await env.repo.findQuizzesByIds([])).toEqual([]);
		});

		it('returns only matching rows for unknown ids', async ({ expect }) => {
			await using env = new QuizTestEnv();
			await env.seedQuiz({ id: 'q-1', ownerId: env.ownerId });
			const result = await env.repo.findQuizzesByIds(['q-1', 'missing']);
			expect(result.map((q) => q.id)).toEqual(['q-1']);
		});
	});

	describe('findChapterById', () => {
		it('returns the chapter when it exists', async ({ expect }) => {
			await using env = new QuizTestEnv();
			const chapter = await env.seedChapter({ id: 'ch-1', ownerId: env.ownerId });
			const result = await env.repo.findChapterById('ch-1');
			expect(result?.id).toBe(chapter.id);
		});

		it('returns null when the id does not exist', async ({ expect }) => {
			await using env = new QuizTestEnv();
			expect(await env.repo.findChapterById('missing')).toBeNull();
		});
	});

	describe('findOptionsByQuizIds', () => {
		it('returns options for any of the given quiz ids', async ({ expect }) => {
			await using env = new QuizTestEnv();
			const q1 = await env.seedQuiz({ id: 'q-1', ownerId: env.ownerId });
			const q2 = await env.seedQuiz({ id: 'q-2', ownerId: env.ownerId });
			await env.repo.insertQuizOptions([
				{
					id: 'opt-1',
					quizId: q1.id,
					optionText: 'A',
					isCorrect: true,
					explanation: null
				}
			]);
			await env.repo.insertQuizOptions([
				{
					id: 'opt-2',
					quizId: q2.id,
					optionText: 'B',
					isCorrect: true,
					explanation: null
				}
			]);

			const result = await env.repo.findOptionsByQuizIds([q1.id, q2.id]);
			expect(result.map((o) => o.id).sort()).toEqual(['opt-1', 'opt-2']);
		});

		it('returns an empty array when the input is empty', async ({ expect }) => {
			await using env = new QuizTestEnv();
			expect(await env.repo.findOptionsByQuizIds([])).toEqual([]);
		});
	});

	describe('findOptionsByIdsForOwner', () => {
		it('returns only the options whose parent quiz is owned by the given user', async ({
			expect
		}) => {
			await using env = new QuizTestEnv();
			const q1 = await env.seedQuiz({ id: 'q-1', ownerId: env.ownerId });
			const q2 = await env.seedQuiz({ id: 'q-2', ownerId: env.otherId });
			const [opt1] = await env.repo.insertQuizOptions([
				{
					id: 'opt-1',
					quizId: q1.id,
					optionText: 'A',
					isCorrect: true,
					explanation: null
				}
			]);
			const [opt2] = await env.repo.insertQuizOptions([
				{
					id: 'opt-2',
					quizId: q2.id,
					optionText: 'B',
					isCorrect: true,
					explanation: null
				}
			]);

			const result = await env.repo.findOptionsByIdsForOwner([opt1.id, opt2.id], env.ownerId);
			expect(result.map((o) => o.id)).toEqual([opt1.id]);
		});
	});

	describe('findOptionByIdForOwner', () => {
		it('returns the option when owned by the user', async ({ expect }) => {
			await using env = new QuizTestEnv();
			const q = await env.seedQuiz({ id: 'q-1', ownerId: env.ownerId });
			const [opt] = await env.repo.insertQuizOptions([
				{
					id: 'opt-1',
					quizId: q.id,
					optionText: 'A',
					isCorrect: true,
					explanation: null
				}
			]);
			const result = await env.repo.findOptionByIdForOwner(opt.id, env.ownerId);
			expect(result?.id).toBe(opt.id);
		});

		it('returns null when the parent quiz is not owned by the user', async ({ expect }) => {
			await using env = new QuizTestEnv();
			const q = await env.seedQuiz({ id: 'q-1', ownerId: env.otherId });
			const [opt] = await env.repo.insertQuizOptions([
				{
					id: 'opt-1',
					quizId: q.id,
					optionText: 'A',
					isCorrect: true,
					explanation: null
				}
			]);
			expect(await env.repo.findOptionByIdForOwner(opt.id, env.ownerId)).toBeNull();
		});
	});

	describe('insertQuizOptions', () => {
		it('returns the inserted rows', async ({ expect }) => {
			await using env = new QuizTestEnv();
			const q = await env.seedQuiz({ id: 'q-1', ownerId: env.ownerId });
			const result = await env.repo.insertQuizOptions([
				{
					id: 'opt-1',
					quizId: q.id,
					optionText: 'A',
					isCorrect: true,
					explanation: null
				}
			]);
			expect(result).toHaveLength(1);
			expect(result[0]?.id).toBe('opt-1');
		});

		it('returns an empty array when the input is empty', async ({ expect }) => {
			await using env = new QuizTestEnv();
			expect(await env.repo.insertQuizOptions([])).toEqual([]);
		});
	});

	describe('updateQuizOption', () => {
		it('updates the option when ownership matches', async ({ expect }) => {
			await using env = new QuizTestEnv();
			const q = await env.seedQuiz({ id: 'q-1', ownerId: env.ownerId });
			const [opt] = await env.repo.insertQuizOptions([
				{
					id: 'opt-1',
					quizId: q.id,
					optionText: 'A',
					isCorrect: false,
					explanation: null
				}
			]);
			const updated = await env.repo.updateQuizOption(opt.id, env.ownerId, {
				optionText: 'Updated',
				isCorrect: true
			});
			expect(updated?.optionText).toBe('Updated');
			expect(updated?.isCorrect).toBe(true);
		});

		it('returns null when the option is not owned by the user', async ({ expect }) => {
			await using env = new QuizTestEnv();
			const q = await env.seedQuiz({ id: 'q-1', ownerId: env.otherId });
			const [opt] = await env.repo.insertQuizOptions([
				{
					id: 'opt-1',
					quizId: q.id,
					optionText: 'A',
					isCorrect: true,
					explanation: null
				}
			]);
			expect(
				await env.repo.updateQuizOption(opt.id, env.ownerId, { optionText: 'Hacked' })
			).toBeNull();
		});
	});

	describe('deleteQuizOptions', () => {
		it('deletes only options owned by the given user and returns true', async ({ expect }) => {
			await using env = new QuizTestEnv();
			const q1 = await env.seedQuiz({ id: 'q-1', ownerId: env.ownerId });
			const q2 = await env.seedQuiz({ id: 'q-2', ownerId: env.otherId });
			const [opt1] = await env.repo.insertQuizOptions([
				{
					id: 'opt-1',
					quizId: q1.id,
					optionText: 'A',
					isCorrect: true,
					explanation: null
				}
			]);
			await env.repo.insertQuizOptions([
				{
					id: 'opt-2',
					quizId: q2.id,
					optionText: 'B',
					isCorrect: true,
					explanation: null
				}
			]);

			const ok = await env.repo.deleteQuizOptions([opt1.id], env.ownerId);
			expect(ok).toBe(true);
			expect(env.db.select().from(quizOption).where(eq(quizOption.id, 'opt-1')).all()).toHaveLength(
				0
			);
			expect(env.db.select().from(quizOption).where(eq(quizOption.id, 'opt-2')).all()).toHaveLength(
				1
			);
		});

		it('returns false when at least one id is not owned', async ({ expect }) => {
			await using env = new QuizTestEnv();
			const q1 = await env.seedQuiz({ id: 'q-1', ownerId: env.ownerId });
			const q2 = await env.seedQuiz({ id: 'q-2', ownerId: env.otherId });
			const [opt1] = await env.repo.insertQuizOptions([
				{
					id: 'opt-1',
					quizId: q1.id,
					optionText: 'A',
					isCorrect: true,
					explanation: null
				}
			]);
			const [opt2] = await env.repo.insertQuizOptions([
				{
					id: 'opt-2',
					quizId: q2.id,
					optionText: 'B',
					isCorrect: true,
					explanation: null
				}
			]);

			const ok = await env.repo.deleteQuizOptions([opt1.id, opt2.id], env.ownerId);
			expect(ok).toBe(false);
		});
	});
});

describe.concurrent('QuizDrizzleRepository (schema constraints)', () => {
	describe('foreign keys', () => {
		it('rejects inserting a quiz for a non-existent study set', async ({ expect }) => {
			await using env = new QuizTestEnv();
			const insertOrphan = () =>
				env.repo.insertQuiz(
					{
						id: 'orphan-quiz',
						chapterId: null,
						studySetId: 'does-not-exist',
						type: 'MULTIPLE_CHOICE',
						questionText: 'Orphan?',
						ownerId: env.ownerId
					},
					[]
				);
			await expect(insertOrphan()).rejects.toThrow();
		});

		it('rejects inserting a quiz for a non-existent owner', async ({ expect }) => {
			await using env = new QuizTestEnv();
			const studySet = await env.seedStudySet({ ownerId: env.ownerId });
			const insertOrphan = () =>
				env.repo.insertQuiz(
					{
						id: 'orphan-owner',
						chapterId: null,
						studySetId: studySet.id,
						type: 'MULTIPLE_CHOICE',
						questionText: 'Orphan?',
						ownerId: 'does-not-exist'
					},
					[]
				);
			await expect(insertOrphan()).rejects.toThrow();
		});

		it('rejects inserting an option for a non-existent quiz', async ({ expect }) => {
			await using env = new QuizTestEnv();
			const insertOrphan = () =>
				env.repo.insertQuizOptions([
					{
						id: 'orphan-option',
						quizId: 'does-not-exist',
						optionText: 'A',
						isCorrect: true,
						explanation: null
					}
				]);
			await expect(insertOrphan()).rejects.toThrow();
		});
	});

	describe('cascade behavior', () => {
		it('sets chapterId to null when the parent chapter is deleted', async ({ expect }) => {
			await using env = new QuizTestEnv();
			const studySet = await env.seedStudySet({ ownerId: env.ownerId });
			const chapter = await env.seedChapter({
				ownerId: env.ownerId,
				studySetId: studySet.id
			});
			const quizRow = await env.repo.insertQuiz(
				{
					id: 'quiz-1',
					chapterId: chapter.id,
					studySetId: studySet.id,
					type: 'MULTIPLE_CHOICE',
					questionText: 'Q',
					ownerId: env.ownerId
				},
				[]
			);
			expect(quizRow.chapterId).toBe(chapter.id);

			env.db.delete(chapterTable).run();

			const [row] = env.db.select().from(quiz).where(eq(quiz.id, 'quiz-1')).all();
			expect(row?.chapterId).toBeNull();
		});
	});
});
