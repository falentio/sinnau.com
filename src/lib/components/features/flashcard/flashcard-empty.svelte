<script lang="ts">
  import { page as pageStore } from "$app/state";
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
    Cards01Icon,
  } from "@hugeicons/core-free-icons";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  let {
    currentFilter,
    chapterParam,
  }: {
    currentFilter: string | null;
    chapterParam?: string | null;
  } = $props();

  const isChapterFiltered = $derived(
    chapterParam !== undefined && chapterParam !== null
  );
</script>

<Empty>
  <EmptyHeader>
    <EmptyMedia>
      <HugeiconsIcon icon={Cards01Icon} />
    </EmptyMedia>
    <EmptyTitle>
      {isChapterFiltered
        ? "Belum ada flashcard di chapter ini"
        : "Belum ada flashcard"}
    </EmptyTitle>
    <EmptyDescription>
      {isChapterFiltered
        ? "Chapter ini belum memiliki flashcard. Buat satu untuk mulai menghafal."
        : "Kamu belum memiliki flashcard untuk modul belajar ini. Buat flashcard pertamamu untuk mulai menghafal."}
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
        Buat flashcard
      </Button>
    </div>
  </EmptyContent>
</Empty>
