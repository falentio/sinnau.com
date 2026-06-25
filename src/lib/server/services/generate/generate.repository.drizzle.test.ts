import { chapter } from "$lib/server/infras/db/schema/chapter";
import { flashcard } from "$lib/server/infras/db/schema/flashcard";
import { quiz, quizOption } from "$lib/server/infras/db/schema/quiz";
import type { SuccessRecord } from "$lib/server/infras/generate/generate";
import { eq } from "drizzle-orm";
import { describe, it } from "vitest";

import { GenerateTestEnv } from "./generate.testing";

const makeSuccessRecord = (
  index: number,
  content: SuccessRecord["content"]
): SuccessRecord => ({
  chaptersSlugs: content.chapter.map((c) => c.slug),
  content,
  index,
  kind: "success",
  stepCount: 1,
  tokenUsage: {
    cacheRead: 0,
    cacheWrite: 0,
    input: 100,
    output: 50,
    reasoning: 0,
  },
});

describe.concurrent("GenerateDrizzleRepository", () => {
  describe("finalizeGenerateTransaction", () => {
    it("inserts chapters, quizzes, options and flashcards from successful chunks", async ({
      expect,
    }) => {
      await using env = new GenerateTestEnv();

      const successfulChunks: SuccessRecord[] = [
        makeSuccessRecord(0, {
          chapter: [{ slug: "intro", title: "Introduction" }],
          flashcard: [
            {
              back: "Answer 1",
              chapterSlug: "intro",
              front: "Question 1",
              hint: "Think about it",
              importance: 5,
            },
          ],
          quiz: [
            {
              chapterSlug: "intro",
              options: [
                {
                  explanation: "Correct",
                  isCorrect: true,
                  optionText: "Option A",
                },
                {
                  explanation: "Wrong",
                  isCorrect: false,
                  optionText: "Option B",
                },
              ],
              questionText: "What is this?",
              type: "MULTIPLE_CHOICE",
            },
          ],
        }),
      ];

      await env.repo.finalizeGenerateTransaction({
        generateId: "gen-1",
        ownerId: env.ownerId,
        studySetId: env.studySetId,
        successfulChunks,
      });

      const chapters = env.db
        .select()
        .from(chapter)
        .where(eq(chapter.studySetId, env.studySetId))
        .all();
      expect(chapters).toHaveLength(1);
      expect(chapters[0]?.title).toBe("Introduction");

      const quizzes = env.db
        .select()
        .from(quiz)
        .where(eq(quiz.studySetId, env.studySetId))
        .all();
      expect(quizzes).toHaveLength(1);
      expect(quizzes[0]?.questionText).toBe("What is this?");

      const options = env.db
        .select()
        .from(quizOption)
        .where(eq(quizOption.quizId, quizzes[0]?.id ?? ""))
        .all();
      expect(options).toHaveLength(2);

      const flashcards = env.db
        .select()
        .from(flashcard)
        .where(eq(flashcard.studySetId, env.studySetId))
        .all();
      expect(flashcards).toHaveLength(1);
      expect(flashcards[0]?.front).toBe("Question 1");
    });

    it("deduplicates chapters by slug across chunks", async ({ expect }) => {
      await using env = new GenerateTestEnv();

      const successfulChunks: SuccessRecord[] = [
        makeSuccessRecord(0, {
          chapter: [{ slug: "intro", title: "Introduction" }],
          flashcard: [],
          quiz: [],
        }),
        makeSuccessRecord(1, {
          chapter: [{ slug: "intro", title: "Introduction Duplicate" }],
          flashcard: [],
          quiz: [],
        }),
      ];

      await env.repo.finalizeGenerateTransaction({
        generateId: "gen-1",
        ownerId: env.ownerId,
        studySetId: env.studySetId,
        successfulChunks,
      });

      const chapters = env.db
        .select()
        .from(chapter)
        .where(eq(chapter.studySetId, env.studySetId))
        .all();
      expect(chapters).toHaveLength(1);
      expect(chapters[0]?.title).toBe("Introduction");
    });

    it("links quizzes and flashcards to their chapters by chapterId", async ({
      expect,
    }) => {
      await using env = new GenerateTestEnv();

      const successfulChunks: SuccessRecord[] = [
        makeSuccessRecord(0, {
          chapter: [{ slug: "ch1", title: "Chapter 1" }],
          flashcard: [
            {
              back: "Answer",
              chapterSlug: "ch1",
              front: "Question",
              hint: "",
              importance: 3,
            },
          ],
          quiz: [
            {
              chapterSlug: "ch1",
              options: [
                {
                  explanation: "",
                  isCorrect: true,
                  optionText: "A",
                },
              ],
              questionText: "Quiz Q",
              type: "MULTIPLE_CHOICE",
            },
          ],
        }),
      ];

      await env.repo.finalizeGenerateTransaction({
        generateId: "gen-1",
        ownerId: env.ownerId,
        studySetId: env.studySetId,
        successfulChunks,
      });

      const chapters = env.db
        .select()
        .from(chapter)
        .where(eq(chapter.studySetId, env.studySetId))
        .all();
      expect(chapters).toHaveLength(1);
      const chapterId = chapters[0]?.id;

      const flashcards = env.db
        .select()
        .from(flashcard)
        .where(eq(flashcard.studySetId, env.studySetId))
        .all();
      expect(flashcards).toHaveLength(1);
      expect(flashcards[0]?.chapterId).toBe(chapterId);

      const quizzes = env.db
        .select()
        .from(quiz)
        .where(eq(quiz.studySetId, env.studySetId))
        .all();
      expect(quizzes).toHaveLength(1);
      expect(quizzes[0]?.chapterId).toBe(chapterId);
    });

    it("skips chapters whose slug already exists in DB", async ({ expect }) => {
      await using env = new GenerateTestEnv();

      const existingChapterId = "ch-existing";
      env.db
        .insert(chapter)
        .values({
          id: existingChapterId,
          ownerId: env.ownerId,
          slug: "intro",
          studySetId: env.studySetId,
          title: "Pre-existing",
        })
        .run();

      const successfulChunks: SuccessRecord[] = [
        makeSuccessRecord(0, {
          chapter: [{ slug: "intro", title: "Introduction" }],
          flashcard: [],
          quiz: [],
        }),
      ];

      await env.repo.finalizeGenerateTransaction({
        generateId: "gen-1",
        ownerId: env.ownerId,
        studySetId: env.studySetId,
        successfulChunks,
      });

      const chapters = env.db
        .select()
        .from(chapter)
        .where(eq(chapter.studySetId, env.studySetId))
        .all();
      expect(chapters).toHaveLength(1);
      expect(chapters[0]?.id).toBe(existingChapterId);
      expect(chapters[0]?.title).toBe("Pre-existing");
    });

    it("links entities from a chunk with no new chapters to existing chapter slugs", async ({
      expect,
    }) => {
      await using env = new GenerateTestEnv();

      const existingChapterId = "ch-existing";
      env.db
        .insert(chapter)
        .values({
          id: existingChapterId,
          ownerId: env.ownerId,
          slug: "existing-ch",
          studySetId: env.studySetId,
          title: "Existing Chapter",
        })
        .run();

      const successfulChunks: SuccessRecord[] = [
        makeSuccessRecord(0, {
          chapter: [],
          flashcard: [
            {
              back: "B",
              chapterSlug: "existing-ch",
              front: "F",
              hint: "",
              importance: 1,
            },
          ],
          quiz: [
            {
              chapterSlug: "existing-ch",
              options: [],
              questionText: "Using existing chapter",
              type: "MULTIPLE_CHOICE",
            },
          ],
        }),
      ];

      await env.repo.finalizeGenerateTransaction({
        generateId: "gen-1",
        ownerId: env.ownerId,
        studySetId: env.studySetId,
        successfulChunks,
      });

      const flashcards = env.db
        .select()
        .from(flashcard)
        .where(eq(flashcard.studySetId, env.studySetId))
        .all();
      expect(flashcards).toHaveLength(1);
      expect(flashcards[0]?.chapterId).toBe(existingChapterId);

      const quizzes = env.db
        .select()
        .from(quiz)
        .where(eq(quiz.studySetId, env.studySetId))
        .all();
      expect(quizzes).toHaveLength(1);
      expect(quizzes[0]?.chapterId).toBe(existingChapterId);
    });
  });
});
