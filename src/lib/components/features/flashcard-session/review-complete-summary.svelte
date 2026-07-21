<script lang="ts">
  import { ArrowRight01Icon, Tick02Icon } from "$lib/components/features/icons";
  import Button from "$lib/components/ui/button/button.svelte";
  import type { FlashcardSessionRating } from "$lib/schemas/flashcard-session.constant";
  import { ratingLabel } from "$lib/utils/flashcard-session";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  interface Props {
    ratings: FlashcardSessionRating[];
    resultsHref: string;
    hubHref: string;
    studySetId: string;
  }
  let { ratings, resultsHref, hubHref, studySetId }: Props = $props();

  const total = $derived(ratings.length);
  const distribution = $derived.by(() => {
    const dist: Record<FlashcardSessionRating, number> = {
      Again: 0,
      Easy: 0,
      Good: 0,
      Hard: 0,
    };
    for (const r of ratings) {
      dist[r] = (dist[r] ?? 0) + 1;
    }
    return dist;
  });
  const summaryLine = $derived(
    total === 0
      ? "Tidak ada kartu yang di-review."
      : `${total} kartu selesai di-review.`
  );
</script>

<section
  class="rounded-2xl border border-border bg-card p-1.5 text-card-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
>
  <div
    class="flex flex-col gap-6 rounded-[calc(0.75rem-0.375rem)] bg-background/60 px-5 py-6 sm:px-7 sm:py-7"
  >
    <div class="flex flex-col gap-1">
      <span
        class="inline-flex size-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      >
        <HugeiconsIcon icon={Tick02Icon} class="size-5" />
      </span>
      <p class="mt-2 text-lg font-medium leading-tight text-foreground">
        Sesi review selesai
      </p>
      <p class="text-sm text-muted-foreground">{summaryLine}</p>
    </div>

    <dl class="grid grid-cols-4 gap-2 border-y border-border py-4">
      {#each ["Again", "Hard", "Good", "Easy"] as FlashcardSessionRating[] as r (r)}
        <div class="flex flex-col gap-0.5">
          <dt
            class="text-[11px] uppercase tracking-[0.16em] text-muted-foreground"
          >
            {ratingLabel(r)}
          </dt>
          <dd class="text-xl font-semibold tabular-nums text-foreground">
            {distribution[r]}
          </dd>
        </div>
      {/each}
    </dl>

    <div class="flex flex-col gap-2 sm:flex-row">
      <Button href={resultsHref} class="group w-full sm:w-auto">
        <span>Lihat hasil</span>
        <span
          class="ml-1 inline-flex size-5 items-center justify-center rounded-full bg-primary-foreground/15 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5"
        >
          <HugeiconsIcon icon={ArrowRight01Icon} class="size-3.5" />
        </span>
      </Button>
      <Button variant="outline" href={hubHref} class="w-full sm:w-auto">
        Kembali ke hub
      </Button>
    </div>
  </div>
</section>
