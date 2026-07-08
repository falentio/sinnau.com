import { chunkContent } from "$lib/server/infras/generate/chunk";
import { valibotSchema } from "@ai-sdk/valibot";
import { getLogger } from "@logtape/logtape";
import { generateText, stepCountIs, tool } from "ai";
import type { LanguageModel, LanguageModelUsage, ModelMessage } from "ai";
import * as v from "valibot";

import { composeSystemPrompt } from "./language-style";
import type { LanguageStyleId } from "./language-style";

const logger = getLogger(["sinnau.com", "generate", "infra"]);

const modelMeta = (
  model: LanguageModel
): { modelId: string; provider: string } => {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- LanguageModel is branded; read meta defensively
  const m = model as Record<string, unknown>;
  return {
    modelId: typeof m.modelId === "string" ? m.modelId : "unknown",
    provider: typeof m.provider === "string" ? m.provider : "unknown",
  };
};

export const ChapterSchema = v.object({
  slug: v.pipe(
    v.string(),
    v.description(`
Alphanumeric and underscores only, no spaces or special characters.
Lowercase only.
The slug should be unique across all chapters.
Slug and title should have similar meaning.
Example: "introduction_to_algebra" for a chapter titled "Introduction to Algebra".
`)
  ),
  title: v.pipe(v.string()),
});

const QuizOptionSchema = v.object({
  explanation: v.string(),
  isCorrect: v.boolean(),
  optionText: v.pipe(v.string(), v.nonEmpty("Option text cannot be empty")),
});

export const QuizSchema = v.object({
  chapterSlug: v.string(),
  options: v.pipe(
    v.array(QuizOptionSchema),
    v.description(`
If the quiz type is "MULTIPLE_CHOICE" or "MULTIPLE_SELECT", options must be at least 4.
`)
  ),
  questionText: v.pipe(v.string(), v.nonEmpty("Question text cannot be empty")),
  type: v.enum({
    MULTIPLE_CHOICE: "MULTIPLE_CHOICE",
    MULTIPLE_SELECT: "MULTIPLE_SELECT",
  }),
});

export const parseRubricImportance = (rubric: string) => {
  let importance = 0;

  for (const rubricItem of rubric.split(",")) {
    const [_, scoreStr] = rubricItem.split(":");
    const score = Number(scoreStr?.trim());
    if (Number.isFinite(score)) {
      importance += score;
    }
  }

  importance = Math.round(importance);
  importance = Math.max(0, importance);
  return importance;
};

export const FlashcardSchema = v.object({
  back: v.string(),
  chapterSlug: v.string(),
  front: v.string(),
  hint: v.string(),
  rubric: v.pipe(
    v.string(),
    v.description(
      "Comma-separated RuleName:point pairs for flashcard importance, for example CoreConcept:5,Terminology:2,TooNarrow:-2."
    )
  ),
});

export type GeneratedFlashcard = Omit<
  v.InferOutput<typeof FlashcardSchema>,
  "rubric"
> & {
  importance: number;
};

interface Contents {
  chapter: v.InferOutput<typeof ChapterSchema>[];
  quiz: v.InferOutput<typeof QuizSchema>[];
  flashcard: GeneratedFlashcard[];
}

interface GroupedChunk {
  chunk: string;
  index: number;
}

const groupChunk = (chunks: string[], groupSize: number): GroupedChunk[][] => {
  if (chunks.length === 0) {
    return [];
  }
  if (chunks.length <= groupSize) {
    return [chunks.map((chunk, index) => ({ chunk, index }))];
  }
  const grouped: GroupedChunk[][] = [];
  for (let i = 0; i < chunks.length; i += groupSize) {
    const group = chunks
      .slice(i, i + groupSize)
      .map((chunk, index) => ({ chunk, index: i + index }));
    grouped.push(group);
  }
  return grouped;
};

