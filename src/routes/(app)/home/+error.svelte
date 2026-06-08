<script lang="ts">
  import { page } from "$app/state";
  import ErrorPage from "$lib/components/features/app/error-page.svelte";

  const errorMap: Record<string, { title: string; message: string }> = {
    INTERNAL_SERVER_ERROR: {
      message:
        "Server mengalami masalah yang tak terduga. Coba beberapa saat lagi.",
      title: "Masalah Internal Server",
    },
    "filter unknown": {
      message:
        "Filter yang dipilih tidak dikenali. Silakan pilih filter yang tersedia.",
      title: "Filter tidak valid",
    },
    "invalid query": {
      message:
        "Parameter yang diberikan tidak sesuai. Silakan periksa halaman atau filter yang dipilih.",
      title: "Permintaan tidak valid",
    },
  };

  const friendlyError = $derived(
    errorMap[page.error?.message ?? ""] ??
      errorMap[page.error?.code ?? ""] ?? {
        message: page.error?.message ?? "Terjadi kesalahan. Coba lagi nanti.",
        title: "Terjadi kesalahan",
      }
  );
</script>

<ErrorPage error={friendlyError} status={page.status} />
