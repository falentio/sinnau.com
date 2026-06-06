import { beforeEach, describe, it, vi } from "vitest";

import type * as QuizUtils from "./quiz.utils.ts";

describe("getQuizStubs", () => {
	let getQuizStubs: typeof QuizUtils.getQuizStubs;

	beforeEach(async () => {
		vi.resetModules();
		({ getQuizStubs } = await import("./quiz.utils.ts"));
	});

	it("returns the requested count of quizzes", ({ expect }) => {
		const quizzes = getQuizStubs(5, "studySet-1", "owner-1");

		expect(quizzes).toHaveLength(5);
	});

	it("each quiz has 4 options", ({ expect }) => {
		const quizzes = getQuizStubs(3, "studySet-1", "owner-1");

		for (const quiz of quizzes) {
			expect(quiz.options).toHaveLength(4);
		}
	});

	it("each quiz has the given studySetId and ownerId", ({ expect }) => {
		const quizzes = getQuizStubs(3, "studySet-stub", "owner-stub");

		for (const quiz of quizzes) {
			expect(quiz.studySetId).toBe("studySet-stub");
			expect(quiz.ownerId).toBe("owner-stub");
			expect(quiz.chapterId).toBeNull();
			expect(quiz.type).toBe("MULTIPLE_CHOICE");
		}
	});

	it("each quiz has a questionText and id with the qiz prefix", ({
		expect
	}) => {
		const quizzes = getQuizStubs(3, "studySet-1", "owner-1");

		for (const quiz of quizzes) {
			expect(quiz.questionText).toMatch(/^Pertanyaan stub #\d+\?$/u);
			expect(quiz.id).toMatch(/^qiz_/u);
		}
	});

	it("each quiz has exactly one correct option and three incorrect", ({
		expect
	}) => {
		const quizzes = getQuizStubs(3, "studySet-1", "owner-1");

		for (const quiz of quizzes) {
			const correct = quiz.options.filter((o) => o.isCorrect);
			const incorrect = quiz.options.filter((o) => !o.isCorrect);
			expect(correct).toHaveLength(1);
			expect(incorrect).toHaveLength(3);
		}
	});

	it("options have unique ids with the qzo prefix", ({ expect }) => {
		const quizzes = getQuizStubs(2, "studySet-1", "owner-1");

		const ids = quizzes.flatMap((q) => q.options.map((o) => o.id));
		const unique = new Set(ids);
		expect(unique.size).toBe(ids.length);
		for (const id of ids) {
			expect(id).toMatch(/^qzo_/u);
		}
	});

	it("quiz timestamps are Date instances", ({ expect }) => {
		const quizzes = getQuizStubs(2, "studySet-1", "owner-1");

		for (const quiz of quizzes) {
			expect(quiz.createdAt).toBeInstanceOf(Date);
			expect(quiz.updatedAt).toBeInstanceOf(Date);
		}
	});

	it("respects a smaller count when cache was populated by a larger call", ({
		expect
	}) => {
		getQuizStubs(50, "studySet-1", "owner-1");

		const quizzes = getQuizStubs(3, "studySet-1", "owner-1");

		expect(quizzes).toHaveLength(3);
	});
});
