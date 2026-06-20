<script lang="ts">
  import { goto } from "$app/navigation";
  import {
    Delete02Icon,
    Edit01Icon,
    Quiz01Icon,
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

<div class="rounded-4xl bg-card text-card-foreground shadow-xs">
  <div class="p-6">
    <div class="flex items-center gap-2">
      <Badge variant="secondary">{typeLabel}</Badge>
      {#if chapterTitle}
        <span class="text-sm text-muted-foreground">{chapterTitle}</span>
      {/if}
      <span class="flex-auto"></span>
      <Button
        onclick={() => (openExplanation = !openExplanation)}
        variant={openExplanation ? "outline" : "ghost"}
        size="icon-sm"
        aria-label={openExplanation
          ? "Sembunyikan penjelasan"
          : "Tampilkan penjelasan"}
        aria-expanded={openExplanation}
      >
        <HugeiconsIcon icon={Quiz01Icon} />
      </Button>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <Button
              {...props}
              variant="ghost"
              size="icon-sm"
              aria-label="Pengaturan quiz"
            >
              <HugeiconsIcon icon={Settings02Icon} />
            </Button>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
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

    <h3 class="mt-3 text-lg font-semibold">{quiz.questionText}</h3>

    <div class="mt-4 grid gap-2" role="list" aria-label="Pilihan jawaban">
      {#each quiz.options as option, optionIndex (option.id)}
        <div
          class="flex items-center gap-3 rounded-2xl border bg-background/50 p-4"
          role="listitem"
        >
          <div
            class="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold"
          >
            {String.fromCharCode(65 + optionIndex)}
          </div>
          <div class="min-w-0 flex-1">
            <div class="gap-2">
              {#if option.isCorrect}
                <Badge class="inline-flex">Jawaban benar</Badge>
              {/if}
              <p class="font-medium">{option.optionText}</p>
            </div>
            {#if option.explanation && openExplanation}
              <p class="mt-1 text-sm text-muted-foreground">
                {option.explanation}
              </p>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>
