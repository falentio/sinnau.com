export const PLAN_KEYS = ["LITE", "PLUS", "PREMIUM"] as const;
export const PLAN_DURATIONS = [1, 6, 12] as const;
export const PLAN_PAGE_LIMIT = 20;

export const PLAN_ID_PREFIX = "usp";
export const ORDER_ID_PREFIX = "ord";
export const PAYMENT_ID_PREFIX = "pay";

export const ORDER_STATUSES = [
  "PENDING",
  "PAID",
  "EXPIRED",
  "CANCELLED",
] as const;

export const PAYMENT_STATUSES = [
  "PENDING",
  "SUCCESS",
  "FAILED",
  "CANCELLED",
  "REFUNDED",
] as const;

export const PAYMENT_GATEWAYS = ["midtrans"] as const;

// Monthly price per tier (IDR, whole rupiah)
export const PLAN_MONTHLY_PRICE: Record<(typeof PLAN_KEYS)[number], number> = {
  LITE: 30_000,
  PLUS: 50_000,
  PREMIUM: 100_000,
};

// Monthly AI generate limit per tier
export const PLAN_MONTHLY_LIMIT: Record<(typeof PLAN_KEYS)[number], number> = {
  LITE: 180_000,
  PLUS: 360_000,
  PREMIUM: 1_080_000,
};

// Months the user actually pays for, per purchased duration
export const PLAN_DURATION_PAID_MONTHS: Record<
  (typeof PLAN_DURATIONS)[number],
  number
> = {
  1: 1,
  12: 9,
  6: 5,
};

// Tier rank for upgrade / downgrade comparisons (higher = better)
export const PLAN_TIER_RANK: Record<(typeof PLAN_KEYS)[number], number> = {
  LITE: 1,
  PLUS: 2,
  PREMIUM: 3,
};

export const PLAN_NAME: Record<(typeof PLAN_KEYS)[number], string> = {
  LITE: "Lite",
  PLUS: "Plus",
  PREMIUM: "Premium",
};
export const PLAN_NAME_FALLBACK = "Tidak Diketahui";

export const PLAN_BENEFITS: Record<(typeof PLAN_KEYS)[number], string[]> = {
  LITE: [
    "Batas generate hingga 180 modul per bulan",
    "Quiz tanpa batas",
    "Sesi flashcard dengan FSRS",
    "Analisis kelemahan per bab",
  ],
  PLUS: ["Semua keuntungan Lite", "Batas generate 2× lebih besar"],
  PREMIUM: [
    "Semua keuntungan Lite",
    "Batas generate 6× lebih besar",
    "Prioritas dukungan pelanggan",
  ],
};

// Used to translate monthly limits into daily / weekly windows
export const PLAN_DAILY_DIVISOR = 10;
export const PLAN_WEEKLY_DIVISOR = 4;

// Divide internal unit counts for user-facing display (e.g. 180_000 → "180 modul")
export const PLAN_UNIT_DISPLAY_DIVISOR = 1000;

// Days per purchased month for entitlement window math
export const PLAN_DAYS_PER_MONTH = 30;

// Pending QRIS payment window (minutes)
export const PLAN_QRIS_EXPIRY_MINUTES = 15;

// Admin-grant constants (issue #23)
export const ADMIN_GRANT_ID_PREFIX = "agr";
export const ADMIN_GRANT_MIN_MONTHS = 1;
export const ADMIN_GRANT_MAX_MONTHS = 24;
export const ADMIN_GRANT_NOTE_MAX_LENGTH = 500;
export const ADMIN_GRANT_PAGE_LIMIT = 20;
