<script lang="ts">
  import { browser } from "$app/environment";
  import {
    CrownIcon,
    HappyIcon,
    IdeaIcon,
    SadIcon,
  } from "$lib/components/features/icons";
  import { scoreToCopy, tweenedScore } from "$lib/utils/quiz-session";
  import { HugeiconsIcon } from "@hugeicons/svelte";
  import { Arc, Chart, Layer } from "layerchart";

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
  const fillColor = $derived(isLow ? "fill-destructive" : "fill-primary");
  const roundedValue = $derived(Math.round(tweenedValue));
  const copy = $derived(scoreToCopy(score));

  const scoreIcon = $derived.by(() => {
    if (score === 100) {
      return CrownIcon;
    }
    if (score >= 90) {
      return HappyIcon;
    }
    if (score >= 75) {
      return IdeaIcon;
    }
    return SadIcon;
  });

  const scoreIconColor = $derived.by(() => {
    if (score === 100) {
      return "bg-amber-100 text-amber-700";
    }
    if (score >= 90) {
      return "bg-emerald-100 text-emerald-700";
    }
    if (score >= 75) {
      return "bg-blue-100 text-blue-700";
    }
    return "bg-red-100 text-red-700";
  });
</script>

<div
  class="flex flex-col items-center gap-2 rounded-4xl border bg-card p-1.5 shadow-xs"
>
  <div
    class="flex w-full flex-col items-center gap-1 rounded-[1.625rem] bg-background/50 p-8"
  >
    <div class="relative size-48">
      {#if browser}
        <Chart width={192} height={192} padding={0}>
          <Layer center>
            <Arc
              value={score}
              domain={[0, 100]}
              range={[-120, 120]}
              innerRadius={0.85}
              outerRadius={1}
              cornerRadius={8}
              track={{ class: "fill-muted" }}
              class={fillColor}
            />
          </Layer>
        </Chart>
      {/if}
      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <p
          class="text-6xl font-semibold leading-none tracking-tighter tabular-nums md:text-7xl"
        >
          {roundedValue}
        </p>
      </div>
    </div>
    <p class="text-sm text-muted-foreground">
      {(score / 100) * total} benar dari {total} soal
    </p>

    <div class="mt-2 flex items-center gap-2">
      <span
        class="flex size-6 items-center justify-center rounded-full {scoreIconColor}"
      >
        <HugeiconsIcon icon={scoreIcon} class="size-3.5" />
      </span>
      <p class="text-base font-medium">{copy}</p>
    </div>
  </div>
</div>