const siblingChunkMessage = (
  heading: string,
  intro: string,
  content: Contents,
  allChapterSlugs: string[] = []
) => {
  const message = [] as string[];
  // oxlint-disable-next-line unicorn/no-immediate-mutation -- improve readability by separating message construction into multiple lines
  message.push(`# ${heading}`);
  message.push("");
  message.push(intro);
  message.push("");
  message.push("## Chapters");
  message.push("");
  message.push("Here is the list of chapters title.");
  message.push("");
  for (const chapter of content.chapter) {
    message.push(`-  ${chapter.slug}`);
  }
  if (content.chapter.length === 0) {
    message.push("No chapters generated yet.");
  }
  message.push("");
  message.push("## Quizzes");
  message.push("");
  message.push("Here is the list of quiz question text.");
  message.push("");
  for (const quiz of content.quiz) {
    message.push(`- ${quiz.questionText}`);
  }
  if (content.quiz.length === 0) {
    message.push("No quizzes generated yet.");
  }
  message.push("");
  message.push("## Flashcards");
  message.push("");
  message.push("Here is the list of flashcards front text.");
  message.push("");
  for (const flashcard of content.flashcard) {
    message.push(`- ${flashcard.front}`);
  }
  if (content.flashcard.length === 0) {
    message.push("No flashcards generated yet.");
  }

  message.push("");
  message.push("# All Chapters");
  message.push("");
  message.push(
    "Here is the list of all chapter slugs that have been generated in all chunks. You can use this information to decide which chapter the quiz/flashcard should belong to."
  );
  message.push("");
  for (const slug of allChapterSlugs) {
    message.push(`-  ${slug}`);
  }
  if (allChapterSlugs.length === 0) {
    message.push("No chapters generated yet.");
  }
  return {
    content: message.join("\n"),
    role: "user",
  } as const;
};

export const previousContentMessage = (
  content: Contents,
  allChapterSlugs: string[] = []
) =>
  siblingChunkMessage(
    "Previous content",
    "This is the content that previous chunk has generated. Do not add same content again if it only rephrase.",
    content,
    allChapterSlugs
  );

export const nextContentMessage = (
  content: Contents,
  allChapterSlugs: string[] = []
) =>
  siblingChunkMessage(
    "Next chunk content",
    "This is the content that the next chunk has generated. Do not add same content again if it only rephrase.",
    content,
    allChapterSlugs
  );

const currentChunkMessage = (currentChunk: string) =>
  ({
    content: `Here is the current chunk of the content\n\n --- \`\`\`text\n${currentChunk}\n\`\`\`---`,
    role: "user",
  }) as const;

export type ExtractionType = "normal" | "exhaustive";

const getStep = (extractionType: ExtractionType) => {
  if (extractionType === "normal") {
    return 1;
  }
  return 2;
};

const providerOptions = {
  deepseek: {
    thinking: { type: "disabled" },
  },
} as const;

const createTool = (newContent: Contents) => ({
  submitContentTool: tool({
    description: `Submit generated content`,
    execute(input) {
      newContent.chapter.push(...input.chapter);
      newContent.quiz.push(...input.quiz);
      newContent.flashcard.push(
        ...input.flashcard.map(({ rubric, ...flashcard }) => ({
          ...flashcard,
          importance: parseRubricImportance(rubric),
        }))
      );

      return "Continue extracting content from the current chunk, until you sure that you've extracted all possible content. Do not worry about the format of the output, just return a string.";
    },
    inputSchema: valibotSchema(
      v.object({
        chapter: v.array(ChapterSchema),
        flashcard: v.array(FlashcardSchema),
        quiz: v.array(QuizSchema),
      })
    ),
    outputSchema: valibotSchema(v.string()),
  }),
});

const emptyContent = () =>
  ({
    chapter: [],
    flashcard: [],
    quiz: [],
  }) as Contents;

interface TokenUsage {
  input: number;
  output: number;
  reasoning: number;
  cacheRead: number;
  cacheWrite: number;
}

export interface SuccessRecord {
  kind: "success";
  index: number;
  content: Contents;
  chaptersSlugs: string[];
  tokenUsage: TokenUsage;
  stepCount: number;
}

export interface FailureRecord {
  kind: "failure";
  index: number;
  error: { name: string; message: string };
}

export type ChunkRecord = SuccessRecord | FailureRecord;

