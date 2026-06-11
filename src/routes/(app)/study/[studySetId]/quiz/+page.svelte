<script lang="ts">
  import { page as pageStore } from "$app/state";
  import ListPagination from "$lib/components/features/app/list-pagination.svelte";
  import { Add01Icon } from "$lib/components/features/icons";
  import DeleteQuizDialog from "$lib/components/features/quiz/delete-quiz-dialog.svelte";
  import QuizCard from "$lib/components/features/quiz/quiz-card.svelte";
  import QuizEmpty from "$lib/components/features/quiz/quiz-empty.svelte";
  import QuizFilterBar from "$lib/components/features/quiz/quiz-filter-bar.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import { navigateWithParams } from "$lib/utils/url";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const quizzes = $derived(data.quizzes);
  const currentFilter = $derived(data.filter ?? null);
  const chapters = $derived(data.chapters ?? []);

  let deleteDialogOpen = $state(false);
  let selectedQuiz = $state<{
    id: string;
    questionText: string;
  } | null>(null);

  const chapterParam = $derived(pageStore.url.searchParams.get("chapter"));
  const pageIndex = $derived(
    Number(pageStore.url.searchParams.get("page")) || 1
  );
  const studySetId = $derived(pageStore.params.studySetId ?? "");

  const chapterMap = $derived(new Map(chapters.map((c) => [c.id, c.title])));

  const filteredQuizzes = $derived(
    chapterParam
      ? quizzes.filter((quiz) => quiz.chapterId === chapterParam)
      : quizzes
  );

  const displayedQuizzes = $derived(
    filteredQuizzes.slice((pageIndex - 1) * 10, pageIndex * 10)
  );

  const handleDelete = (quizId: string, questionText: string) => {
    selectedQuiz = { id: quizId, questionText };
    deleteDialogOpen = true;
  };

  const handlePageChange = (p: number) => {
    navigateWithParams(pageStore.url.searchParams, {
      page: p > 1 ? String(p) : null,
    });
  };
</script>

<div class="flex items-center justify-between">
  <h2 class="font-medium">Quiz ({filteredQuizzes.length})</h2>
  <div>
    <Button variant="outline" size="icon-sm" href="create">
      <HugeiconsIcon icon={Add01Icon} />
    </Button>
  </div>
</div>
<QuizFilterBar {currentFilter} />

{#if filteredQuizzes.length === 0}
  <QuizEmpty {currentFilter} {chapterParam} />
{:else}
  <div class="space-y-3">
    {#each displayedQuizzes as quiz (quiz.id)}
      <QuizCard
        {quiz}
        chapterTitle={chapterMap.get(quiz.chapterId ?? "") ?? null}
        onDelete={handleDelete}
      />
    {/each}
  </div>
{/if}

{#if selectedQuiz}
  <DeleteQuizDialog
    bind:open={deleteDialogOpen}
    quizId={selectedQuiz.id}
    questionText={selectedQuiz.questionText}
    {studySetId}
  />
{/if}

<ListPagination
  count={filteredQuizzes.length}
  page={pageIndex}
  onPageChange={handlePageChange}
  perPage={10}
/>
