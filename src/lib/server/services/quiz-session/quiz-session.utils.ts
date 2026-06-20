import type {
  ListQuizSessionsResponse,
  QuizSessionQuestionItem,
  QuizSessionResults,
} from "$lib/schemas/quiz-session";

const DEV_STUB_FILTER_VALUES = [
  "empty",
  "active",
  "500",
  "mc",
  "ms",
  "perfect",
  "partial",
  "zero",
] as const;

export const DEV_STUB_FILTERS = new Set<string>(DEV_STUB_FILTER_VALUES);

export type DevStubFilter = (typeof DEV_STUB_FILTER_VALUES)[number];

const makeSession = (
  status: "ACTIVE" | "COMPLETED",
  answered: number,
  total: number
): ListQuizSessionsResponse => {
  const idSuffix =
    status === "ACTIVE" ? "active0000000001" : "complete00000001";
  return {
    chapterId: null,
    completedAt: status === "COMPLETED" ? new Date() : null,
    createdAt: new Date(Date.now() - 60 * 60_000),
    id: `qsg_${idSuffix}`,
    lastAnsweredAt: new Date(),
    lastQuestionText: "Sample question text",
    quizCount: total,
    score: status === "COMPLETED" ? Math.round((answered / total) * 100) : null,
    status,
    totalQuestions: total,
  };
};

type QuestionType = "MULTIPLE_CHOICE" | "MULTIPLE_SELECT";

const makeQuestion = (
  type: QuestionType,
  isIncorrect = false
): QuizSessionQuestionItem => {
  const sessionQuizId = `qsa_q${type.toLowerCase()}0000000001`;
  const options: QuizSessionQuestionItem["options"] = [
    {
      explanation: null,
      id: `qso_${type.toLowerCase()}0000000001`,
      isCorrect: true,
      optionText: "Correct",
      position: 0,
      sessionQuizId,
    },
    {
      explanation: null,
      id: `qso_${type.toLowerCase()}0000000002`,
      isCorrect: false,
      optionText: "Wrong 1",
      position: 1,
      sessionQuizId,
    },
    {
      explanation: null,
      id: `qso_${type.toLowerCase()}0000000003`,
      isCorrect: false,
      optionText: "Wrong 2",
      position: 2,
      sessionQuizId,
    },
  ];

  let currentAnswer: string[] | null = null;
  if (isIncorrect) {
    if (type === "MULTIPLE_CHOICE") {
      const [, wrongOption] = options;
      if (wrongOption) {
        currentAnswer = [wrongOption.id];
      }
    } else {
      currentAnswer = [];
    }
  }

  return {
    chapterId: null,
    currentAnswer,
    id: sessionQuizId,
    options,
    originalQuizId: null,
    position: 0,
    questionText: `Sample ${type.toLowerCase().replace("_", " ")} question`,
    sessionId: "qsg_active0000000001",
    type,
  };
};

const hubStubs = {
  "500": (): never => {
    throw new Error("DEV_STUB_500");
  },
  active: () => ({
    activeSessions: [makeSession("ACTIVE", 7, 20)],
    chapterQuizCounts: { chp_000000000000000001: 20 },
    recentCounts: { active: 1, all: 1, completed: 0 },
    recentSessions: [makeSession("ACTIVE", 7, 20)],
    totalScopeCount: 20,
  }),
  empty: () => ({
    activeSessions: [] as ListQuizSessionsResponse[],
    chapterQuizCounts: {} as Record<string, number>,
    recentCounts: { active: 0, all: 0, completed: 0 },
    recentSessions: [] as ListQuizSessionsResponse[],
    totalScopeCount: 0,
  }),
} as const;

const takingStubs = {
  mc: () => [makeQuestion("MULTIPLE_CHOICE")],
  ms: () => [makeQuestion("MULTIPLE_SELECT")],
} as const;

const resultsStubs = {
  partial: (): QuizSessionResults => ({
    correctCount: 15,
    failingChapterIds: ["chp_000000000000000002"],
    incorrectQuestions: [makeQuestion("MULTIPLE_CHOICE", true)],
    score: 75,
    totalQuestions: 20,
  }),
  perfect: (): QuizSessionResults => ({
    correctCount: 20,
    failingChapterIds: [],
    incorrectQuestions: [],
    score: 100,
    totalQuestions: 20,
  }),
  zero: (): QuizSessionResults => ({
    correctCount: 0,
    failingChapterIds: [
      "chp_000000000000000001",
      "chp_000000000000000002",
      "chp_000000000000000003",
    ],
    incorrectQuestions: [makeQuestion("MULTIPLE_CHOICE", true)],
    score: 0,
    totalQuestions: 20,
  }),
} as const;

export const getHubStub = (filter: string | null) => {
  if (filter === null) {
    return null;
  }
  if (!DEV_STUB_FILTERS.has(filter)) {
    return null;
  }
  if (filter === "empty") {
    return hubStubs.empty();
  }
  if (filter === "active") {
    return hubStubs.active();
  }
  if (filter === "500") {
    return hubStubs["500"]();
  }
  return null;
};

export const getTakingStub = (
  filter: string | null
): QuizSessionQuestionItem[] | null => {
  if (filter === null) {
    return null;
  }
  if (!DEV_STUB_FILTERS.has(filter)) {
    return null;
  }
  if (filter === "mc") {
    return takingStubs.mc();
  }
  if (filter === "ms") {
    return takingStubs.ms();
  }
  return null;
};

export const getResultsStub = (
  filter: string | null
): QuizSessionResults | null => {
  if (filter === null) {
    return null;
  }
  if (!DEV_STUB_FILTERS.has(filter)) {
    return null;
  }
  if (filter === "perfect") {
    return resultsStubs.perfect();
  }
  if (filter === "partial") {
    return resultsStubs.partial();
  }
  if (filter === "zero") {
    return resultsStubs.zero();
  }
  return null;
};
