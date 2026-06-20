<script lang="ts">
  import { page, page as pageStore } from "$app/state";
  import ListPagination from "$lib/components/features/app/list-pagination.svelte";
  import DeleteQuizDialog from "$lib/components/features/quiz/delete-quiz-dialog.svelte";
  import QuizCard from "$lib/components/features/quiz/quiz-card.svelte";
  import QuizFilterBar from "$lib/components/features/quiz/quiz-filter-bar.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import EmptyContent from "$lib/components/ui/empty/empty-content.svelte";
  import EmptyDescription from "$lib/components/ui/empty/empty-description.svelte";
  import EmptyHeader from "$lib/components/ui/empty/empty-header.svelte";
  import EmptyMedia from "$lib/components/ui/empty/empty-media.svelte";
  import EmptyTitle from "$lib/components/ui/empty/empty-title.svelte";
  import Empty from "$lib/components/ui/empty/empty.svelte";
  import { navigateWithParams } from "$lib/utils/url";
  import {
    Add01Icon,
    Cancel01Icon,
    Quiz01Icon,
  } from "@hugeicons/core-free-icons";
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
  <div class="space-y-3">
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

{#if filteredQuizzes.length > 0}
  <div
    class="sticky bottom-2 left-0 right-0 p-2 bg-card md:rounded-full shadow-xs"
  >
    <Button href="/session/{page.params.studySetId}/quiz" class="w-full"
      >Mulai belajar</Button
    >
  </div>
{/if}
