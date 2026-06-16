<script lang="ts">
  import { page } from "$app/state";
  import {
    ArrowRight01Icon,
    Home01Icon,
    Quiz01Icon,
  } from "$lib/components/features/icons";
  import FailingChapterRow from "$lib/components/features/quiz-session/failing-chapter-row.svelte";
  import IncorrectQuestionCard from "$lib/components/features/quiz-session/incorrect-question-card.svelte";
  import ResultsHero from "$lib/components/features/quiz-session/results-hero.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  import type { PageData } from "./$types";

  interface Props {
    data: PageData;
  }
  let { data }: Props = $props();

  const retryHref = $derived(
    data.session.chapterId
      ? `/session/${page.params.studySetId}/quiz/?chapter=${data.session.chapterId}`
      : `/session/${page.params.studySetId}/quiz/`
  );
  const hubHref = $derived(`/session/${page.params.studySetId}/quiz/`);
  const studySetId = $derived(page.params.studySetId ?? "");
</script>

<div class="flex flex-col gap-8">
  <ResultsHero score={data.results.score} total={data.results.totalQuestions} />

  {#if data.results.failingChapterIds.length > 0}
    <section class="flex flex-col gap-4">
      <div class="flex items-center gap-2">
        <div class="h-px flex-1 bg-border"></div>
        <h3
          class="text-xs font-medium uppercase tracking-wider text-muted-foreground"
        >
          Chapter yang perlu diulang
        </h3>
        <div class="h-px flex-1 bg-border"></div>
      </div>
      <FailingChapterRow
        chapters={data.failingChapterTitles}
        scores={data.chapterScores}
        {studySetId}
      />
    </section>
  {/if}

  {#if data.results.incorrectQuestions.length > 0}
    <section class="flex flex-col gap-4">
      <div class="flex items-center gap-2">
        <div class="h-px flex-1 bg-border"></div>
        <h3
          class="text-xs font-medium uppercase tracking-wider text-muted-foreground"
        >
          Pembahasan
        </h3>
        <div class="h-px flex-1 bg-border"></div>
      </div>
      <div class="flex flex-col gap-4">
        {#each data.results.incorrectQuestions as q (q.id)}
          <IncorrectQuestionCard question={q} />
        {/each}
      </div>
    </section>
  {/if}

  <footer class="flex flex-col gap-3 pt-6">
    <Button
      href={retryHref}
      class="group h-12 gap-2 rounded-full text-base font-medium shadow-sm transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-md active:scale-[0.98]"
    >
      <HugeiconsIcon icon={Quiz01Icon} class="size-4" />
      <span>Coba sesi baru</span>
      <span
        class="flex size-6 items-center justify-center rounded-full bg-white/15 transition-all duration-300 group-hover:translate-x-0.5"
      >
        <HugeiconsIcon icon={ArrowRight01Icon} class="size-3" />
      </span>
    </Button>
    <Button
      variant="ghost"
      href={hubHref}
      class="group h-12 gap-2 rounded-full text-base font-medium transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-muted/60 active:scale-[0.98]"
    >
      <HugeiconsIcon icon={Home01Icon} class="size-4" />
      <span>Kembali ke hub</span>
    </Button>
  </footer>
</div>
