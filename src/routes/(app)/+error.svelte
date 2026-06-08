<script lang="ts">
  import { page } from "$app/state";
  import ErrorPage from "$lib/components/features/app/error-page.svelte";

  const errorMap: Record<number, { title: string; message: string }> = {
    500: {
      message: "Server mengalami masalah tak terduga. Coba beberapa saat lagi.",
      title: "Masalah internal server",
    },
  };

  const fallbackError = {
    message: "Server mengalami masalah tak terduga. Coba beberapa saat lagi.",
    title: "Masalah internal server",
  };

  const friendlyError = $derived(errorMap[page.status] ?? fallbackError);
</script>

<ErrorPage error={friendlyError} status={page.status} />
