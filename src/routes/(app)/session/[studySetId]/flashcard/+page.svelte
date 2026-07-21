<script lang="ts">
  import ForecastStrip from "$lib/components/features/flashcard-session/forecast-strip.svelte";
  import HubActiveCard from "$lib/components/features/flashcard-session/hub-active-card.svelte";
  import HubEmpty from "$lib/components/features/flashcard-session/hub-empty.svelte";
  import HubStartCard from "$lib/components/features/flashcard-session/hub-start-card.svelte";
  import RecentReviewRow from "$lib/components/features/flashcard-session/recent-review-row.svelte";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const studySetId = $derived(data.session.studySetId);
  const pendingCount = $derived(data.pendingCount);
  const hasFlashcards = $derived(data.totalFlashcards > 0);
  const hasPending = $derived(pendingCount > 0);
  const hasRecent = $derived(data.recentReviews.length > 0);
</script>

<div class="flex flex-col gap-8">
  {#if !hasFlashcards}
    <HubEmpty {studySetId} />
  {:else}
    {#if hasPending}
      <HubActiveCard {pendingCount} sessionId={data.session.id} {studySetId} />
    {:else}
      <HubStartCard totalFlashcards={data.totalFlashcards} />
    {/if}

    <ForecastStrip dueIn7Days={data.queue.dueIn7Days} />

    {#if hasRecent}
      <section class="flex flex-col gap-3">
        <div class="flex items-baseline justify-between">
          <h2 class="text-sm font-medium text-foreground">Review terakhir</h2>
          <a
            href="/session/{studySetId}/flashcard/{data.session.id}/results/"
            class="text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            Lihat semua
          </a>
        </div>
        <div
          class="rounded-2xl border border-border bg-card px-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
        >
          {#each data.recentReviews as review (review.id)}
            <RecentReviewRow {review} />
          {/each}
        </div>
      </section>
    {/if}
  {/if}
</div>
