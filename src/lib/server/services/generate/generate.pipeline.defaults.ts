import { setTimeout as sleep } from "node:timers/promises";

import { getDefaultModel } from "$lib/server/infras/ai";
import { chunkContent } from "$lib/server/infras/generate/chunk";
import type {
  GenerationStorage,
  SuccessRecord,
} from "$lib/server/infras/generate/generate";
import { generate as runGenerate } from "$lib/server/infras/generate/generate";
import type { LanguageStyleId } from "$lib/server/infras/generate/language-style";
import type { LiteparseClient } from "@falentio/liteparse-client";

import type { GenerateRepository } from "./generate.repository.ts";

type ParseLiteparseImpl = (input: { pdf: File }) => Promise<{ text: string }>;

export const createParseLiteparseDefault =
  (client: LiteparseClient): ParseLiteparseImpl =>
  async (input: { pdf: File }) => {
    const result = await client.parse(input.pdf);
    if (!result.ok) {
      throw new Error(`LITEPARSE_FAILED: ${JSON.stringify(result.error)}`);
    }
    return { text: result.value };
  };

type RunLLMImpl = (input: {
  isInputTruncated?: boolean;
  pdfText: string;
  languageStyle: string;
  extractionType: string;
  storage: GenerationStorage;
  generateId: string;
}) => Promise<{ totalChunkCount: number; successCount: number }>;

export const createRunLLMDefault =
  (_repo: GenerateRepository): RunLLMImpl =>
  async (input) => {
    const result = await runGenerate({
      content: input.pdfText,
      extractionType:
        input.extractionType === "exhaustive" ? "exhaustive" : "normal",
      generateId: input.generateId,
      isInputTruncated: input.isInputTruncated,
      languageModel: getDefaultModel(),
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      languageStyle: input.languageStyle as LanguageStyleId | undefined,
      storage: input.storage,
    });

    return {
      successCount: result.processedChunks - result.failedChunks.length,
      totalChunkCount: result.totalChunks,
    };
  };

type FinalizeTransactionImpl = (input: {
  generateId: string;
  ownerId: string;
  studySetId: string;
  successfulChunks: SuccessRecord[];
}) => Promise<void>;

export const createFinalizeTransactionDefault =
  (repo: GenerateRepository): FinalizeTransactionImpl =>
  async (input) => {
    await repo.finalizeGenerateTransaction(input);
  };

const MOCK_PDF_TEXT = `Cell Biology: An Introduction

Cell biology is the study of cell structure and function, and it revolves around the concept that the cell is the fundamental unit of life. Focusing on the cell permits a detailed understanding of the tissues and organisms that cells compose. This field encompasses both prokaryotic and eukaryotic cells and includes many topics including cell anatomy, cell division, and cell death.

The cell theory, first developed in the mid-1800s, states that all living things are composed of one or more cells, that the cell is the basic unit of life, and that all cells arise from pre-existing cells. This theory is one of the foundational principles of biology and has been confirmed through extensive microscopic and molecular studies.

Prokaryotic cells, such as bacteria and archaea, lack a membrane-bound nucleus and organelles. Their genetic material is typically a single circular DNA molecule located in the nucleoid region. Despite their simplicity, prokaryotes are incredibly diverse and can be found in virtually every environment on Earth, from extreme hot springs to deep-sea vents.

Eukaryotic cells, found in plants, animals, fungi, and protists, contain a membrane-bound nucleus that houses their genetic material. They also possess various membrane-bound organelles such as mitochondria, endoplasmic reticulum, Golgi apparatus, and lysosomes. These organelles carry out specialized functions that allow the cell to operate efficiently.

The plasma membrane is a selectively permeable barrier that surrounds the cell and controls the movement of substances in and out. It is composed of a phospholipid bilayer with embedded proteins. This structure allows the cell to maintain homeostasis by regulating the internal environment despite changes in external conditions.

Mitochondria are often referred to as the powerhouses of the cell because they generate most of the cell's supply of adenosine triphosphate (ATP) through cellular respiration. The number of mitochondria in a cell varies widely depending on the cell's energy needs. Muscle cells, for example, contain many more mitochondria than skin cells.

Photosynthesis, carried out by chloroplasts in plant cells, is the process by which light energy is converted into chemical energy. This process is essential for life on Earth as it produces oxygen and serves as the base of most food chains. The overall equation for photosynthesis is: 6CO2 + 6H2O + light energy yields C6H12O6 + 6O2.

Cell division is the process by which a parent cell divides into two or more daughter cells. In eukaryotes, there are two main types: mitosis, which produces two genetically identical daughter cells, and meiosis, which produces four genetically distinct haploid cells. Prokaryotes typically divide through binary fission, a simpler process.

Homeostasis is the maintenance of a stable internal environment despite changes in external conditions. Cells maintain homeostasis through various mechanisms including selective permeability of the membrane, active transport, and feedback loops. Disruption of homeostasis can lead to disease or cell death.`;

const MOCK_CHUNK_SIZE = 1000;
const MOCK_CHUNK_DELAY_MS = 25_000;

