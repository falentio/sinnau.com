<script lang="ts">
  import { AnalyticsEvent, track } from "$lib/analytics/events";
  import FlashcardRatingRow from "$lib/components/features/flashcard-session/flashcard-rating-row.svelte";
  import FlashcardReviewCard from "$lib/components/features/flashcard-session/flashcard-review-card.svelte";
  import ReviewCompleteSummary from "$lib/components/features/flashcard-session/review-complete-summary.svelte";
  import ReviewEmpty from "$lib/components/features/flashcard-session/review-empty.svelte";
  import { ReviewSessionState } from "$lib/components/features/flashcard-session/review-session-state.svelte";
  import type {
    ReviewSessionClient,
    ReviewSessionOutcome,
  } from "$lib/components/features/flashcard-session/review-session-state.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import { client } from "$lib/orpc";
  import type { FlashcardQueueItem } from "$lib/schemas/flashcard-session";
  import type { FlashcardSessionRating } from "$lib/schemas/flashcard-session.constant";
  import { getErrorMessage } from "$lib/utils/error-messages";
  import { tsfsStateFromDb } from "$lib/utils/fsrs-compat";
  import { untrack } from "svelte";
  import { toast } from "svelte-sonner";
  import { Rating, fsrs } from "ts-fsrs";
  import type { CardInput, Grade } from "ts-fsrs";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const DEFAULT_INTERVALS: Record<FlashcardSessionRating, number> = {
    Again: 60 * 60_000,
    Easy: 3 * 24 * 60 * 60_000,
    Good: 24 * 60 * 60_000,
    Hard: 6 * 60 * 60_000,
  };

  const ratingToGrade: Record<FlashcardSessionRating, Grade> = {
    Again: Rating.Again,
    Easy: Rating.Easy,
    Good: Rating.Good,
    Hard: Rating.Hard,
  };

  const computeFsrs = fsrs();

  const reviewClient = {
    getQueue: (input) => client.flashcardSession.queue.get(input),
    submitReview: (input) => client.flashcardSession.review.submit(input),
  } satisfies ReviewSessionClient;

  const reviewSession = new ReviewSessionState(
    reviewClient,
    untrack(() => ({
      initialCards: data.cards,
      sessionId: data.session.id,
      studySetId: data.session.studySetId,
    }))
  );

  const studySetId = $derived(data.session.studySetId);
  const sessionId = $derived(data.session.id);
  const resultsHref = $derived(
    `/session/${studySetId}/flashcard/${sessionId}/results/`
  );
  const hubHref = $derived(`/session/${studySetId}/flashcard/`);

  let hasTrackedStart = false;
  $effect(() => {
    if (reviewSession.total === 0 || hasTrackedStart) {
      return;
    }
    hasTrackedStart = true;
    track(AnalyticsEvent.FLASHCARD_SESSION_STARTED, {
      session_id: sessionId,
      study_set_id: studySetId,
      total_cards: reviewSession.total,
    });
  });

  $effect(() => {
    if (reviewSession.phase === "complete") {
      const distribution: Record<string, number> = {};
      for (const r of reviewSession.submittedRatings) {
        distribution[r] = (distribution[r] ?? 0) + 1;
      }
      track(AnalyticsEvent.FLASHCARD_SESSION_COMPLETED, {
        cards_reviewed: reviewSession.submittedRatings.length,
        rating_distribution: distribution,
        session_id: sessionId,
        study_set_id: studySetId,
      });
    }
  });

  const computeIntervalsFor = (
    card: FlashcardQueueItem
  ): Record<FlashcardSessionRating, number> => {
    if (!card.state) {
      return DEFAULT_INTERVALS;
    }
    const now = new Date();
    const cardInput: CardInput = {
      difficulty: card.state.difficulty,
      due: card.state.due,
      elapsed_days: card.state.elapsedDays,
      lapses: card.state.lapses,
      last_review: card.state.lastReview,
      learning_steps: card.state.learningSteps,
      reps: card.state.reps,
      scheduled_days: card.state.scheduledDays,
      stability: card.state.stability,
      state: tsfsStateFromDb(card.state.state),
    };
    const result: Record<FlashcardSessionRating, number> = {
      ...DEFAULT_INTERVALS,
    };
    for (const r of [
      "Again",
      "Hard",
      "Good",
      "Easy",
    ] as FlashcardSessionRating[]) {
      try {
        const log = computeFsrs.next(cardInput, now, ratingToGrade[r]);
        const dueMs = log.card.due.getTime() - now.getTime();
        result[r] = Math.max(60_000, dueMs);
      } catch {
        result[r] = DEFAULT_INTERVALS[r];
      }
    }
    return result;
  };

  const intervalsForCurrent = $derived(
    reviewSession.currentCard
      ? computeIntervalsFor(reviewSession.currentCard)
      : DEFAULT_INTERVALS
  );

  const handleOutcome = (outcome: ReviewSessionOutcome) => {
    switch (outcome.kind) {
      case "batch-loaded": {
        toast.info(
          `Kamu punya ${outcome.count} kartu untuk di-review kembali`,
          {
            description:
              "Kartu akan di-review kembali hingga hanya tersisa kartu besok",
            position: "top-right",
          }
        );
        return;
      }
      case "error": {
        toast.error(getErrorMessage(outcome.error));
        return;
      }
      case "refresh-error": {
        toast.error("Gagal memeriksa kartu berikutnya");
        break;
      }
      default: {
        break;
      }
    }
  };

  const handleRate = async (rating: FlashcardSessionRating) => {
    handleOutcome(await reviewSession.rate(rating));
  };

  const handleRetryQueue = async () => {
    handleOutcome(await reviewSession.retryQueue());
  };

  const handleReveal = () => reviewSession.reveal();
  const handleSkip = () => reviewSession.skip();
  const handlePrev = () => reviewSession.prev();
