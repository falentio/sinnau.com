<script lang="ts">
  import type { FlashcardSessionReviewWithFront } from "$lib/schemas/flashcard-session";
  import type { FlashcardSessionRating } from "$lib/schemas/flashcard-session.constant";
  import {
    formatRelativeTime,
    ratingLabel,
    stateLabel,
  } from "$lib/utils/flashcard-session";

  interface Props {
    review: FlashcardSessionReviewWithFront;
  }
  let { review }: Props = $props();

  const ratingAccent: Record<FlashcardSessionRating, string> = {
    Again: "bg-[--color-destructive]/10 text-[--color-destructive]",
    Easy: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
    Good: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    Hard: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  };
</script>

<article
  class="flex flex-col gap-2 border-b border-border px-1 py-3 last:border-b-0"
>
  <div class="flex items-center gap-2">
    <span
      class="inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[11px] font-medium {ratingAccent[
        review.rating
      ]}"
    >
      {ratingLabel(review.rating)}
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
  <div class="flex items-center gap-2 pl-1 text-xs text-muted-foreground">
    <span
      class="inline-flex items-center rounded border border-border bg-muted/40 px-1.5 py-0.5"
    >
      {stateLabel(review.preState)}
    </span>
    <span class="tabular-nums">
      reps {review.preReps} · stab {review.preStability.toFixed(1)}
    </span>
  </div>
</article>
