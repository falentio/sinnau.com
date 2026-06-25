<script lang="ts">
  import { dev } from "$app/environment";
  import { page } from "$app/state";
  import ChapterSelect from "$lib/components/features/chapter/chapter-select.svelte";
  import CreateChapterDialog from "$lib/components/features/chapter/create-chapter-dialog.svelte";
  import DevCreateChapterDialog from "$lib/components/features/dev/dev-create-chapter-dialog.svelte";
  import DevCreateFlashcardDialog from "$lib/components/features/dev/dev-create-flashcard-dialog.svelte";
  import DevCreateQuizDialog from "$lib/components/features/dev/dev-create-quiz-dialog.svelte";
  import {
    Add01Icon,
    ArrowLeft01Icon,
    Book03Icon,
    Delete02Icon,
    Edit01Icon,
    Quiz01Icon,
    Settings02Icon,
    Share01Icon,
  } from "$lib/components/features/icons";
  import DeleteStudySetDialog from "$lib/components/features/study-set/delete-study-set-dialog.svelte";
  import StudySetIcon from "$lib/components/features/study-set/study-set-icon.svelte";
  import UpdateStudySetDialog from "$lib/components/features/study-set/update-study-set-dialog.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  interface Chapter {
    id: string;
    title: string;
  }

  interface Props {
    chapters: Chapter[];
    studySet: {
      description: string | null;
      title: string;
      visibility: "PUBLIC" | "PRIVATE";
    };
  }

  const { chapters, studySet }: Props = $props();

  const studySetId = $derived(page.params.studySetId ?? "");

  let flashcardDialogOpen = $state(false);
  let chapterDialogOpen = $state(false);
  let quizDialogOpen = $state(false);
  let deleteDialogOpen = $state(false);
  let updateDialogOpen = $state(false);

  const chapterQuery = $derived.by(() => {
    const chapter = page.url.searchParams.get("chapter");
    if (chapter) {
      return `?chapter=${chapter}`;
    }
    return "";
  });
</script>

<div
  class="bg-card text-card-foreground shadow-xs data-[hidden=true]:hidden"
  data-hidden={page.route.id?.includes("waiting-room")}
>
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-4 px-6 py-4">
    <!-- Top bar -->
    <div class="flex items-center justify-between">
      <Button variant="ghost" size="icon" href="/home/" aria-label="Kembali">
        <HugeiconsIcon icon={ArrowLeft01Icon} />
      </Button>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <Button
              {...props}
              variant="ghost"
              size="icon"
              aria-label="Pengaturan"
            >
              <HugeiconsIcon icon={Settings02Icon} />
            </Button>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end">
          <DropdownMenu.Item onSelect={() => (updateDialogOpen = true)}>
            <HugeiconsIcon icon={Edit01Icon} />
            Edit set
          </DropdownMenu.Item>
          <DropdownMenu.Item>
            <HugeiconsIcon icon={Share01Icon} />
            Bagikan
          </DropdownMenu.Item>
          <DropdownMenu.Item
            variant="destructive"
            onSelect={() => (deleteDialogOpen = true)}
          >
            <HugeiconsIcon icon={Delete02Icon} />
            Hapus set
          </DropdownMenu.Item>
          {#if dev}
            <DropdownMenu.Separator />
            <DropdownMenu.Item onSelect={() => (flashcardDialogOpen = true)}>
              <HugeiconsIcon icon={Add01Icon} />
              Dev: Buat flashcard
            </DropdownMenu.Item>
            <DropdownMenu.Item onSelect={() => (quizDialogOpen = true)}>
              <HugeiconsIcon icon={Quiz01Icon} />
              Dev: Buat quiz
            </DropdownMenu.Item>
            <DropdownMenu.Item onSelect={() => (chapterDialogOpen = true)}>
              <HugeiconsIcon icon={Book03Icon} />
              Dev: Buat chapter
            </DropdownMenu.Item>
          {/if}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>

    <!-- Hero -->
    <div class="flex items-start gap-4">
      <StudySetIcon {studySetId} size="lg" />
      <div class="flex min-w-0 flex-1 flex-col gap-1.5 pt-1">
        <h1 class="truncate text-lg font-semibold leading-tight">
          {studySet.title}
        </h1>
        {#if studySet.description}
          <p class="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {studySet.description}
          </p>
        {/if}
      </div>
    </div>

    <!-- Chapter selector -->
    <ChapterSelect {chapters} />
  </div>
</div>

<DevCreateFlashcardDialog
  bind:open={flashcardDialogOpen}
  {studySetId}
  {chapters}
/>
<DevCreateChapterDialog bind:open={chapterDialogOpen} {studySetId} />
<DevCreateQuizDialog bind:open={quizDialogOpen} {studySetId} {chapters} />
<CreateChapterDialog />
<DeleteStudySetDialog
  bind:open={deleteDialogOpen}
  {studySetId}
  studySetTitle={studySet.title}
/>
<UpdateStudySetDialog bind:open={updateDialogOpen} {studySetId} {studySet} />
