<script lang="ts">
  import { page } from "$app/state";
  import { Add01Icon } from "$lib/components/features/icons";
  import * as Select from "$lib/components/ui/select/index.js";
  import { navigateWithParams } from "$lib/utils/url";
  import { HugeiconsIcon } from "@hugeicons/svelte";
  import { untrack } from "svelte";

  interface ChapterOption {
    id: string;
    title: string;
  }

  let { chapters }: { chapters: ChapterOption[] } = $props();

  const ALL_CHAPTERS = "[all]" as const;
  const ACTION_CREATE_CHAPTER = "[action:create]" as const;

  const chapterParam = $derived(page.url.searchParams.get("chapter"));

  const sortedChapters = $derived(
    chapters.toSorted((a, b) =>
      a.title.localeCompare(b.title, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    )
  );

  const chapterItems = $derived([
    { label: "Semua chapter", value: ALL_CHAPTERS },
    ...sortedChapters.map((chapter) => ({
      label: chapter.title,
      value: chapter.id,
    })),
  ]);

  // eslint-disable-next-line svelte/no-reactive-reassign
  const initialChapterId = untrack(() => chapterParam ?? ALL_CHAPTERS);

  const selectedChapterLabel = $derived(
    chapterParam
      ? (chapters.find((chapter) => chapter.id === chapterParam)?.title ??
          "Pilih chapter")
      : "Semua chapter"
  );

  const handleChapterChange = (value: string | undefined) => {
    if (value === ACTION_CREATE_CHAPTER) {
      navigateWithParams(page.url.searchParams, { action: "create-chapter" });
      return;
    }
    const chapter = value === ALL_CHAPTERS ? null : value || null;
    navigateWithParams(page.url.searchParams, { chapter });
  };
</script>

<Select.Root
  type="single"
  name="chapterId"
  items={chapterItems}
  value={initialChapterId}
  onValueChange={handleChapterChange}
>
  <Select.Trigger class="w-full" aria-label="Pilih chapter">
    <span class="min-w-0 flex-1 truncate text-left">
      {selectedChapterLabel}
    </span>
  </Select.Trigger>
  <Select.Content class="max-h-72">
    <div class="p-1.5">
      <Select.Item value={ALL_CHAPTERS} label="Semua chapter">
        Semua chapter
      </Select.Item>
    </div>
    {#if sortedChapters.length > 0}
      <Select.Separator />
      <Select.Group>
        <Select.Label>Chapter</Select.Label>
        {#each sortedChapters as chapter (chapter.id)}
          <Select.Item value={chapter.id} label={chapter.title}>
            {chapter.title}
          </Select.Item>
        {/each}
      </Select.Group>
    {/if}
    <Select.Separator />
    <Select.Group>
      <Select.Label>Aksi</Select.Label>
      <Select.Item value={ACTION_CREATE_CHAPTER} label="Buat chapter baru">
        <HugeiconsIcon icon={Add01Icon} class="size-4" />
        Buat chapter baru
      </Select.Item>
    </Select.Group>
  </Select.Content>
</Select.Root>
