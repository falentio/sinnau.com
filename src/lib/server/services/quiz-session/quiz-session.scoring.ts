import type {
  QuizSessionQuiz,
  QuizSessionQuizOption,
} from "../../infras/db/schema/quiz-session.ts";

export const scoreAnswer = (
  quizType: QuizSessionQuiz["type"],
  correctOptions: QuizSessionQuizOption[],
  selectedOptionIds: string[]
): boolean => {
  const correctIds = correctOptions.filter((o) => o.isCorrect).map((o) => o.id);
  const selected = selectedOptionIds.toSorted();

  if (quizType === "MULTIPLE_SELECT") {
    const correct = correctIds.toSorted();
    return (
      selected.length === correct.length &&
      selected.every((id, i) => id === correct[i])
    );
  }

  if (selected.length === 1 && correctIds.length === 1) {
    return selected[0] === correctIds[0];
  }

  return false;
};

export const computeFailingChapters = (
  incorrectSessionQuizIds: string[],
  quizzes: QuizSessionQuiz[]
): string[] => {
  const quizMap = new Map(quizzes.map((q) => [q.id, q]));
  const chapterCounts = new Map<string, number>();

  for (const quizId of incorrectSessionQuizIds) {
    const quiz = quizMap.get(quizId);
    if (!quiz || quiz.chapterId === null) {
      continue;
    }
    chapterCounts.set(
      quiz.chapterId,
      (chapterCounts.get(quiz.chapterId) ?? 0) + 1
    );
  }

  return [...chapterCounts.entries()]
    .toSorted((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([chapterId]) => chapterId);
};

export const computeScore = (
  correctCount: number,
  totalQuestions: number
): number => {
  if (totalQuestions === 0) {
    return 0;
  }
  return Math.round((correctCount / totalQuestions) * 100);
};
