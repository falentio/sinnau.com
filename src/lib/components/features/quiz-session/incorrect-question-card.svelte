<script lang="ts">
  import {
    Cancel01Icon,
    IdeaIcon,
    Tick02Icon,
  } from "$lib/components/features/icons";
  import type {
    QuizSessionQuestionItem,
    QuizSessionQuizOption,
  } from "$lib/schemas/quiz-session";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  interface Props {
    question: QuizSessionQuestionItem;
  }
  let { question }: Props = $props();

  const correctOptions = $derived(question.options.filter((o) => o.isCorrect));
  const currentAnswer = $derived(question.currentAnswer ?? []);
  const userOptions = $derived(
    question.options.filter((o) => currentAnswer.includes(o.id))
  );

  const TYPE_LABELS: Record<QuizSessionQuestionItem["type"], string> = {
    MULTIPLE_CHOICE: "Pilihan Ganda",
    MULTIPLE_SELECT: "Pilihan Ganda Kompleks",
  };
  const typeLabel = $derived(TYPE_LABELS[question.type]);
</script>

{#snippet optionRow(opt: QuizSessionQuizOption, variant: "user" | "correct")}
  <div class="flex items-start gap-2">
    <span
      class="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full {variant ===
      'user'
        ? 'bg-destructive/10 text-destructive'
        : 'bg-emerald-100 text-emerald-700'}"
    >
      <HugeiconsIcon
        icon={variant === "user" ? Cancel01Icon : Tick02Icon}
        class="size-3"
      />
    </span>
    <div class="flex flex-col gap-1">
      <p class="text-sm">{opt.optionText}</p>
      {#if opt.explanation}
        <p class="text-xs italic text-muted-foreground">{opt.explanation}</p>
      {:else}
        <p class="text-xs italic text-muted-foreground/60">
          Tidak ada penjelasan
        </p>
      {/if}
    </div>
  </div>
{/snippet}

<article
  class="flex flex-col gap-3 rounded-4xl border bg-card p-1.5 shadow-xs transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-sm"
>
  <div class="flex flex-col gap-3 rounded-[1.625rem] bg-background/50 p-5">
    <span
      class="self-start rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
    >
      {typeLabel}
    </span>
    <p class="text-sm font-medium">{question.questionText}</p>

    {#if question.type === "MULTIPLE_SELECT"}
      <div class="flex items-start gap-1.5 text-xs text-muted-foreground">
        <HugeiconsIcon icon={IdeaIcon} class="mt-0.5 size-3 shrink-0" />
        <p>
          Dianggap benar hanya jika semua pilihan benar dipilih, tanpa ada
          pilihan salah.
        </p>
      </div>
    {/if}

    <div class="flex flex-col gap-2">
      <p class="text-xs font-medium text-muted-foreground">Jawaban kamu</p>
      {#if userOptions.length === 0}
        <p class="text-sm text-muted-foreground">(tidak dijawab)</p>
      {:else}
        {#each userOptions as opt (opt.id)}
          {@render optionRow(opt, "user")}
        {/each}
      {/if}
    </div>
    <div class="flex flex-col gap-2">
      <p class="text-xs font-medium text-muted-foreground">Jawaban benar</p>
      {#each correctOptions as opt (opt.id)}
        {@render optionRow(opt, "correct")}
      {/each}
    </div>
  </div>
</article>
