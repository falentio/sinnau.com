<script lang="ts">
  import { page } from "$app/state";
  import FailingChapterRow from "$lib/components/features/quiz-session/failing-chapter-row.svelte";
  import IncorrectQuestionCard from "$lib/components/features/quiz-session/incorrect-question-card.svelte";
  import ResultsHero from "$lib/components/features/quiz-session/results-hero.svelte";
  import Button from "$lib/components/ui/button/button.svelte";

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

<div class="flex flex-col gap-6">
  <ResultsHero score={data.results.score} total={data.results.totalQuestions} />

  {#if data.results.failingChapterIds.length > 0}
    <section class="flex flex-col gap-3">
      <h3 class="text-sm font-medium text-muted-foreground">
        Chapter yang perlu diulang
      </h3>
      <FailingChapterRow
        chapters={data.failingChapterTitles}
        scores={data.chapterScores}
        {studySetId}
      />
    </section>
  {/if}

  {#if data.results.incorrectQuestions.length > 0}
    <section class="flex flex-col gap-3">
      <h3 class="text-sm font-medium text-muted-foreground">Pembahasan</h3>
      {#each data.results.incorrectQuestions as q (q.id)}
        <IncorrectQuestionCard question={q} />
      {/each}
    </section>
  {/if}

  <footer class="flex flex-col gap-2 pt-4">
    <Button href={retryHref}>Coba sesi baru</Button>
    <Button variant="ghost" href={hubHref}>Kembali ke hub</Button>
  </footer>
</div>
