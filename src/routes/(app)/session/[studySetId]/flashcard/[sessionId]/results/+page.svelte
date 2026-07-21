<script lang="ts">
  import RatingDistributionRow from "$lib/components/features/flashcard-session/rating-distribution-row.svelte";
  import ResultsHero from "$lib/components/features/flashcard-session/results-hero.svelte";
  import ReviewTimelineRow from "$lib/components/features/flashcard-session/review-timeline-row.svelte";
  import SeoHead from "$lib/components/seo-head.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import type { FlashcardSessionRating } from "$lib/schemas/flashcard-session.constant";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const reviews = $derived(data.reviews);
  const total = $derived(reviews.length);
  const studySetId = $derived(data.session.studySetId);
  const hubHref = $derived(`/session/${studySetId}/flashcard/`);

  const distribution = $derived(
    reviews.reduce<Record<FlashcardSessionRating, number>>(
      (acc, r) => {
        acc[r.rating] = (acc[r.rating] ?? 0) + 1;
        return acc;
      },
      { Again: 0, Easy: 0, Good: 0, Hard: 0 }
    )
  );
</script>

<SeoHead
  title="Hasil Review Flashcard · sinnau"
  description="Lihat hasil review flashcard kamu — jumlah kartu benar dan salah, skor akhir, serta ringkasan performa untuk sesi belajar ini."
  robots="noindex"
/>

<div class="flex flex-col gap-8">
  <ResultsHero {reviews} sessionCreatedAt={data.session.createdAt} />

  <RatingDistributionRow {distribution} {total} />

  <section class="flex flex-col gap-3">
    <div class="flex items-baseline justify-between">
      <h2 class="text-sm font-medium text-foreground">Timeline review</h2>
      <span class="text-xs tabular-nums text-muted-foreground">
        {total} entri
      </span>
    </div>
    {#if total === 0}
      <div
        class="rounded-2xl border border-border bg-card px-5 py-10 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      >
        <p class="text-sm text-muted-foreground">Belum ada review</p>
        <Button variant="outline" size="sm" href={hubHref} class="mt-3">
          Mulai review
        </Button>
      </div>
    {:else}
      <div
        class="rounded-2xl border border-border bg-card px-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      >
        {#each reviews as review (review.id)}
          <ReviewTimelineRow {review} />
        {/each}
      </div>
    {/if}
  </section>

  <div class="flex justify-center">
    <Button variant="outline" href={hubHref}>Kembali ke hub</Button>
  </div>
</div>
