export const QUIZ_SESSION_STATUSES = ["ACTIVE", "COMPLETED"] as const;
export type QuizSessionStatus = (typeof QUIZ_SESSION_STATUSES)[number];

export const QUIZ_SESSION_TTL_DAYS = 90;
export const QUIZ_SESSION_TTL_MS = QUIZ_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
export const QUIZ_SESSION_MAX_FAILING_CHAPTERS = 3;

export const QUIZ_SESSION_ID_PREFIX = "qse";
export const QUIZ_SESSION_ANSWER_ID_PREFIX = "qsa";
