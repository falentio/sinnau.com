export const QUIZ_TYPES = ["MULTIPLE_CHOICE", "MULTIPLE_SELECT"] as const;
export type QuizType = (typeof QUIZ_TYPES)[number];

export const QUIZ_QUESTION_TEXT_MIN_LENGTH = 1;
export const QUIZ_QUESTION_TEXT_MAX_LENGTH = 2000;
export const QUIZ_OPTION_TEXT_MIN_LENGTH = 1;
export const QUIZ_OPTION_TEXT_MAX_LENGTH = 1000;
export const QUIZ_OPTION_EXPLANATION_MAX_LENGTH = 2000;

export const QUIZ_OPTION_BATCH_MAX = 50;

export const MCQ_OPTION_MIN = 2;
export const MCQ_OPTION_MAX = 6;

export const MS_OPTION_MIN = 2;
export const MS_OPTION_MAX = 10;

export const QUIZ_OPTIONS_MAX_PER_LIST = 100;