/**
 * Persistence contract for chunk processing.
 *
 * The orchestrator calls {@link appendChunkResult} after each chunk completes
 * and {@link loadChunkResults} to read the current state at the start of each
 * chunk's processing. The storage is the single source of truth — there is no
 * in-memory accumulator.
 *
 * Implementations must preserve these invariants:
 * - The set of records returned by {@link loadChunkResults} matches the set of
 *   records passed to {@link appendChunkResult}, modulo the duplicate-index
 *   rule below. Order is the same as the order of effective inserts.
 * - {@link appendChunkResult} is safe under concurrent calls because the
 *   orchestrator runs remaining groups in parallel via `Promise.all`.
 * - Duplicate index: if {@link appendChunkResult} is called with an `index`
 *   that already exists, the existing record is removed and the new record
 *   takes its place. After any sequence of calls, {@link loadChunkResults}
 *   returns at most one record per `index`. The new record wins.
 */
export interface GenerationStorage {
  /**
   * Persist a single chunk result.
   *
   * Side effect: writes `record` to the underlying store.
   *
   * **Duplicate index contract.** The orchestrator's `processChunkGroup` skips
   * any chunk whose index is already present in {@link loadChunkResults}, so a
   * duplicate append should not occur under normal use. If a duplicate
   * `record` is passed (same `index` as an existing record), the storage
   * MUST still insert the new record, but it MUST first remove any existing
   * record(s) with the same `index`. The new record always wins, and after
   * the call {@link loadChunkResults} returns at most one record per index.
   *
   * @param record - Either a SuccessRecord (extracted content, token usage,
   *   step count) or a FailureRecord (index plus error summary).
   */
  appendChunkResult(record: ChunkRecord): Promise<void>;
  /**
   * Load every chunk result persisted so far.
   *
   * Side effect: reads from the underlying store. The result is used to check
   * skip-if-done, evaluate the token limit, build sibling messages for the
   * next chunk, and aggregate the final result.
   *
   * @returns A readonly array of records in append order.
   */
  loadChunkResults(): Promise<readonly ChunkRecord[]>;
}

export interface GenerateDeps {
  readonly generateId: string;
  readonly languageModel: LanguageModel;
  readonly storage: GenerationStorage;
  readonly maxSteps: number;
  readonly systemPrompt: string;
}

export interface GenerateOptions {
  content: string;
  generateId: string;
  chunkSize?: number;
  groupSize?: number;
  extractionType?: ExtractionType;
  isInputTruncated?: boolean;
  languageModel: LanguageModel;
  storage: GenerationStorage;
  languageStyle?: LanguageStyleId;
}

export interface GenerateResult {
  content: Contents;
  isTokenLimitReached: boolean;
  totalChunks: number;
  processedChunks: number;
  stepCount: number;
  tokenUsage: TokenUsage;
  failedChunks: FailureRecord[];
}

export const planChunks = (opts: {
  content: string;
  chunkSize: number;
  groupSize: number;
}): { groups: GroupedChunk[][]; totalChunks: number } => {
  const chunks = chunkContent(opts.content, opts.chunkSize);
  return {
    groups: groupChunk(chunks, opts.groupSize),
    totalChunks: chunks.length,
  };
};

export const getMaxTokens = (maxSteps: number): number =>
  -300_000 + 1_000_000 * maxSteps;

export const sumInputTokens = (chunks: readonly SuccessRecord[]): number => {
  let total = 0;
  for (const chunk of chunks) {
    total += chunk.tokenUsage.input;
    total += chunk.tokenUsage.cacheRead;
    total += chunk.tokenUsage.cacheWrite;
  }
  return total;
};

export const collectChapterSlugs = (
  chunks: readonly SuccessRecord[]
): string[] => {
  const slugs: string[] = [];
  for (const chunk of chunks) {
    slugs.push(...chunk.chaptersSlugs);
  }
  return [...new Set(slugs)];
};

export const buildSiblingMessages = (
  index: number,
  chunks: readonly SuccessRecord[]
): ModelMessage[] => {
  const all = collectChapterSlugs(chunks);
  const messages: ModelMessage[] = [];
  const prev = chunks.find((c) => c.index === index - 1);
  if (prev) {
    messages.push(previousContentMessage(prev.content, all));
  }
  const next = chunks.find((c) => c.index === index + 1);
  if (next) {
    messages.push(nextContentMessage(next.content, all));
  }
  return messages;
};

