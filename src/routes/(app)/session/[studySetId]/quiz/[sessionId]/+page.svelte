<script lang="ts">
  import { goto } from "$app/navigation";
  import CompleteSessionSheet from "$lib/components/features/quiz-session/complete-session-sheet.svelte";
  import ProgressPills from "$lib/components/features/quiz-session/progress-pills.svelte";
  import QuestionCard from "$lib/components/features/quiz-session/question-card.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import { client } from "$lib/orpc";
  import type { QuizSessionQuestionItem } from "$lib/schemas/quiz-session";
  import { onDestroy } from "svelte";
  import { toast } from "svelte-sonner";

  import type { PageData } from "./$types";

  interface Props {
    data: PageData;
  }
  let { data }: Props = $props();

  let currentIndex = $state(0);
  let localAnswers: Record<string, string[]> = $state({});
  let visited: Set<string> = $state(new Set());
  let debounceTimers: Record<string, ReturnType<typeof setTimeout>> = {};
  let sheetOpen = $state(false);
  let isCompleting = $state(false);

  // Seed from server data (one-time on mount; subsequent loads are sticky).
  $effect(() => {
    for (const q of data.questions) {
      if (!(q.id in localAnswers)) {
        localAnswers[q.id] = q.currentAnswer ?? [];
      }
      visited.add(q.id);
    }
  });

  onDestroy(() => {
    for (const handle of Object.values(debounceTimers)) {
      clearTimeout(handle);
    }
  });

  const currentQuestion: QuizSessionQuestionItem = $derived(
    data.questions[currentIndex] as QuizSessionQuestionItem
  );

  const chapterColorById: Record<string, string | null> = $derived({});

  const isAnswered = $derived.by(() => {
    const ans = localAnswers[currentQuestion.id] ?? [];
    if (currentQuestion.type === "FILL_IN_THE_BLANK") {
      return ans.some((x) => x.trim().length > 0);
    }
    if (currentQuestion.type === "MULTIPLE_CHOICE") {
      return ans.length === 1;
    }
    return ans.length >= 1;
  });

  const unansweredCount = $derived(
    data.questions.filter((q) => {
      const a = localAnswers[q.id] ?? [];
      if (q.type === "FILL_IN_THE_BLANK") {
        return a.every((x) => x.trim().length === 0);
      }
      if (q.type === "MULTIPLE_CHOICE") {
        return a.length !== 1;
      }
      return a.length === 0;
    }).length
  );

  const fitbMatch = (
    text: string,
    options: QuizSessionQuestionItem["options"]
  ): string[] => {
    const t = text.trim().toLowerCase();
    if (!t) {
      return [];
    }
    const [target] = options;
    if (target && target.optionText.trim().toLowerCase() === t) {
      return [target.id];
    }
    return [];
  };

  const sendSubmitAnswer = async (
    sessionQuizId: string,
    selectedOptionIds: string[]
  ) => {
    try {
      await client.quizSession.submitAnswer({
        selectedOptionIds,
        sessionId: data.session.id,
        sessionQuizId,
      });
    } catch {
      const original = data.questions.find((q) => q.id === sessionQuizId);
      if (original) {
        localAnswers[sessionQuizId] = original.currentAnswer ?? [];
      }
      toast.error("Gagal menyimpan jawaban. Coba lagi.");
    }
  };

  const dispatchAutoSave = (
    sessionQuizId: string,
    raw: string[],
    type: QuizSessionQuestionItem["type"],
    mode: "debounced" | "immediate"
  ) => {
    localAnswers[sessionQuizId] = raw;

    if (type === "FILL_IN_THE_BLANK") {
      if (mode !== "immediate") {
        return;
      }
    } else if (mode === "debounced") {
      const handle = debounceTimers[sessionQuizId];
      if (handle) {
        clearTimeout(handle);
      }
      debounceTimers[sessionQuizId] = setTimeout(() => {
        void sendSubmitAnswer(sessionQuizId, raw);
      }, 300);
      return;
    }

    const q = data.questions.find((x) => x.id === sessionQuizId);
    if (!q) {
      return;
    }
    const payload =
      type === "FILL_IN_THE_BLANK" ? fitbMatch(raw[0] ?? "", q.options) : raw;
    void sendSubmitAnswer(sessionQuizId, payload);
  };

  const goNext = () => {
    if (currentIndex < data.questions.length - 1) {
      currentIndex += 1;
    }
  };
  const goPrev = () => {
    if (currentIndex > 0) {
      currentIndex -= 1;
    }
  };
  const setIndex = (i: number) => {
    currentIndex = i;
    const q = data.questions[i] as QuizSessionQuestionItem;
    visited.add(q.id);
  };

  const flushBeforeComplete = () => {
    for (const handle of Object.values(debounceTimers)) {
      clearTimeout(handle);
    }
    debounceTimers = {};
    for (const q of data.questions) {
      const raw = localAnswers[q.id] ?? [];
      if (q.type === "FILL_IN_THE_BLANK") {
        const payload = fitbMatch(raw[0] ?? "", q.options);
        if (payload.length > 0) {
          void client.quizSession.submitAnswer({
            selectedOptionIds: payload,
            sessionId: data.session.id,
            sessionQuizId: q.id,
          });
        }
      } else if (raw.length > 0) {
        void client.quizSession.submitAnswer({
          selectedOptionIds: raw,
          sessionId: data.session.id,
          sessionQuizId: q.id,
        });
      }
    }
  };

  const openSheet = () => {
    flushBeforeComplete();
    sheetOpen = true;
  };

  const handleComplete = async () => {
    isCompleting = true;
    try {
      await client.quizSession.complete({ sessionId: data.session.id });
      await goto(
        `/session/${data.session.studySetId}/quiz/${data.session.id}/results/`
      );
    } catch {
      toast.error("Gagal menyelesaikan sesi.");
      sheetOpen = false;
    } finally {
      isCompleting = false;
    }
  };
</script>

<ProgressPills
  questions={data.questions}
  {currentIndex}
  {localAnswers}
  {visited}
  {chapterColorById}
  onSelect={setIndex}
/>

<QuestionCard
  question={currentQuestion}
  onChange={(ids) => {
    const type = currentQuestion.type;
    if (type === "FILL_IN_THE_BLANK") {
      // Keep raw text in localAnswers; flush on blur (onBlur) or before
      // navigation. dispatchAutoSave with "immediate" runs the FITB match
      // and submits the option id when the user leaves the field.
      localAnswers[currentQuestion.id] = ids;
    } else {
      dispatchAutoSave(currentQuestion.id, ids, type, "debounced");
    }
  }}
  onBlur={(text) => {
    if (currentQuestion.type === "FILL_IN_THE_BLANK") {
      dispatchAutoSave(
        currentQuestion.id,
        [text],
        currentQuestion.type,
        "immediate"
      );
    }
  }}
/>

<div class="mt-4 flex items-center justify-between gap-2">
  {#if currentIndex > 0}
    <Button variant="outline" onclick={goPrev}>Sebelumnya</Button>
  {:else}
    <span></span>
  {/if}
  {#if currentIndex < data.questions.length - 1}
    <Button onclick={goNext} disabled={!isAnswered}>Selanjutnya</Button>
  {:else}
    <Button onclick={openSheet} disabled={!isAnswered}>Selesai</Button>
  {/if}
</div>

<CompleteSessionSheet
  bind:open={sheetOpen}
  {unansweredCount}
  onConfirm={handleComplete}
/>
