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
    AiChat02Icon,
    ArrowLeft01Icon,
    Book03Icon,
    Cards01Icon,
    Delete02Icon,
    Edit01Icon,
    Quiz01Icon,
    Settings02Icon,
    Share01Icon,
  } from "$lib/components/features/icons";
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
    };
  }

  const { chapters, studySet }: Props = $props();

  const studySetId = $derived(page.params.studySetId ?? "");

  let flashcardDialogOpen = $state(false);
  let chapterDialogOpen = $state(false);
  let quizDialogOpen = $state(false);

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
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-3 px-6 py-3">
    <div class="flex w-full justify-between">
      <div class="-ml-3 w-min transition-all hover:ml-0">
        <Button variant="ghost" href="/home/">
          <HugeiconsIcon icon={ArrowLeft01Icon} />
          Kembali
        </Button>
      </div>
      <div>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            {#snippet child({ props })}
              <Button {...props} variant="ghost" size="icon">
                <HugeiconsIcon icon={Settings02Icon} />
              </Button>
            {/snippet}
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item>
              <HugeiconsIcon icon={Edit01Icon} />
              Edit set
            </DropdownMenu.Item>
            <DropdownMenu.Item>
              <HugeiconsIcon icon={Delete02Icon} />
              Hapus set
            </DropdownMenu.Item>
            <DropdownMenu.Item>
              <HugeiconsIcon icon={Share01Icon} />
              Bagikan
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
        <DevCreateFlashcardDialog
          bind:open={flashcardDialogOpen}
          {studySetId}
          {chapters}
        />
        <DevCreateChapterDialog bind:open={chapterDialogOpen} {studySetId} />
        <DevCreateQuizDialog
          bind:open={quizDialogOpen}
          {studySetId}
          {chapters}
        />
        <CreateChapterDialog />
      </div>
    </div>
    <div>
      <div class="w-min rounded-lg bg-primary/10 p-3 text-primary">
        <HugeiconsIcon class="size-8" icon={Book03Icon} />
      </div>
    </div>
    <div>
      <h1 class="text-lg font-semibold">{studySet.title}</h1>
      {#if studySet.description}
        <span class="text-sm text-muted-foreground">
          {studySet.description}
        </span>
      {/if}
    </div>
    <ChapterSelect {chapters} />
    <div>
      <Button
        href="/study/{page.params.studySetId}/flashcard/{chapterQuery}"
        variant={page.url.pathname.includes("flashcard") ? "outline" : "ghost"}
      >
        <HugeiconsIcon icon={Cards01Icon} />
        Flashcard
      </Button>
      <Button
        href="/study/{page.params.studySetId}/quiz/{chapterQuery}"
        variant={page.url.pathname.includes("quiz") ? "outline" : "ghost"}
      >
        <HugeiconsIcon icon={Quiz01Icon} />
        Quiz
      </Button>
      <Button variant="ghost">
        <HugeiconsIcon icon={AiChat02Icon} />
        Tanya AI
      </Button>
    </div>
  </div>
</div>
