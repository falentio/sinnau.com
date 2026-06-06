import { QUIZ_ID_PREFIX, QUIZ_OPTION_ID_PREFIX } from "$lib/schemas/quiz";

import type { Quiz, QuizOption } from "../../infras/db/schema/quiz.ts";
import { generateId } from "../../utils/nanoid.ts";
import type { QuizWithOptions } from "./quiz.repository.ts";

let stubs: QuizWithOptions[] | null = null;

export const getQuizStubs = (
  count: number,
  studySetId: string,
  ownerId: string
): QuizWithOptions[] => {
  if (!stubs) {
    const now = new Date();
    stubs = Array.from({ length: count }, (_, i) => {
      const quizId = generateId(QUIZ_ID_PREFIX);
      const options: QuizOption[] = [
        {
          createdAt: now,
          explanation: null,
          id: generateId(QUIZ_OPTION_ID_PREFIX),
          isCorrect: true,
          optionText: "Opsi A (benar)",
          quizId,
          updatedAt: now,
        },
        {
          createdAt: now,
          explanation: null,
          id: generateId(QUIZ_OPTION_ID_PREFIX),
          isCorrect: false,
          optionText: "Opsi B",
          quizId,
          updatedAt: now,
        },
        {
          createdAt: now,
          explanation: null,
          id: generateId(QUIZ_OPTION_ID_PREFIX),
          isCorrect: false,
          optionText: "Opsi C",
          quizId,
          updatedAt: now,
        },
        {
          createdAt: now,
          explanation: null,
          id: generateId(QUIZ_OPTION_ID_PREFIX),
          isCorrect: false,
          optionText: "Opsi D",
          quizId,
          updatedAt: now,
        },
      ];
      const quiz: Quiz = {
        chapterId: null,
        createdAt: new Date(now.getTime() - (count - i) * 3_600_000),
        id: quizId,
        ownerId,
        questionText: `Pertanyaan stub #${i + 1}?`,
        studySetId,
        type: "MULTIPLE_CHOICE",
        updatedAt: new Date(now.getTime() - (count - i) * 1_800_000),
      };
      return { ...quiz, options };
    });
  }
  return stubs.slice(0, count);
};
