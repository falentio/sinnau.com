<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import {
    AiChat02Icon,
    Book03Icon,
    Cards01Icon,
    Quiz01Icon,
  } from "$lib/components/features/icons";
  import Button from "$lib/components/ui/button/button.svelte";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  const studySetId = $derived(page.params.studySetId ?? "");

  const chapterQuery = $derived.by(() => {
    const chapter = page.url.searchParams.get("chapter");
    if (chapter) {
      return `?chapter=${chapter}`;
    }
    return "";
  });

  const isFlashcardActive = $derived(page.url.pathname.includes("/flashcard"));
  const isQuizActive = $derived(page.url.pathname.includes("/quiz"));
</script>

<div
  class="sticky bottom-0 z-50 flex justify-center pb-5 pt-3 data-[hidden=true]:hidden"
  data-hidden={page.route.id?.includes("waiting-room")}
>
  <nav
    class="flex max-w-[calc(100%-2rem)] items-center gap-1 overflow-x-auto rounded-full border border-border/50 bg-popover/90 p-1.5 text-popover-foreground shadow-[0_8px_32px_-12px_rgba(0,0,0,0.12)] backdrop-blur-xl"
    aria-label="Aksi modul"
  >
    <Button
      href="/study/{studySetId}/flashcard/{chapterQuery}"
      variant={isFlashcardActive ? "secondary" : "ghost"}
      class="flex h-auto min-w-[3.5rem] flex-col gap-0.5 rounded-full px-3 py-2 text-[10px] font-medium transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.96]"
      aria-current={isFlashcardActive ? "page" : undefined}
    >
      <HugeiconsIcon icon={Cards01Icon} class="size-5" strokeWidth={1.5} />
      Flashcard
    </Button>

    <Button
      href="/study/{studySetId}/quiz/{chapterQuery}"
      variant={isQuizActive ? "secondary" : "ghost"}
      class="flex h-auto min-w-[3.5rem] flex-col gap-0.5 rounded-full px-3 py-2 text-[10px] font-medium transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.96]"
      aria-current={isQuizActive ? "page" : undefined}
    >
      <HugeiconsIcon icon={Quiz01Icon} class="size-5" strokeWidth={1.5} />
      Quiz
    </Button>

    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Button
            {...props}
            variant="ghost"
            class="flex h-auto min-w-[3.5rem] flex-col gap-0.5 rounded-full px-3 py-2 text-[10px] font-medium transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.96]"
          >
            <HugeiconsIcon icon={Book03Icon} class="size-5" strokeWidth={1.5} />
            Belajar
          </Button>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="center">
        <DropdownMenu.Item
          onSelect={() => goto(`/session/${studySetId}/flashcard/`)}
        >
          <HugeiconsIcon icon={Cards01Icon} strokeWidth={1.5} />
          Review flashcard
        </DropdownMenu.Item>
        <DropdownMenu.Item
          onSelect={() => goto(`/session/${studySetId}/quiz/`)}
        >
          <HugeiconsIcon icon={Quiz01Icon} strokeWidth={1.5} />
          Kerjakan quiz
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>

    <Button
      variant="ghost"
      class="flex h-auto min-w-[3.5rem] flex-col gap-0.5 rounded-full px-3 py-2 text-[10px] font-medium transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.96]"
      aria-label="Tanya AI"
    >
      <HugeiconsIcon icon={AiChat02Icon} class="size-5" strokeWidth={1.5} />
      Tanya AI
    </Button>
  </nav>
</div>
