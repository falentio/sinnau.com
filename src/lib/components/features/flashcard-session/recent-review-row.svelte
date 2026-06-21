<script lang="ts">
  import type { FlashcardSessionReviewWithFront } from "$lib/schemas/flashcard-session";
  import type { FlashcardSessionRating } from "$lib/schemas/flashcard-session.constant";
  import { formatRelativeTime } from "$lib/utils/flashcard-session";

  interface Props {
    review: FlashcardSessionReviewWithFront;
  }
  let { review }: Props = $props();

  const ratingStyle: Record<
    FlashcardSessionRating,
    { label: string; classes: string }
  > = {
    Again: {
      label: "Lupa",
      classes: "bg-[--color-destructive]/8 text-[--color-destructive]",
    },
    Hard: {
      label: "Sulit",
      classes: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    },
    Good: {
      label: "Cukup",
      classes: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    },
    Easy: {
      label: "Mudah",
      classes: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
    },
  };
</script>

<div
  class="flex items-center gap-3 border-b border-border px-1 py-3 last:border-b-0"
>
  <span
    class="inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[11px] font-medium tracking-wide {ratingStyle[
      review.rating
    ].classes}"
  >
    {ratingStyle[review.rating].label}
  </span>
  <span
    class="flex-1 truncate text-sm text-foreground/90"
    title={review.flashcardId}
  >
    {review.front}
  </span>
  <span class="shrink-0 text-xs tabular-nums text-muted-foreground">
    {formatRelativeTime(review.reviewedAt.getTime())}
  </span>
</div>
