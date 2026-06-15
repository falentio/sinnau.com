import type {
  NewQuizSession,
  NewQuizSessionAnswer,
  NewQuizSessionQuiz,
  NewQuizSessionQuizOption,
  QuizSession,
  QuizSessionAnswer,
  QuizSessionQuiz,
  QuizSessionQuizOption,
} from "../../infras/db/schema/quiz-session.ts";

export type NewQuizSessionRow = NewQuizSession;
export type NewQuizSessionQuizRow = NewQuizSessionQuiz;
export type NewQuizSessionQuizOptionRow = NewQuizSessionQuizOption;
export type NewQuizSessionAnswerRow = NewQuizSessionAnswer;

export type QuizSessionUpdatePatch = Partial<
  Pick<
    QuizSession,
    | "completedAt"
    | "correctCount"
    | "failingChapterIds"
    | "incorrectQuizIds"
    | "lastAnsweredAt"
    | "lastQuestionText"
    | "score"
    | "status"
    | "totalQuestions"
    | "updatedAt"
  >
>;

export type QuizSessionQuizWithOptions = QuizSessionQuiz & {
  options: QuizSessionQuizOption[];
};

export type QuizSessionQuestionItem = QuizSessionQuizWithOptions & {
  currentAnswer: string[] | null;
};

export interface QuizSessionRepository {
  countQuizzesInScope(studySetId: string, chapterId?: string): Promise<number>;
  deleteExpiredSessions(beforeTimestamp: number): Promise<number>;
  findAnswersBySessionId(sessionId: string): Promise<QuizSessionAnswer[]>;
  findSessionById(id: string): Promise<QuizSession | null>;
  findSessionQuizById(sessionQuizId: string): Promise<QuizSessionQuiz | null>;
  findSessionQuizOptionsByIds(
    optionIds: string[]
  ): Promise<QuizSessionQuizOption[]>;
  findSessionQuizzesWithOptions(
    sessionId: string
  ): Promise<QuizSessionQuizWithOptions[]>;
  findSessionsByStudySet(
    studySetId: string,
    userId: string
  ): Promise<QuizSession[]>;
  insertSessionWithQuizzes(
    session: NewQuizSessionRow,
    quizzes: NewQuizSessionQuizRow[],
    options: NewQuizSessionQuizOptionRow[]
  ): Promise<QuizSession>;
  updateSession(
    id: string,
    userId: string,
    patch: QuizSessionUpdatePatch
  ): Promise<QuizSession | null>;
  upsertAnswer(row: NewQuizSessionAnswerRow): Promise<QuizSessionAnswer>;
}
