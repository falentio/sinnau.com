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

<div class="flex flex-col gap-4">
  <div class="flex items-center justify-between gap-4">
    <div class="flex min-w-0 items-center gap-2.5">
      <h2 class="text-lg font-semibold">Flashcard</h2>
      <Badge variant="secondary" class="shrink-0">
        {filteredFlashcards.length}
      </Badge>
    </div>
    <Button size="sm" href="create" class="shrink-0">
      <HugeiconsIcon icon={Add01Icon} />
      Buat flashcard
    </Button>
  </div>

  <FlashcardFilterBar {currentFilter} />
</div>

{#if filteredFlashcards.length === 0}
  <FlashcardEmpty {currentFilter} {chapterParam} />
{:else}
  <div class="flex flex-col overflow-hidden rounded-2xl bg-card shadow-xs">
    {#each displayedFlashcards as flashcard (flashcard.id)}
      <div
        class="group flex flex-col gap-2 border-b p-4 transition-colors last:border-b-0 hover:bg-muted/40"
      >
        <div class="flex items-start justify-between gap-3">
          <h3 class="min-w-0 flex-1 text-sm font-medium leading-relaxed">
            {flashcard.front}
          </h3>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              {#snippet child({ props })}
                <Button
                  {...props}
                  variant="ghost"
                  size="icon-sm"
                  class="shrink-0 opacity-60 transition-opacity group-hover:opacity-100"
                  aria-label="Opsi flashcard"
                >
                  <HugeiconsIcon icon={Settings02Icon} />
                </Button>
              {/snippet}
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end">
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

        <p class="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {flashcard.back}
        </p>

        {#if flashcard.hint}
          <p class="text-xs text-muted-foreground">
            <span class="font-medium">Hint:</span>
            {flashcard.hint}
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
