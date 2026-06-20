<script lang="ts">
  import type { QuizSessionQuestionItem } from "$lib/schemas/quiz-session";

  import OptionRow from "./option-row.svelte";

  interface Props {
    onChange: (selectedOptionIds: string[]) => void;
    question: QuizSessionQuestionItem;
  }
  let { question, onChange }: Props = $props();

  // svelte-ignore state_referenced_locally
  let selected: string[] = $state(question.currentAnswer ?? []);

  $effect(() => {
    selected = question.currentAnswer ?? [];
  });

  const isAnswered = $derived(selected.length > 0);

  const pickSingle = (id: string) => {
    selected = [id];
    onChange([id]);
  };
  const toggleMulti = (id: string) => {
    const next = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id];
    selected = next;
    onChange(next);
  };

  const TYPE_LABELS: Record<QuizSessionQuestionItem["type"], string> = {
    MULTIPLE_CHOICE: "Pilihan Ganda",
    MULTIPLE_SELECT: "Pilihan Ganda Kompleks",
  };
  const typeLabel = $derived(TYPE_LABELS[question.type]);
</script>

<div class="flex flex-col gap-4 rounded-4xl border bg-card p-1.5 shadow-xs">
  <div class="rounded-[calc(2rem-0.375rem)] bg-background/50 p-5">
    <div class="flex flex-col gap-4">
      <span
        class="self-start rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
      >
        {typeLabel}
      </span>
      <p class="text-base font-medium leading-snug">
        {question.questionText}
      </p>
      <div class="flex flex-col gap-2">
        {#if question.type === "MULTIPLE_CHOICE"}
          {#each question.options as opt, i (opt.id)}
            <OptionRow
              option={opt}
              index={i}
              selected={selected[0] === opt.id}
              multi={false}
              onToggle={pickSingle}
            />
          {/each}
        {:else if question.type === "MULTIPLE_SELECT"}
          <p class="text-xs text-muted-foreground">Tandai semua yang benar</p>
          {#each question.options as opt, i (opt.id)}
            <OptionRow
              option={opt}
              index={i}
              selected={selected.includes(opt.id)}
              multi={true}
              onToggle={toggleMulti}
            />
          {/each}
        {/if}
      </div>
    </div>
  </div>
</div>
