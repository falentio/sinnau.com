<script lang="ts">
  import { goto } from "$app/navigation";
  import {
    Delete02Icon,
    Edit01Icon,
    IdeaIcon,
    Settings02Icon,
  } from "$lib/components/features/icons";
  import Badge from "$lib/components/ui/badge/badge.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import type { QuizType } from "$lib/schemas/quiz.constant";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  interface Props {
    quiz: {
      chapterId: string | null;
      id: string;
      questionText: string;
      type: QuizType;
      options: {
        explanation: string | null;
        id: string;
        isCorrect: boolean;
        optionText: string;
      }[];
    };
    chapterTitle: string | null;
    editHref: string;
    onDelete: (quizId: string, questionText: string) => void;
  }

  let { quiz, chapterTitle, editHref, onDelete }: Props = $props();

  let openExplanation = $state(false);

  const TYPE_LABELS: Record<QuizType, string> = {
    MULTIPLE_CHOICE: "Pilihan Ganda",
    MULTIPLE_SELECT: "Pilihan Ganda Kompleks",
  };
  const typeLabel = $derived(TYPE_LABELS[quiz.type]);
</script>

<div class="rounded-2xl bg-card text-card-foreground shadow-xs">
  <div class="flex flex-col gap-4 p-4">
    <div class="flex items-start justify-between gap-3">
      <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <Badge variant="secondary">{typeLabel}</Badge>
        {#if chapterTitle}
          <span class="text-xs text-muted-foreground">{chapterTitle}</span>
        {/if}
      </div>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <Button
              {...props}
              variant="ghost"
              size="icon-sm"
              class="shrink-0 opacity-60 transition-opacity hover:opacity-100"
              aria-label="Pengaturan quiz"
            >
              <HugeiconsIcon icon={Settings02Icon} />
            </Button>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end">
          <DropdownMenu.Item onSelect={() => goto(editHref)}>
            <HugeiconsIcon icon={Edit01Icon} />
            Edit
          </DropdownMenu.Item>
          <DropdownMenu.Item
            variant="destructive"
            onSelect={() => onDelete(quiz.id, quiz.questionText)}
          >
            <HugeiconsIcon icon={Delete02Icon} />
            Hapus
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>

    <h3 class="text-sm font-medium leading-relaxed">
      {quiz.questionText}
    </h3>

    <div class="flex flex-col gap-2" role="list" aria-label="Pilihan jawaban">
      {#each quiz.options as option, optionIndex (option.id)}
        <div
          class="flex items-start gap-3 rounded-xl border border-border/60 bg-background/50 p-3"
          role="listitem"
        >
          <div
            class="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold"
          >
            {String.fromCharCode(65 + optionIndex)}
          </div>
          <div class="flex min-w-0 flex-1 flex-col gap-1">
            <div class="flex flex-wrap items-center gap-2">
              {#if option.isCorrect}
                <Badge variant="secondary" class="text-xs">Jawaban benar</Badge>
              {/if}
              <p class="text-sm font-medium leading-relaxed">
                {option.optionText}
              </p>
            </div>
            {#if option.explanation && openExplanation}
              <p class="text-xs leading-relaxed text-muted-foreground">
                {option.explanation}
              </p>
            {/if}
          </div>
        </div>
      {/each}
    </div>

    {#if quiz.options.some((option) => option.explanation)}
      <Button
        variant="ghost"
        size="sm"
        class="w-fit rounded-full"
        onclick={() => (openExplanation = !openExplanation)}
        aria-expanded={openExplanation}
      >
        <HugeiconsIcon icon={IdeaIcon} />
        {openExplanation ? "Sembunyikan penjelasan" : "Lihat penjelasan"}
      </Button>
    {/if}
  </div>
</div>
