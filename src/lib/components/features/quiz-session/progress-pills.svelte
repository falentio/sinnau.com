<script lang="ts">
  import type { QuizSessionQuestionItem } from "$lib/schemas/quiz-session";
  import { answerStateForPill } from "$lib/utils/quiz-session";
  import type { AnswerState } from "$lib/utils/quiz-session";

  interface Props {
    chapterColorById: Record<string, string | null>;
    currentIndex: number;
    localAnswers: Record<string, string[]>;
    onSelect: (index: number) => void;
    questions: QuizSessionQuestionItem[];
    visited: Set<string>;
  }
  let {
    questions,
    currentIndex,
    localAnswers,
    visited,
    chapterColorById,
    onSelect,
  }: Props = $props();

  const classFor = (
    state: AnswerState,
    chapterColor: string | null
  ): string => {
    if (state === "answered") {
      return chapterColor ? `bg-[${chapterColor}]` : "bg-primary";
    }
    if (state === "visited-unanswered") {
      return "bg-[repeating-linear-gradient(45deg,theme(colors.muted),theme(colors.muted)_4px,transparent_4px,transparent_8px)]";
    }
    return "bg-muted";
  };
</script>

<div
  class="sticky top-[calc(theme(spacing.16))] z-10 -mx-6 flex gap-1 bg-background/80 px-6 py-3 backdrop-blur"
  role="tablist"
  aria-label="Progres soal"
>
  {#each questions as q, i (q.id)}
    {@const state = answerStateForPill(
      localAnswers[q.id] ?? null,
      i === currentIndex,
      visited.has(q.id)
    )}
    {@const color = q.chapterId
      ? (chapterColorById[q.chapterId] ?? null)
      : null}
    <button
      type="button"
      class="h-1.5 flex-1 rounded-full transition-all {classFor(
        state,
        color
      )} {state === 'current' ? 'ring-2 ring-offset-2 ring-foreground' : ''}"
      aria-label="Soal {i + 1}"
      aria-current={state === "current" ? "step" : undefined}
      onclick={() => onSelect(i)}
    ></button>
  {/each}
</div>
