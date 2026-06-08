<script lang="ts">
  import { page as pageStore } from "$app/state";
  import ListPagination from "$lib/components/features/app/list-pagination.svelte";
  import { Quiz01Icon, Add01Icon } from "$lib/components/features/icons";
  import QuizEmpty from "$lib/components/features/quiz/quiz-empty.svelte";
  import QuizFilterBar from "$lib/components/features/quiz/quiz-filter-bar.svelte";
  import Badge from "$lib/components/ui/badge/badge.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import { navigateWithParams } from "$lib/utils/url";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const quizzes = $derived(data.quizzes);
  const currentFilter = $derived(data.filter ?? null);

  let openExplanation = $state(false);
  const chapterParam = $derived(pageStore.url.searchParams.get("chapter"));
  const pageIndex = $derived(
    Number(pageStore.url.searchParams.get("page")) || 1
  );

  const filteredQuizzes = $derived(
    chapterParam
      ? quizzes.filter((quiz) => quiz.chapterId === chapterParam)
      : quizzes
  );

  const displayedQuizzes = $derived(
    filteredQuizzes.slice((pageIndex - 1) * 10, pageIndex * 10)
  );

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
    {#each displayedQuizzes as quiz, i (quiz.id)}
      <div class="rounded-4xl bg-card text-card-foreground shadow-xs">
        <div class=" p-6">
          <div class="flex items-center gap-2">
            <Badge variant="outline">Soal #{i + 1}</Badge>
            <Badge variant="secondary">Pilihan Ganda</Badge>
            <span class="flex-auto"></span>
            <Button
              onclick={(e) => {
                openExplanation = !openExplanation;
                requestAnimationFrame(() => {
                  e.currentTarget.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                  });
                });
              }}
              variant={openExplanation ? "outline" : "ghost"}
              size="icon-sm"
            >
              <HugeiconsIcon icon={Quiz01Icon} />
            </Button>
          </div>
          <h3 class="mt-3 text-lg font-semibold">{quiz.questionText}</h3>

          <div class="mt-4 grid gap-2">
            {#each quiz.options as option, optionIndex (option.id)}
              <div
                class="flex items-center gap-3 rounded-2xl border bg-background/50 p-4"
              >
                <div
                  class="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold"
                >
                  {String.fromCharCode(65 + optionIndex)}
                </div>
                <div class="min-w-0 flex-1">
                  <div class=" gap-2">
                    {#if option.isCorrect}
                      <Badge class="inline-flex">Jawaban benar</Badge>
                    {/if}
                    <p class="font-medium">{option.optionText}</p>
                  </div>
                  {#if option.explanation && openExplanation}
                    <p class="mt-1 text-sm text-muted-foreground">
                      {option.explanation}
                    </p>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/each}
  </div>
{/if}

<ListPagination
  count={filteredQuizzes.length}
  page={pageIndex}
  onPageChange={handlePageChange}
  perPage={10}
/>
