<script lang="ts">
  import { invalidate } from "$app/navigation";
  import { AnalyticsEvent, track } from "$lib/analytics/events";
  import FlashcardRatingRow from "$lib/components/features/flashcard-session/flashcard-rating-row.svelte";
  import FlashcardReviewCard from "$lib/components/features/flashcard-session/flashcard-review-card.svelte";
  import ReviewCompleteSummary from "$lib/components/features/flashcard-session/review-complete-summary.svelte";
  import ReviewEmpty from "$lib/components/features/flashcard-session/review-empty.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import { client } from "$lib/orpc";
  import type { FlashcardQueueItem } from "$lib/schemas/flashcard-session";
  import type { FlashcardSessionRating } from "$lib/schemas/flashcard-session.constant";
  import { tsfsStateFromDb } from "$lib/utils/fsrs-compat";
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

  let currentIndex = $state(0);
  let revealedIndex = $state(-1);
  let submittingFor = $state<string | null>(null);
  let submittedRatings = $state<FlashcardSessionRating[]>([]);

  const cards = $derived<FlashcardQueueItem[]>(data.cards);
  const total = $derived(cards.length);
  const currentCard = $derived<FlashcardQueueItem | null>(
    total > 0 ? (cards[currentIndex] ?? null) : null
  );
  const isComplete = $derived(currentIndex >= total && total > 0);
  const revealed = $derived(
    currentCard !== null && revealedIndex === currentIndex
  );

  const studySetId = $derived(data.session.studySetId);
  const sessionId = $derived(data.session.id);
  const resultsHref = $derived(
    `/session/${studySetId}/flashcard/${sessionId}/results/`
  );
  const hubHref = $derived(`/session/${studySetId}/flashcard/`);

  let hasTrackedStart = false;
  $effect(() => {
    if (total === 0 || hasTrackedStart) {
      return;
    }
    hasTrackedStart = true;
    track(AnalyticsEvent.FLASHCARD_SESSION_STARTED, {
      session_id: sessionId,
      study_set_id: studySetId,
      total_cards: total,
    });
  });

  $effect(() => {
    if (isComplete) {
      const distribution: Record<string, number> = {};
      for (const r of submittedRatings) {
        distribution[r] = (distribution[r] ?? 0) + 1;
      }
      track(AnalyticsEvent.FLASHCARD_SESSION_COMPLETED, {
        cards_reviewed: submittedRatings.length,
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
    currentCard ? computeIntervalsFor(currentCard) : DEFAULT_INTERVALS
  );

  const handleReveal = () => {
    if (currentCard) {
      revealedIndex = currentIndex;
    }
  };

  const handleRate = async (rating: FlashcardSessionRating) => {
    if (!currentCard || submittingFor !== null) {
      return;
    }
    const { flashcardId } = currentCard;
    submittingFor = flashcardId;
    try {
      await client.flashcardSession.review.submit({
        flashcardId,
        rating,
        sessionId,
      });
      submittedRatings = [...submittedRatings, rating];
      await invalidate(`flashcard-session:queue:${studySetId}`);
      currentIndex += 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal menyimpan review";
      toast.error(message);
    } finally {
      submittingFor = null;
    }
  };

  const handleSkip = () => {
    if (currentIndex < total - 1) {
      currentIndex += 1;
    } else {
      currentIndex = total;
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      currentIndex -= 1;
    }
  };
</script>

{#if total === 0}
  <ReviewEmpty {studySetId} />
{:else if isComplete}
  <ReviewCompleteSummary
    ratings={submittedRatings}
    {resultsHref}
    {hubHref}
    {studySetId}
  />
{:else if currentCard}
  <div class="flex flex-col gap-6">
    <FlashcardReviewCard
      card={currentCard}
      {currentIndex}
      totalCount={total}
      {revealed}
      onReveal={handleReveal}
    />

    {#if revealed}
      <FlashcardRatingRow
        disabled={submittingFor !== null}
        intervals={intervalsForCurrent}
        onRate={handleRate}
      />
    {/if}

    <nav class="flex items-center justify-between">
      <Button
        variant="ghost"
        size="sm"
        onclick={handlePrev}
        disabled={currentIndex === 0}
      >
        Sebelumnya
      </Button>
      <span class="text-xs tabular-nums text-muted-foreground">
        {currentIndex + 1} dari {total}
      </span>
      <Button variant="ghost" size="sm" onclick={handleSkip}>Lewati</Button>
    </nav>
  </div>
{/if}
