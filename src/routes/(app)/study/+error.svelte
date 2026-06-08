<script lang="ts">
  import { page } from "$app/state";
  import ErrorPage from "$lib/components/features/app/error-page.svelte";
  import {
    Alert02Icon,
    LockIcon,
    Search02Icon,
  } from "$lib/components/features/icons";
  import type { IconSvgElement } from "@hugeicons/svelte";

  interface ErrorInfo {
    title: string;
    message: string;
    icon: IconSvgElement;
  }

  const errorMap: Record<number, ErrorInfo> = {
    403: {
      icon: LockIcon,
      message: "Anda tidak memiliki izin untuk mengakses sumber belajar ini.",
      title: "Akses ditolak",
    },
    404: {
      icon: Search02Icon,
      message: "Modul belajar yang Anda cari tidak ada atau telah dihapus.",
      title: "Modul belajar tidak ditemukan",
    },
    500: {
      icon: Alert02Icon,
      message: "Server mengalami masalah tak terduga. Coba beberapa saat lagi.",
      title: "Masalah internal server",
    },
  };

  const fallbackError: ErrorInfo = {
    icon: Alert02Icon,
    message: "Server mengalami masalah tak terduga. Coba beberapa saat lagi.",
    title: "Masalah internal server",
  };

  const friendlyError = $derived(errorMap[page.status] ?? fallbackError);
</script>

<ErrorPage
  error={friendlyError}
  status={page.status}
  customIcon={friendlyError.icon}
/>
