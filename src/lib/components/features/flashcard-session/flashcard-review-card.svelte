<script lang="ts">
  import type { FlashcardQueueItem } from "$lib/schemas/flashcard-session";
  import type { FlashcardSessionBucket } from "$lib/schemas/flashcard-session.constant";
  import { stateLabel } from "$lib/utils/flashcard-session";

  interface Props {
    card: FlashcardQueueItem;
    currentIndex: number;
    totalCount: number;
    revealed: boolean;
    onReveal: () => void;
  }
  let { card, currentIndex, totalCount, revealed, onReveal }: Props = $props();

  const bucketLabel: Record<FlashcardSessionBucket, string> = {
    overdue: "Terlambat",
    "due-today": "Hari ini",
    new: "Baru",
  };

  const stateText = $derived(
    card.state ? stateLabel(card.state.state) : "Baru"
  );
</script>

<section
  class="rounded-2xl border border-border bg-card p-1.5 text-card-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
>
  <div
    class="flex min-h-[18rem] flex-col gap-6 rounded-[calc(0.75rem-0.375rem)] bg-background/60 px-5 py-6 sm:px-7 sm:py-8"
  >
    <div class="flex items-center justify-between">
      <span
        class="inline-flex items-center rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium tracking-wide text-muted-foreground"
      >
        {bucketLabel[card.bucket]} · {stateText}
      </span>
      <span class="text-xs tabular-nums text-muted-foreground">
        {currentIndex + 1} / {totalCount}
      </span>
    </div>

    <div class="flex flex-1 flex-col gap-3">
      <p class="text-xl font-medium leading-snug text-foreground">
        {card.front}
      </p>

      {#if revealed}
        <div class="mt-2 flex flex-col gap-2 border-t border-border pt-4">
          <span
            class="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
          >
            Jawaban
          </span>
          <p class="text-base leading-relaxed text-foreground/90">
            {card.back}
          </p>
          {#if card.hint}
            <p class="mt-1 text-sm italic text-muted-foreground">
              {card.hint}
            </p>
          {/if}
        </div>
      {:else}
        <button
          type="button"
          onclick={onReveal}
          class="mt-4 inline-flex w-fit items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Lihat jawaban
        </button>
      {/if}
    </div>
  </div>
</section>
