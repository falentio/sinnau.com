import { beforeEach, describe, it, vi } from "vitest";

import type * as FlashcardUtils from "./flashcard.utils.ts";

describe("getFlashcardStubs", () => {
	let getFlashcardStubs: typeof FlashcardUtils.getFlashcardStubs;

	beforeEach(async () => {
		vi.resetModules();
		({ getFlashcardStubs } = await import("./flashcard.utils.ts"));
	});

	it("returns the requested count of flashcards", ({ expect }) => {
		const flashcards = getFlashcardStubs(5, "studySet-1", "owner-1");

		expect(flashcards).toHaveLength(5);
	});

	it("each flashcard has the given studySetId and ownerId", ({
		expect
	}) => {
		const flashcards = getFlashcardStubs(3, "studySet-stub", "owner-stub");

		for (const flashcard of flashcards) {
			expect(flashcard.studySetId).toBe("studySet-stub");
			expect(flashcard.ownerId).toBe("owner-stub");
			expect(flashcard.chapterId).toBeNull();
		}
	});

	it("each flashcard has a front, back, and an fcd-prefixed id", ({
		expect
	}) => {
		const flashcards = getFlashcardStubs(3, "studySet-1", "owner-1");

		for (const flashcard of flashcards) {
			expect(flashcard.front).toMatch(/^Flashcard depan #\d+$/u);
			expect(flashcard.back).toMatch(/^Flashcard belakang #\d+$/u);
			expect(flashcard.id).toMatch(/^fcd_/u);
		}
	});

	it("each flashcard has null hint and zero importance", ({ expect }) => {
		const flashcards = getFlashcardStubs(3, "studySet-1", "owner-1");

		for (const flashcard of flashcards) {
			expect(flashcard.hint).toBeNull();
			expect(flashcard.importance).toBe(0);
		}
	});

	it("flashcard timestamps are Date instances", ({ expect }) => {
		const flashcards = getFlashcardStubs(2, "studySet-1", "owner-1");

		for (const flashcard of flashcards) {
			expect(flashcard.createdAt).toBeInstanceOf(Date);
			expect(flashcard.updatedAt).toBeInstanceOf(Date);
		}
	});

	it("respects a smaller count when cache was populated by a larger call", ({
		expect
	}) => {
		getFlashcardStubs(50, "studySet-1", "owner-1");

		const flashcards = getFlashcardStubs(3, "studySet-1", "owner-1");

		expect(flashcards).toHaveLength(3);
	});
});
