<script lang="ts">
  import { page, page as pageStore } from "$app/state";
  import ListPagination from "$lib/components/features/app/list-pagination.svelte";
  import {
    Add01Icon,
    Cancel01Icon,
    Quiz01Icon,
  } from "$lib/components/features/icons";
  import DeleteQuizDialog from "$lib/components/features/quiz/delete-quiz-dialog.svelte";
  import QuizCard from "$lib/components/features/quiz/quiz-card.svelte";
  import QuizFilterBar from "$lib/components/features/quiz/quiz-filter-bar.svelte";
  import Badge from "$lib/components/ui/badge/badge.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import EmptyContent from "$lib/components/ui/empty/empty-content.svelte";
  import EmptyDescription from "$lib/components/ui/empty/empty-description.svelte";
  import EmptyHeader from "$lib/components/ui/empty/empty-header.svelte";
  import EmptyMedia from "$lib/components/ui/empty/empty-media.svelte";
  import EmptyTitle from "$lib/components/ui/empty/empty-title.svelte";
  import Empty from "$lib/components/ui/empty/empty.svelte";
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

  const isChapterFiltered = $derived(chapterParam !== null);
</script>

<div class="flex flex-col gap-4">
  <div class="flex items-center justify-between gap-4">
    <div class="flex min-w-0 items-center gap-2.5">
      <h2 class="text-lg font-semibold">Quiz</h2>
      <Badge variant="secondary" class="shrink-0">
        {filteredQuizzes.length}
      </Badge>
    </div>
    <Button size="sm" href="create" class="shrink-0">
      <HugeiconsIcon icon={Add01Icon} />
      Buat quiz
    </Button>
  </div>

  <QuizFilterBar {currentFilter} />
</div>

{#if filteredQuizzes.length === 0}
  <Empty>
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <HugeiconsIcon icon={Quiz01Icon} />
      </EmptyMedia>
      <EmptyTitle>
        {isChapterFiltered ? "Belum ada quiz di chapter ini" : "Belum ada quiz"}
      </EmptyTitle>
      <EmptyDescription>
        {isChapterFiltered
          ? "Chapter ini belum memiliki quiz. Buat satu untuk mulai berlatih."
          : "Kamu belum memiliki quiz untuk modul belajar ini. Buat quiz pertamamu untuk mulai berlatih."}
      </EmptyDescription>
    </EmptyHeader>
    <EmptyContent>
      <div class="flex gap-2">
        {#if currentFilter && currentFilter !== "latest"}
          <Button
            size="sm"
            variant="outline"
            onclick={() =>
              navigateWithParams(pageStore.url.searchParams, {
                filter: null,
                page: null,
              })}
          >
            <HugeiconsIcon icon={Cancel01Icon} />
            Hapus filter
          </Button>
        {/if}
        <Button size="sm" href="./create">
          <HugeiconsIcon icon={Add01Icon} />
          Buat quiz
        </Button>
      </div>
    </EmptyContent>
  </Empty>
{:else}
  <div class="flex flex-col gap-3">
    {#each displayedQuizzes as quiz (quiz.id)}
      {@const editHref = `./edit?quizId=${quiz.id}`}
      <QuizCard
        {quiz}
        chapterTitle={chapterMap.get(quiz.chapterId ?? "") ?? null}
        {editHref}
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
