import { browser } from "$app/environment";
import { cubicOut } from "svelte/easing";
// oxlint-disable-next-line no-deprecated
import { tweened } from "svelte/motion";
import type { Readable } from "svelte/store";

export type AnswerState =
  | "unvisited"
  | "visited-unanswered"
  | "answered"
  | "current";

export type SessionStatus = "ACTIVE" | "COMPLETED";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const MONTHS_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
] as const;

export const scoreToCopy = (score: number): string => {
  if (score === 100) {
    return "Sempurna";
  }
  if (score >= 90) {
    return "Bagus sekali";
  }
  if (score >= 75) {
    return "Hebat";
  }
  return "Coba lagi";
};

export const sessionStatusLabel = (
  status: SessionStatus
): "Aktif" | "Selesai" => (status === "ACTIVE" ? "Aktif" : "Selesai");

export const answerStateForPill = (
  localAnswer: string[] | null,
  isCurrent: boolean,
  isVisited: boolean
): AnswerState => {
  if (isCurrent) {
    return "current";
  }
  if (localAnswer && localAnswer.length > 0) {
    return "answered";
  }
  if (isVisited) {
    return "visited-unanswered";
  }
  return "unvisited";
};

export const formatSessionTimestamp = (
  timestampMs: number,
  nowMs: number = Date.now()
): string => {
  const diff = nowMs - timestampMs;
  if (diff < MINUTE_MS) {
    return "Baru saja";
  }
  if (diff < HOUR_MS) {
    return `${Math.floor(diff / MINUTE_MS)} menit lalu`;
  }
  if (diff < 24 * HOUR_MS) {
    const hours = Math.floor(diff / HOUR_MS);
    return `${hours} jam lalu`;
  }
  if (diff < 2 * DAY_MS) {
    return "Kemarin";
  }

  const date = new Date(timestampMs);
  const now = new Date(nowMs);
  const day = date.getUTCDate();
  const month = MONTHS_ID[date.getUTCMonth()];
  if (date.getUTCFullYear() === now.getUTCFullYear()) {
    return `${day} ${month}`;
  }
  return `${day} ${month} ${date.getUTCFullYear()}`;
};

export const tweenedScore = (
  target: number,
  durationMs = 1200
): Readable<number> => {
  // oxlint-disable-next-line no-deprecated
  const store = tweened(0, { duration: durationMs, easing: cubicOut });
  if (browser) {
    const prefersReduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (prefersReduced) {
      void store.set(target);
    } else {
      void store.set(target);
    }
  } else {
    void store.set(target);
  }
  return store;
};
