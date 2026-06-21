<script lang="ts">
  import { page as pageStore } from "$app/state";
  import ListPagination from "$lib/components/features/app/list-pagination.svelte";
  import DeleteFlashcardDialog from "$lib/components/features/flashcard/delete-flashcard-dialog.svelte";
  import EditFlashcardDialog from "$lib/components/features/flashcard/edit-flashcard-dialog.svelte";
  import FlashcardEmpty from "$lib/components/features/flashcard/flashcard-empty.svelte";
  import FlashcardFilterBar from "$lib/components/features/flashcard/flashcard-filter-bar.svelte";
  import {
    Add01Icon,
    Delete02Icon,
    Edit01Icon,
    Settings02Icon,
  } from "$lib/components/features/icons";
  import Badge from "$lib/components/ui/badge/badge.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { navigateWithParams } from "$lib/utils/url";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const flashcards = $derived(data.flashcards);
  const currentFilter = $derived(data.filter ?? null);

  const chapterParam = $derived(pageStore.url.searchParams.get("chapter"));

  const studySetId = $derived(pageStore.params.studySetId ?? "");

  let editDialogOpen = $state(false);
  let deleteDialogOpen = $state(false);
  let selectedFlashcard = $state<{
    back: string;
    front: string;
    hint: string | null;
    id: string;
    importance: number;
  } | null>(null);

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
      <HugeiconsIcon icon={Add01Icon} />
    </Button>
  </div>
</div>
<FlashcardFilterBar {currentFilter} />

{#if filteredFlashcards.length === 0}
  <FlashcardEmpty {currentFilter} {chapterParam} />
{:else}
  <div class="rounded-4xl bg-card shadow-xs text-card-foreground">
    {#each displayedFlashcards as flashcard, i (flashcard.id)}
      <div class="border-b p-6 last:border-b-0">
        <div class="flex items-center gap-2">
          <h3 class="font-semibold">{flashcard.front}</h3>
          <span class="flex-auto"></span>
          {#if i % 5 === 0}
            <Badge variant="outline">Penting</Badge>
          {/if}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              {#snippet child({ props })}
                <Button {...props} variant="ghost" size="icon-sm">
                  <HugeiconsIcon icon={Settings02Icon} />
                </Button>
              {/snippet}
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item
                onSelect={() => {
                  selectedFlashcard = flashcard;
                  editDialogOpen = true;
                }}
              >
                <HugeiconsIcon icon={Edit01Icon} />
                Edit
              </DropdownMenu.Item>
              <DropdownMenu.Item
                variant="destructive"
                onSelect={() => {
                  selectedFlashcard = flashcard;
                  deleteDialogOpen = true;
                }}
              >
                <HugeiconsIcon icon={Delete02Icon} />
                Hapus
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
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

{#if selectedFlashcard}
  <EditFlashcardDialog
    bind:open={editDialogOpen}
    {studySetId}
    flashcard={selectedFlashcard}
  />
  <DeleteFlashcardDialog
    bind:open={deleteDialogOpen}
    flashcardId={selectedFlashcard.id}
    flashcardFront={selectedFlashcard.front}
    {studySetId}
  />
{/if}

<ListPagination
  count={filteredFlashcards.length}
  page={pageIndex}
  onPageChange={handlePageChange}
  perPage={10}
/>

{#if filteredFlashcards.length > 0}
  <div
    class="sticky bottom-2 left-0 right-0 rounded-2xl border border-border bg-card p-2 shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
  >
    <Button href="/session/{studySetId}/flashcard/" class="w-full">
      Mulai review
    </Button>
  </div>
{/if}