</script>

{#if reviewSession.total === 0}
  <ReviewEmpty {studySetId} />
{:else if reviewSession.phase === "complete"}
  <ReviewCompleteSummary
    ratings={reviewSession.submittedRatings}
    {resultsHref}
    {hubHref}
    {studySetId}
  />
{:else if reviewSession.currentCard}
  <div class="flex flex-col gap-6">
    <FlashcardReviewCard
      card={reviewSession.currentCard}
      currentIndex={reviewSession.currentIndex}
      totalCount={reviewSession.total}
      revealed={reviewSession.revealed}
      onReveal={handleReveal}
    />

    {#if reviewSession.revealed}
      <FlashcardRatingRow
        disabled={reviewSession.phase !== "reviewing"}
        intervals={intervalsForCurrent}
        onRate={handleRate}
      />
    {/if}

    {#if reviewSession.phase === "submitting"}
      <div
        class="rounded-2xl border border-border bg-card px-5 py-6 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      >
        <p class="text-sm text-muted-foreground">Menyimpan review...</p>
      </div>
    {:else if reviewSession.phase === "refreshing"}
      <div
        class="rounded-2xl border border-border bg-card px-5 py-6 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      >
        <p class="text-sm text-muted-foreground">
          Memeriksa kartu berikutnya...
        </p>
      </div>
    {:else if reviewSession.phase === "refresh-failed"}
      <div
        class="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-5 py-6 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      >
        <p class="text-sm text-muted-foreground">
          Gagal memeriksa kartu berikutnya.
        </p>
        <Button variant="outline" size="sm" onclick={handleRetryQueue}>
          Coba lagi
        </Button>
      </div>
    {/if}

    <nav class="flex items-center justify-between">
      <Button
        variant="ghost"
        size="sm"
        onclick={handlePrev}
        disabled={reviewSession.currentIndex === 0 ||
          reviewSession.phase !== "reviewing"}
      >
        Sebelumnya
      </Button>
      <span class="text-xs tabular-nums text-muted-foreground">
        {reviewSession.currentIndex + 1} dari {reviewSession.total}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onclick={handleSkip}
        disabled={reviewSession.phase !== "reviewing"}>Lewati</Button
      >
    </nav>
  </div>
{/if}