export const buildSuccessRecord = (opts: {
  index: number;
  content: Contents;
  usage: LanguageModelUsage;
  stepCount: number;
}): SuccessRecord => {
  const chaptersSlugs = [...new Set(opts.content.chapter.map((c) => c.slug))];
  return {
    chaptersSlugs,
    content: opts.content,
    index: opts.index,
    kind: "success",
    stepCount: opts.stepCount,
    tokenUsage: {
      cacheRead: opts.usage.inputTokenDetails.cacheReadTokens ?? 0,
      cacheWrite: opts.usage.inputTokenDetails.cacheWriteTokens ?? 0,
      input: opts.usage.inputTokenDetails.noCacheTokens ?? 0,
      output: opts.usage.outputTokenDetails.textTokens ?? 0,
      reasoning: opts.usage.outputTokenDetails.reasoningTokens ?? 0,
    },
  };
};

export const summarizeResults = (
  chunks: readonly SuccessRecord[]
): {
  content: Contents;
  stepCount: number;
  tokenUsage: TokenUsage;
} => {
  const content: Contents = {
    chapter: [],
    flashcard: [],
    quiz: [],
  };
  const tokenUsage: TokenUsage = {
    cacheRead: 0,
    cacheWrite: 0,
    input: 0,
    output: 0,
    reasoning: 0,
  };
  let stepCount = 0;

  for (const chunk of chunks) {
    content.chapter.push(...chunk.content.chapter);
    content.flashcard.push(...chunk.content.flashcard);
    content.quiz.push(...chunk.content.quiz);

    tokenUsage.cacheRead += chunk.tokenUsage.cacheRead;
    tokenUsage.cacheWrite += chunk.tokenUsage.cacheWrite;
    tokenUsage.input += chunk.tokenUsage.input;
    tokenUsage.output += chunk.tokenUsage.output;
    tokenUsage.reasoning += chunk.tokenUsage.reasoning;

    stepCount += chunk.stepCount;
  }

  return { content, stepCount, tokenUsage };
};

const toFailureRecord = (index: number, error: unknown): FailureRecord => ({
  error: {
    message: error instanceof Error ? error.message : String(error),
    name: error instanceof Error ? error.name : "Error",
  },
  index,
  kind: "failure",
});

export const processChunk = async (opts: {
  chunk: GroupedChunk;
  deps: GenerateDeps;
}): Promise<ChunkRecord> => {
  const { generateId } = opts.deps;
  const chunkStart = performance.now();
  logger.info("Processing chunk", () => ({
    generateId,
    index: opts.chunk.index,
  }));
  try {
    const records = await opts.deps.storage.loadChunkResults();
    const successes = records.filter(
      (r): r is SuccessRecord => r.kind === "success"
    );
    const sink = emptyContent();
    const result = await generateText({
      messages: [
        ...buildSiblingMessages(opts.chunk.index, successes),
        currentChunkMessage(opts.chunk.chunk),
      ],
      model: opts.deps.languageModel,
      providerOptions,
      stopWhen: [stepCountIs(opts.deps.maxSteps)],
      system: opts.deps.systemPrompt,
      temperature: 0.2,
      tools: createTool(sink),
    });
    const record = buildSuccessRecord({
      content: sink,
      index: opts.chunk.index,
      stepCount: result.steps.length,
      usage: result.totalUsage,
    });
    logger.info("Chunk processed", () => ({
      durationMs: Math.round(performance.now() - chunkStart),
      generateId,
      index: record.index,
      stepCount: record.stepCount,
      tokens: record.tokenUsage,
    }));
    return record;
  } catch (error) {
    const err =
      error instanceof Error
        ? { message: error.message, name: error.name, stack: error.stack }
        : { message: String(error), name: "Error", stack: undefined };
    logger.info("Chunk failed", () => ({
      durationMs: Math.round(performance.now() - chunkStart),
      error: { message: err.message, name: err.name },
      generateId,
      index: opts.chunk.index,
    }));
    logger.debug("Chunk failed (stack)", () => ({
      generateId,
      index: opts.chunk.index,
      stack: err.stack,
    }));
    return toFailureRecord(opts.chunk.index, error);
  }
};

