<script lang="ts">
  import { page } from "$app/state";
  import ErrorPage from "$lib/components/features/app/error-page.svelte";

  const errorMap: Record<string, { title: string; message: string }> = {
    INTERNAL_SERVER_ERROR: {
      message:
        "Maaf, terjadi kesalahan di sisi kami. Tim kami sudah mendapat notifikasi. Coba lagi beberapa saat.",
      title: "Ada yang tidak beres",
    },
    "filter unknown": {
      message: "Filter ini tidak tersedia. Coba pilih filter lain.",
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