const createMockContents = (chunkIndex: number): SuccessRecord["content"] => {
  const introSlug = `chapter_${chunkIndex}_intro`;
  const conceptsSlug = `chapter_${chunkIndex}_concepts`;
  const chapterNum = chunkIndex + 1;

  return {
    chapter: [
      { slug: introSlug, title: `Chapter ${chapterNum}: Introduction` },
      { slug: conceptsSlug, title: `Chapter ${chapterNum}: Key Concepts` },
    ],
    flashcard: [
      {
        back: `The study of living organisms and their interactions in chapter ${chapterNum}.`,
        chapterSlug: introSlug,
        front: `What is the primary focus of chapter ${chapterNum}?`,
        hint: "See the introduction section.",
        importance: 5,
      },
      {
        back: `Cells are the basic structural and functional units of life.`,
        chapterSlug: introSlug,
        front: `What are cells?`,
        hint: "Review the cell theory.",
        importance: 4,
      },
      {
        back: `DNA carries the genetic instructions for living organisms.`,
        chapterSlug: introSlug,
        front: `What is the role of DNA?`,
        hint: "Think about genetics.",
        importance: 5,
      },
      {
        back: `Photosynthesis is the process by which plants convert light into energy.`,
        chapterSlug: conceptsSlug,
        front: `What is photosynthesis?`,
        hint: "Consider how plants make food.",
        importance: 3,
      },
      {
        back: `Mitochondria are the powerhouse of the cell, producing ATP.`,
        chapterSlug: conceptsSlug,
        front: `What do mitochondria do?`,
        hint: "Think about energy production.",
        importance: 2,
      },
      {
        back: `Homeostasis is the maintenance of stable internal conditions.`,
        chapterSlug: conceptsSlug,
        front: `What is homeostasis?`,
        hint: "Review the concept of balance.",
        importance: 4,
      },
    ],
    quiz: [
      {
        chapterSlug: introSlug,
        options: [
          {
            explanation: "Correct. This is the primary focus of the chapter.",
            isCorrect: true,
            optionText: `The study of living organisms in chapter ${chapterNum}`,
          },
          {
            explanation: "Incorrect. This is too narrow.",
            isCorrect: false,
            optionText: `The study of only plants in chapter ${chapterNum}`,
          },
          {
            explanation: "Incorrect. This is too broad.",
            isCorrect: false,
            optionText: `The study of chemistry in chapter ${chapterNum}`,
          },
          {
            explanation: "Incorrect. This is unrelated.",
            isCorrect: false,
            optionText: `The study of physics in chapter ${chapterNum}`,
          },
        ],
        questionText: `What is the main topic of chapter ${chapterNum}?`,
        type: "MULTIPLE_CHOICE",
      },
      {
        chapterSlug: introSlug,
        options: [
          {
            explanation: "Correct. All living things are composed of cells.",
            isCorrect: true,
            optionText: "All living things are composed of cells",
          },
          {
            explanation: "Correct. The cell is the basic unit of life.",
            isCorrect: true,
            optionText: "The cell is the basic unit of life",
          },
          {
            explanation:
              "Incorrect. Cells arise from pre-existing cells, not spontaneously.",
            isCorrect: false,
            optionText: "Cells arise spontaneously",
          },
          {
            explanation: "Incorrect. Cells do have organelles.",
            isCorrect: false,
            optionText: "Cells lack organelles",
          },
        ],
        questionText: `Which statements about cell theory are correct in chapter ${chapterNum}?`,
        type: "MULTIPLE_SELECT",
      },
      {
        chapterSlug: conceptsSlug,
        options: [
          {
            explanation:
              "Correct. Mitochondria produce ATP through cellular respiration.",
            isCorrect: true,
            optionText: "Mitochondria generate ATP",
          },
          {
            explanation: "Incorrect. The nucleus stores DNA, not ATP.",
            isCorrect: false,
            optionText: "The nucleus generates ATP",
          },
          {
            explanation: "Incorrect. Ribosomes synthesize proteins, not ATP.",
            isCorrect: false,
            optionText: "Ribosomes generate ATP",
          },
          {
            explanation:
              "Incorrect. Lysosomes break down waste, not produce ATP.",
            isCorrect: false,
            optionText: "Lysosomes generate ATP",
          },
        ],
        questionText: `Which organelle is known as the powerhouse of the cell in chapter ${chapterNum}?`,
        type: "MULTIPLE_CHOICE",
      },
      {
        chapterSlug: conceptsSlug,
        options: [
          {
            explanation:
              "Correct. Photosynthesis converts light energy into chemical energy.",
            isCorrect: true,
            optionText: "Light energy is converted into chemical energy",
          },
          {
            explanation:
              "Correct. Photosynthesis produces oxygen as a byproduct.",
            isCorrect: true,
            optionText: "Oxygen is produced as a byproduct",
          },
          {
            explanation:
              "Incorrect. Photosynthesis consumes CO2, not produces it.",
            isCorrect: false,
            optionText: "Carbon dioxide is produced as a byproduct",
          },
          {
            explanation:
              "Incorrect. Photosynthesis occurs in chloroplasts, not mitochondria.",
            isCorrect: false,
            optionText: "Photosynthesis occurs in mitochondria",
          },
        ],
        questionText: `Which statements about photosynthesis are correct in chapter ${chapterNum}?`,
        type: "MULTIPLE_SELECT",
      },
    ],
  };
};

export const createParseLiteparseMock =
  (): ParseLiteparseImpl =>
  // oxlint-disable-next-line require-await
  async () => ({ text: MOCK_PDF_TEXT.repeat(10) });

export const createRunLLMMock = (): RunLLMImpl => async (input) => {
  const chunks = chunkContent(input.pdfText, MOCK_CHUNK_SIZE);
  for (let i = 0; i < chunks.length; i += 1) {
    await sleep(MOCK_CHUNK_DELAY_MS);
    const content = createMockContents(i);
    const record = {
      chaptersSlugs: content.chapter.map((c) => c.slug),
      content,
      index: i,
      kind: "success" as const,
      stepCount: 1,
      tokenUsage: {
        cacheRead: 0,
        cacheWrite: 0,
        input: 500,
        output: 200,
        reasoning: 0,
      },
    } satisfies SuccessRecord;
    await input.storage.appendChunkResult(record);
  }
  return {
    successCount: chunks.length,
    totalChunkCount: chunks.length,
  };
};
