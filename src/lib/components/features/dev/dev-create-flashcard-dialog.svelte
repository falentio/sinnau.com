<script lang="ts">
  import { page } from "$app/state";
  import ChapterSelect from "$lib/components/features/chapter/chapter-select.svelte";
  import { client } from "$lib/orpc";

  import DevCreateEntityDialog from "./dev-create-entity-dialog.svelte";

  interface ChapterOption {
    id: string;
    title: string;
  }

  interface Props {
    open: boolean;
    studySetId: string;
    chapters: ChapterOption[];
  }

  let { open = $bindable(false), studySetId, chapters }: Props = $props();

  let count = $state(10);

  const onSubmit = async (submitCount: number) => {
    if (!studySetId) {
      throw new Error("Study set tidak ditemukan");
    }
    const chapterId = page.url.searchParams.get("chapter") ?? undefined;
    const flashcards = Array.from({ length: submitCount }, (_, i) => ({
      back: `Flashcard belakang #${i + 1}-${Math.random().toString(36).slice(2, 5)}`,
      chapterId,
      front: `Flashcard depan #${i + 1}-${Math.random().toString(36).slice(2, 5)}`,
      hint:
        (i + 1) % 3 === 0
          ? `Petunjuk stub untuk flashcard #${i + 1}-${Math.random().toString(36).slice(2, 5)}`
          : undefined,
    }));
    await client.flashcard.create({ flashcards, studySetId });
  };
</script>

<DevCreateEntityDialog
  bind:open
  bind:count
  title="Buat flashcard (Dev)"
  description="Tentukan jumlah flashcard dummy yang akan dibuat untuk stub."
  max={200}
  submitLabel="Buat"
  successMessage={(n) => `${n} flashcard berhasil dibuat.`}
  fallbackError="Flashcard belum bisa dibuat. Coba lagi sebentar."
  {onSubmit}
>
  <div class="flex flex-col gap-2">
    <span class="text-sm font-medium">Chapter</span>
    <ChapterSelect {chapters} />
  </div>
</DevCreateEntityDialog>
