<script lang="ts">
  import { goto } from "$app/navigation";
  import { AnalyticsEvent, track } from "$lib/analytics/events";
  import CompleteSessionDialog from "$lib/components/features/quiz-session/complete-session-dialog.svelte";
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
    if (currentQuestion.type === "MULTIPLE_CHOICE") {
      return ans.length === 1;
    }
    return ans.length >= 1;
  });

  const unansweredCount = $derived(
    data.questions.filter((q) => {
      const a = localAnswers[q.id] ?? [];
      if (q.type === "MULTIPLE_CHOICE") {
        return a.length !== 1;
      }
      return a.length === 0;
    }).length
  );

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

  const dispatchAutoSave = (sessionQuizId: string, raw: string[]) => {
    localAnswers[sessionQuizId] = raw;
    const handle = debounceTimers[sessionQuizId];
    if (handle) {
      clearTimeout(handle);
    }
    debounceTimers[sessionQuizId] = setTimeout(() => {
      void sendSubmitAnswer(sessionQuizId, raw);
    }, 300);
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
      if (raw.length > 0) {
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
      track(AnalyticsEvent.QUIZ_SESSION_COMPLETED, {
        question_count: data.questions.length,
        session_id: data.session.id,
        study_set_id: data.session.studySetId,
        unanswered_count: data.questions.filter(
          (q) => (localAnswers[q.id]?.length ?? 0) === 0
        ).length,
      });
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

<!-- TODO: create  -->

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
  onChange={(ids) => dispatchAutoSave(currentQuestion.id, ids)}
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

<CompleteSessionDialog
  bind:open={sheetOpen}
  {unansweredCount}
  onConfirm={handleComplete}
/>
