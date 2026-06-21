<script lang="ts">
  import {
    ConfusedIcon,
    HappyIcon,
    SadDizzyIcon,
    SadIcon,
  } from "$lib/components/features/icons";
  import type { FlashcardSessionRating } from "$lib/schemas/flashcard-session.constant";
  import { formatInterval } from "$lib/utils/flashcard-session";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  interface Props {
    disabled: boolean;
    intervals: Record<FlashcardSessionRating, number>;
    onRate: (rating: FlashcardSessionRating) => void;
  }
  let { disabled, intervals, onRate }: Props = $props();

  const buttons: {
    rating: FlashcardSessionRating;
    label: string;
    icon: typeof ConfusedIcon;
    accent: string;
  }[] = [
    {
      rating: "Again",
      label: "Lupa",
      icon: SadDizzyIcon,
      accent:
        "border-[--color-destructive]/30 bg-[--color-destructive]/5 text-[--color-destructive] hover:bg-[--color-destructive]/10",
    },
    {
      rating: "Hard",
      label: "Sulit",
      icon: SadIcon,
      accent:
        "border-amber-500/30 bg-amber-500/5 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400",
    },
    {
      rating: "Good",
      label: "Cukup",
      icon: ConfusedIcon,
      accent:
        "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400",
    },
    {
      rating: "Easy",
      label: "Mudah",
      icon: HappyIcon,
      accent:
        "border-sky-500/30 bg-sky-500/5 text-sky-700 hover:bg-sky-500/10 dark:text-sky-400",
    },
  ];
</script>

<div class="flex flex-col gap-2">
  <div class="flex items-baseline justify-between px-1">
    <span class="text-sm font-medium text-foreground">Seberapa paham kamu?</span
    >
    <span class="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
      Jadwal ulang
    </span>
  </div>
  <div class="grid grid-cols-4 gap-2">
    {#each buttons as btn (btn.rating)}
      <button
        type="button"
        {disabled}
        onclick={() => onRate(btn.rating)}
        aria-label={`${btn.label}, ulang dalam ${formatInterval(intervals[btn.rating])}`}
        class="flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 {btn.accent}"
      >
        <HugeiconsIcon icon={btn.icon} class="size-5" />
        <span class="text-xs font-medium">{btn.label}</span>
        <span class="text-[10px] tabular-nums opacity-80">
          {formatInterval(intervals[btn.rating])}
        </span>
      </button>
    {/each}
  </div>
</div>
