<script lang="ts">
  import { scoreToCopy, tweenedScore } from "$lib/utils/quiz-session";

  interface Props {
    score: number;
    total: number;
  }
  let { score, total }: Props = $props();

  // svelte-ignore state_referenced_locally
  const tweened = tweenedScore(score, 1200);
</script>

<div
  class="flex flex-col items-center gap-2 rounded-4xl border bg-card p-1.5 shadow-xs"
>
  <div
    class="flex w-full flex-col items-center gap-1 rounded-[calc(2rem-0.375rem)] bg-background/50 p-8"
  >
    <p
      class="text-7xl font-semibold leading-none tracking-tighter tabular-nums md:text-8xl"
    >
      {$tweened}
    </p>
    <p class="text-sm text-muted-foreground">{score} dari {total} benar</p>
    <p class="mt-2 text-base font-medium">{scoreToCopy(score)}</p>
  </div>
</div>
