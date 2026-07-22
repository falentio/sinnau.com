export const GENERATE_ID_PREFIX = "gen";
export const GENERATE_INPUT_ID_PREFIX = "ginp";
export const GENERATE_CHUNK_RESULT_ID_PREFIX = "gcr";

export const GENERATE_STATUSES = [
  "CREATED",
  "ONGOING",
  "COMPLETED",
  "PARTIAL_COMPLETED",
  "FAILED",
] as const;
export type GenerateStatus = (typeof GENERATE_STATUSES)[number];

export const GENERATE_EXTRACTION_TYPES = ["normal", "exhaustive"] as const;
export type GenerateExtractionType = (typeof GENERATE_EXTRACTION_TYPES)[number];

export const GENERATE_CHUNK_KINDS = ["success", "failure"] as const;
export type GenerateChunkKind = (typeof GENERATE_CHUNK_KINDS)[number];

export const CHUNK_POLL_LIMIT = 3;
export const CHUNK_CLEANUP_AGE_DAYS = 30;

export const GENERATE_LANGUAGE_STYLE_MAX_LENGTH = 32;
export const GENERATE_LANGUAGE_STYLE_PATTERN = /^[a-z-]+$/u;
export const GENERATE_PDF_MAX_SIZE_MB = 30;
export const GENERATE_PDF_MAX_SIZE_BYTES =
  GENERATE_PDF_MAX_SIZE_MB * 1024 * 1024;

export const GENERATE_INPUT_MAX_CHARS = 500_000;
export const GENERATE_AI_CHARS_PER_UNIT = 50_000;
export const GENERATE_CHUNK_QUERY_CUTOFF_MS = 4 * 60 * 60 * 1000;
export const GENERATE_MAX_DURATION_MS = 20 * 60 * 1000;
