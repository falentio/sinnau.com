import posthog from "posthog-js";

export const AnalyticsEvent = {
  AFFILIATE_LINK_COPIED: "affiliate link copied",
  DISCOVER_SEARCHED: "discover searched",
  FLASHCARD_SESSION_COMPLETED: "flashcard_session completed",
  FLASHCARD_SESSION_STARTED: "flashcard_session started",
  GENERATION_COMPLETED: "generation completed",
  GENERATION_FAILED: "generation failed",
  GENERATION_STARTED: "generation started",
  PLAN_CHECKOUT_COMPLETED: "plan checkout completed",
  PLAN_CHECKOUT_EXPIRED: "plan checkout expired",
  PLAN_CHECKOUT_STARTED: "plan checkout started",
  QUIZ_SESSION_COMPLETED: "quiz_session completed",
  QUIZ_SESSION_STARTED: "quiz_session started",
  STUDY_SET_CREATED: "study_set created",
  USER_SIGNED_UP: "user signed up",
} as const;

export type AnalyticsEventName =
  (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

export const track = (
  event: AnalyticsEventName,
  properties?: Record<string, unknown>
) => {
  if (!posthog.__loaded) {
    return;
  }
  posthog.capture(event, properties);
};
