<script lang="ts">
  import { Cancel01Icon, Tick02Icon } from "$lib/components/features/icons";
  import type { QuizSessionQuestionItem } from "$lib/schemas/quiz-session";
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
  const explanation = $derived(
    correctOptions.find((o) => o.explanation)?.explanation ?? null
  );

  const TYPE_LABELS: Record<QuizSessionQuestionItem["type"], string> = {
    FILL_IN_THE_BLANK: "Isian",
    MULTIPLE_CHOICE: "Pilihan Ganda",
    MULTIPLE_SELECT: "Pilihan Ganda Kompleks",
  };
  const typeLabel = $derived(TYPE_LABELS[question.type]);
</script>

<article
  class="flex flex-col gap-3 rounded-4xl border border-l-4 border-l-primary/20 bg-card p-1.5 shadow-xs transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-sm"
>
  <div
    class="flex flex-col gap-3 rounded-[calc(2rem-0.375rem)] bg-background/50 p-5"
  >
    <span
      class="self-start rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
    >
      {typeLabel}
    </span>
    <p class="text-sm font-medium">{question.questionText}</p>

    {#if question.type !== "FILL_IN_THE_BLANK"}
      <div class="flex flex-col gap-2">
        <p class="text-xs font-medium text-muted-foreground">Jawaban kamu</p>
        {#if userOptions.length === 0}
          <p class="text-sm text-muted-foreground">(tidak dijawab)</p>
        {:else}
          {#each userOptions as opt (opt.id)}
            <div class="flex items-start gap-2">
              <span
                class="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive"
              >
                <HugeiconsIcon icon={Cancel01Icon} class="size-3" />
              </span>
              <p class="text-sm">{opt.optionText}</p>
            </div>
          {/each}
        {/if}
      </div>
      <div class="flex flex-col gap-2">
        <p class="text-xs font-medium text-muted-foreground">Jawaban benar</p>
        {#each correctOptions as opt (opt.id)}
          <div class="flex items-start gap-2">
            <span
              class="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
            >
              <HugeiconsIcon icon={Tick02Icon} class="size-3" />
            </span>
            <p class="text-sm">{opt.optionText}</p>
          </div>
        {/each}
      </div>
    {:else}
      <div class="flex flex-col gap-2">
        <p class="text-xs font-medium text-muted-foreground">Jawaban benar</p>
        <div class="flex items-start gap-2">
          <span
            class="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
          >
            <HugeiconsIcon icon={Tick02Icon} class="size-3" />
          </span>
          <p class="text-sm">{correctOptions[0]?.optionText ?? ""}</p>
        </div>
      </div>
    {/if}

    {#if explanation}
      <div class="flex flex-col gap-1 border-t pt-3">
        <p class="text-xs font-medium text-muted-foreground">Penjelasan</p>
        <p class="text-sm leading-relaxed">{explanation}</p>
      </div>
    {/if}
  </div>
</article>
