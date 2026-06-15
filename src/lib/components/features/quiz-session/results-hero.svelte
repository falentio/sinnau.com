<script lang="ts">
  import { scoreToCopy, tweenedScore } from "$lib/utils/quiz-session";
  import { Arc } from "layerchart";

  interface Props {
    score: number;
    total: number;
  }
  let { score, total }: Props = $props();

  // svelte-ignore state_referenced_locally
  const tweened = tweenedScore(score, 1200);

  let tweenedValue = $state(0);
  $effect(() => tweened.subscribe((v) => (tweenedValue = v)));

  const isLow = $derived(score < 75);
  const arcColor = $derived(isLow ? "stroke-destructive" : "stroke-primary");
  const trackColor = "stroke-muted";

  const tweenedPercent = $derived(total > 0 ? (tweenedValue / total) * 100 : 0);
</script>

<div
  class="flex flex-col items-center gap-2 rounded-4xl border bg-card p-1.5 shadow-xs"
>
  <div
    class="flex w-full flex-col items-center gap-1 rounded-[calc(2rem-0.375rem)] bg-background/50 p-8"
  >
    <div class="relative size-48">
      <Arc
        value={tweenedPercent}
        domain={[0, 100]}
        range={[-90, 270]}
        innerRadius={0.85}
        outerRadius={1}
        cornerRadius={8}
        track={{ class: trackColor }}
        class={arcColor}
      />
      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <p
          class="text-7xl font-semibold leading-none tracking-tighter tabular-nums md:text-8xl"
        >
          {tweenedValue}
        </p>
      </div>
    </div>
    <p class="text-sm text-muted-foreground">{score} dari {total} benar</p>
    <p class="mt-2 text-base font-medium">{scoreToCopy(score)}</p>
  </div>
</div>
