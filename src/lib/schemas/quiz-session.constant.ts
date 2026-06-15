export const QUIZ_SESSION_ID_PREFIX = "qse";
export const QUIZ_SESSION_QUIZ_ID_PREFIX = "qsg";
export const QUIZ_SESSION_QUIZ_OPTION_ID_PREFIX = "qso";
export const QUIZ_SESSION_ANSWER_ID_PREFIX = "qsa";

export const QUIZ_SESSION_STATUSES = ["ACTIVE", "COMPLETED"] as const;
export type QuizSessionStatus = (typeof QUIZ_SESSION_STATUSES)[number];

export const QUIZ_SESSION_TTL_MS = 7_776_000_000;

export const QUIZ_SESSION_MAX_FAILING_CHAPTERS = 3;
