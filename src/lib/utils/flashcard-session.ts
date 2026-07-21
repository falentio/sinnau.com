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

export const formatRelativeTime = (
  timestampMs: number,
  nowMs: number = Date.now()
): string => {
  const diff = nowMs - timestampMs;
  if (diff < MINUTE_MS) {
    return "Baru saja";
  }
  if (diff < HOUR_MS) {
    const minutes = Math.floor(diff / MINUTE_MS);
    return `${minutes} menit lalu`;
  }
  if (diff < DAY_MS) {
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

export const formatShortDate = (dateStr: string): string => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDate();
  const month = MONTHS_ID[d.getUTCMonth()];
  return `${day} ${month}`;
};

export const ratingLabel = (
  rating: "Again" | "Hard" | "Good" | "Easy"
): "Lupa" | "Sulit" | "Cukup" | "Mudah" => {
  switch (rating) {
    case "Again": {
      return "Lupa";
    }
    case "Hard": {
      return "Sulit";
    }
    case "Good": {
      return "Cukup";
    }
    case "Easy": {
      return "Mudah";
    }
  }
};

export const stateLabel = (
  state: "New" | "Learning" | "Review" | "Relearning"
): "Baru" | "Belajar" | "Review" | "Ulang" => {
  switch (state) {
    case "New": {
      return "Baru";
    }
    case "Learning": {
      return "Belajar";
    }
    case "Review": {
      return "Review";
    }
    case "Relearning": {
      return "Ulang";
    }
  }
};

export const formatInterval = (ms: number): string => {
  if (ms < HOUR_MS) {
    const minutes = Math.max(1, Math.round(ms / MINUTE_MS));
    return `${minutes} menit`;
  }
  if (ms < DAY_MS) {
    const hours = Math.round(ms / HOUR_MS);
    return `${hours} jam`;
  }
  const days = Math.round(ms / DAY_MS);
  if (days < 30) {
    return `${days} hari`;
  }
  const months = Math.round(days / 30);
  if (months < 12) {
    return `${months} bulan`;
  }
  const years = (days / 365).toFixed(1);
  return `${years} tahun`;
};
