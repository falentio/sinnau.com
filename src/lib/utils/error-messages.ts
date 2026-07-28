import { ORPCError } from "@orpc/client";

const ORPC_ERROR_MESSAGES: Record<string, string> = {
  AFFILIATE_ALREADY_APPROVED: "Profil afiliasi sudah disetujui sebelumnya.",
  AFFILIATE_APPLICATION_NOT_PENDING:
    "Aplikasi sudah tidak dalam status menunggu.",
  AFFILIATE_APPLICATION_PENDING:
    "Kamu sudah punya aplikasi yang sedang diproses.",
  AFFILIATE_NO_PENDING_BALANCE: "Tidak ada saldo tertunda untuk dicairkan.",
  AFFILIATE_NO_PROFILE: "Kamu belum punya profil afiliasi.",
  AFFILIATE_RECONCILE_BEFORE_PAYOUT:
    "Komisi perlu direkonsiliasi sebelum pencairan.",
  AFFILIATE_SELF_REFERRAL: "Tidak bisa merujuk diri sendiri.",
  AFFILIATE_SLUG_CONFLICT: "Nama tautan afiliasi sudah dipakai orang lain.",
  AI_LIMIT_ALREADY_REFUNDED: "Penggunaan ini sudah dikembalikan sebelumnya.",
  AI_LIMIT_EXCEEDED: "Batas penggunaan AI untuk periode ini sudah tercapai.",
  CHAPTER_NOT_EMPTY: "Bab masih berisi konten. Hapus isinya terlebih dahulu.",
  CHAPTER_SLUG_CONFLICT: "Nama bab sudah ada. Coba nama lain.",
  FORBIDDEN: "Kamu tidak punya izin untuk melakukan ini.",
  INTERNAL_SERVER_ERROR:
    "Terjadi kesalahan di sisi kami. Coba lagi beberapa saat.",
  NOT_FOUND: "Data yang dicari tidak ditemukan.",
  NO_ACTIVE_PLAN: "Kamu belum punya paket aktif.",
  SESSION_ALREADY_COMPLETED: "Sesi ini sudah selesai dan tidak bisa diubah.",
  STUDY_SET_SLUG_CONFLICT: "Nama modul sudah dipakai. Coba nama lain.",
  UNAUTHORIZED: "Sesi berakhir. Silakan masuk kembali.",
  VALIDATION_FAILED: "Data yang dikirim tidak valid. Periksa kembali.",
};

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "Email already in use": "Email sudah terdaftar. Coba masuk.",
  "Failed to check password. Please try again later.":
    "Gagal memverifikasi kata sandi. Coba lagi sebentar.",
  "Internal Server Error": "Terjadi kesalahan. Coba lagi sebentar.",
  "Invalid email or password": "Email atau kata sandi salah.",
  "Session is not fresh. Please sign in again.":
    "Sesi sudah kedaluwarsa. Silakan masuk kembali.",
  "Too many requests. Please try again later.":
    "Terlalu banyak percobaan. Coba lagi sebentar.",
  "User not found": "Akun tidak ditemukan.",
};

const FALLBACK_MESSAGE = "Terjadi kesalahan. Coba lagi sebentar.";

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof ORPCError) {
    return ORPC_ERROR_MESSAGES[String(error.code)] ?? FALLBACK_MESSAGE;
  }

  if (error instanceof Error) {
    return AUTH_ERROR_MESSAGES[error.message] ?? FALLBACK_MESSAGE;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return AUTH_ERROR_MESSAGES[error.message] ?? FALLBACK_MESSAGE;
  }

  return FALLBACK_MESSAGE;
};