export const processChunkGroup = async (opts: {
  group: readonly GroupedChunk[];
  deps: GenerateDeps;
  maxTokens: number;
}): Promise<void> => {
  for (const chunk of opts.group) {
    const records = await opts.deps.storage.loadChunkResults();
    const isProcessed = records.find((r) => r.index === chunk.index);
    if (isProcessed) {
      logger.debug("Skipping already-processed chunk", () => ({
        generateId: opts.deps.generateId,
        index: chunk.index,
      }));
      continue;
    }
    const successes = records.filter(
      (r): r is SuccessRecord => r.kind === "success"
    );
    if (sumInputTokens(successes) >= opts.maxTokens) {
      logger.debug("Token limit reached, stopping group", () => ({
        generateId: opts.deps.generateId,
        maxTokens: opts.maxTokens,
      }));
      break;
    }
    const record = await processChunk({ chunk, deps: opts.deps });
    await opts.deps.storage.appendChunkResult(record);
  }
};

export const generate = async (
  opts: GenerateOptions
): Promise<GenerateResult> => {
  const chunkSize = opts.chunkSize ?? 13_000;
  const groupSize = opts.groupSize ?? 3;
  const maxSteps = getStep(opts.extractionType ?? "normal");
  const maxTokens = getMaxTokens(maxSteps);

  const deps: GenerateDeps = {
    generateId: opts.generateId,
    languageModel: opts.languageModel,
    maxSteps,
    storage: opts.storage,
    systemPrompt: composeSystemPrompt(opts.languageStyle),
  };

  const { groups, totalChunks } = planChunks({
    chunkSize,
    content: opts.content,
    groupSize,
  });
  if (groups.length === 0) {
    throw new Error("No content to generate");
  }

  logger.info("Generation run started", () => ({
    chunkSize,
    contentLength: opts.content.length,
    extractionType: opts.extractionType ?? "normal",
    generateId: opts.generateId,
    groupSize,
    isInputTruncated: opts.isInputTruncated ?? false,
    languageStyle: opts.languageStyle ?? "student-friendly",
    maxSteps,
    maxTokens,
    modelId: modelMeta(opts.languageModel).modelId,
    provider: modelMeta(opts.languageModel).provider,
    totalChunks,
  }));

  const runStart = performance.now();

  const [firstGroup, ...restGroups] = groups;
  if (firstGroup) {
    await processChunkGroup({
      deps,
      group: firstGroup,
      maxTokens,
    });
  }
  await Promise.all(
    restGroups.map(async (group) => {
      await processChunkGroup({ deps, group, maxTokens });
    })
  );

  const records = await opts.storage.loadChunkResults();
  const successes = records.filter(
    (r): r is SuccessRecord => r.kind === "success"
  );
  const summary = summarizeResults(successes);
  const failedChunks = records.filter(
    (r): r is FailureRecord => r.kind === "failure"
  );

  const isTokenLimitReached = sumInputTokens(successes) >= maxTokens;
  const durationMs = Math.round(performance.now() - runStart);

  const inputSide = summary.tokenUsage.input + summary.tokenUsage.cacheRead;
  const cacheHitRatio =
    inputSide > 0
      ? Math.round((100 * summary.tokenUsage.cacheRead) / inputSide)
      : 0;

  logger.info("Generation run finished", () => ({
    cacheHitRatio,
    contentLength: opts.content.length,
    durationMs,
    failedChunks: failedChunks.map((f) => f.index),
    flashcardCount: summary.content.flashcard.length,
    generateId: opts.generateId,
    isTokenLimitReached,
    processedChunks: records.length,
    quizCount: summary.content.quiz.length,
    stepCount: summary.stepCount,
    tokens: summary.tokenUsage,
    totalChunks,
  }));

  if (isTokenLimitReached) {
    logger.warn("Generation token limit reached", () => ({
      generateId: opts.generateId,
      maxTokens,
      totalChunks,
    }));
  }

  return {
    ...summary,
    failedChunks,
    isTokenLimitReached,
    processedChunks: records.length,
    totalChunks,
  };
};
