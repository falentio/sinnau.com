<script lang="ts">
  import type { FlashcardSessionRating } from "$lib/schemas/flashcard-session.constant";
  import { ratingLabel } from "$lib/utils/flashcard-session";

  interface Props {
    distribution: Record<FlashcardSessionRating, number>;
    total: number;
  }
  let { distribution, total }: Props = $props();

  const rows: {
    rating: FlashcardSessionRating;
    accent: string;
    bar: string;
  }[] = [
    {
      rating: "Again",
      accent: "text-[--color-destructive]",
      bar: "bg-[--color-destructive]",
    },
    {
      rating: "Hard",
      accent: "text-amber-700 dark:text-amber-400",
      bar: "bg-amber-500",
    },
    {
      rating: "Good",
      accent: "text-emerald-700 dark:text-emerald-400",
      bar: "bg-emerald-500",
    },
    {
      rating: "Easy",
      accent: "text-sky-700 dark:text-sky-400",
      bar: "bg-sky-500",
    },
  ];
</script>

<dl
  class="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
>
  <div class="flex items-baseline justify-between">
    <dt class="text-sm font-medium text-foreground">Distribusi rating</dt>
    <dd class="text-xs tabular-nums text-muted-foreground">{total} total</dd>
  </div>
  {#each rows as row (row.rating)}
    {@const count = distribution[row.rating] ?? 0}
    {@const pct = total > 0 ? Math.round((count / total) * 100) : 0}
    <div class="flex flex-col gap-1.5">
      <div class="flex items-baseline justify-between text-xs">
        <span class="font-medium {row.accent}">{ratingLabel(row.rating)}</span>
        <span class="tabular-nums text-muted-foreground">
          {count} · {pct}%
        </span>
      </div>
      <div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          class="h-full rounded-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] {row.bar}"
          style="width: {pct}%"
          aria-hidden="true"
        ></div>
      </div>
    </div>
  {/each}
</dl>
