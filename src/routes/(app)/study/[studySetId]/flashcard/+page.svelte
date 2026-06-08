<script lang="ts">
  import { page as pageStore } from "$app/state";
  import ListPagination from "$lib/components/features/app/list-pagination.svelte";
  import FlashcardEmpty from "$lib/components/features/flashcard/flashcard-empty.svelte";
  import FlashcardFilterBar from "$lib/components/features/flashcard/flashcard-filter-bar.svelte";
  import Badge from "$lib/components/ui/badge/badge.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import { navigateWithParams } from "$lib/utils/url";
  import { PlusSignIcon } from "@hugeicons/core-free-icons";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const flashcards = $derived(data.flashcards);
  const currentFilter = $derived(data.filter ?? null);

  const chapterParam = $derived(pageStore.url.searchParams.get("chapter"));

  const filteredFlashcards = $derived(
    chapterParam
      ? flashcards.filter((flashcard) => flashcard.chapterId === chapterParam)
      : flashcards
  );

  const pageIndex = $derived(
    Number(pageStore.url.searchParams.get("page")) || 1
  );

  const displayedFlashcards = $derived(
    filteredFlashcards.slice((pageIndex - 1) * 10, pageIndex * 10)
  );

  const handlePageChange = (p: number) => {
    navigateWithParams(pageStore.url.searchParams, {
      page: p > 1 ? String(p) : null,
    });
  };
</script>

<div class="flex items-center justify-between">
  <h2 class="font-medium">Flashcard ({filteredFlashcards.length})</h2>
  <div>
    <Button variant="outline" size="icon-sm" href="create">
      <HugeiconsIcon icon={PlusSignIcon} />
    </Button>
  </div>
</div>
<FlashcardFilterBar {currentFilter} />

{#if filteredFlashcards.length === 0}
  <FlashcardEmpty {currentFilter} {chapterParam} />
{:else}
  <div class="rounded-4xl bg-card text-card-foreground">
    {#each displayedFlashcards as flashcard, i (flashcard.id)}
      <div class="border-b p-6 last:border-b-0">
        <div class="flex items-center gap-2">
          <h3 class="font-semibold">{flashcard.front}</h3>
          {#if i % 5 === 0}
            <span class="flex-auto"></span>
            <Badge variant="outline">Penting</Badge>
          {/if}
        </div>
        <p class="text-sm text-muted-foreground">{flashcard.back}</p>
        {#if flashcard.hint}
          <p class="mt-1 text-sm text-muted-foreground italic">
            Hint: {flashcard.hint}
          </p>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<ListPagination
  count={filteredFlashcards.length}
  page={pageIndex}
  onPageChange={handlePageChange}
  perPage={10}
/>
