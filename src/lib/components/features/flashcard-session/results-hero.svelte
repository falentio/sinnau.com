<script lang="ts">
  import { browser } from "$app/environment";
  import type { FlashcardSessionReview } from "$lib/schemas/flashcard-session";
  import { cubicOut } from "svelte/easing";
  import { tweened } from "svelte/motion";
  import { SvelteDate } from "svelte/reactivity";

  interface Props {
    reviews: FlashcardSessionReview[];
    sessionCreatedAt: Date;
  }
  let { reviews, sessionCreatedAt }: Props = $props();

  const totalReviews = $derived(reviews.length);
  const midnight = $derived.by(() => {
    const d = new SvelteDate();
    d.setUTCHours(0, 0, 0, 0);
    return d;
  });
  const reviewedToday = $derived(
    reviews.filter((r) => r.reviewedAt.getTime() >= midnight.getTime()).length
  );

  const prefersReducedMotion = browser
    ? (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false)
    : false;

  const countStore = tweened(0, {
    duration: prefersReducedMotion ? 0 : 1200,
    easing: cubicOut,
  });

  // countStore.set is the canonical tweened-store drive pattern; not a state reassignment.
  $effect(() => {
    countStore.set(totalReviews);
  });
</script>

<section
  class="rounded-2xl border border-border bg-card p-1.5 text-card-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
>
  <div
    class="flex flex-col gap-3 rounded-[calc(0.75rem-0.375rem)] bg-background/60 px-6 py-8 sm:px-8 sm:py-10"
  >
    <span
      class="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
    >
      Riwayat review
    </span>
    <p
      class="font-semibold leading-none tracking-tighter tabular-nums text-foreground text-7xl sm:text-8xl"
    >
      {$countStore.toFixed(0)}
    </p>
    <p class="text-sm text-muted-foreground">
      {totalReviews} kartu di-review · {reviewedToday} hari ini
    </p>
    <p class="text-xs text-muted-foreground">
      Sesi dimulai {sessionCreatedAt.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}
    </p>
  </div>
</section>
