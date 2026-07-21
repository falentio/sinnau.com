<script lang="ts">
  import AuthLayout from "$lib/components/features/auth/auth-layout.svelte";
  import SeoHead from "$lib/components/seo-head.svelte";
  import SignUpForm from "$lib/components/sign-up-form.svelte";

  let { data } = $props();
</script>

<SeoHead
  title="Daftar Sinnau — Ubah Catatan Kuliah Jadi Nilai Bagus"
  description="Daftar gratis sinnau. Ubah PDF catatan kuliah jadi flashcard dan quiz interaktif dengan AI spaced repetition (FSRS). Belajar lebih efisien, raih IPK terbaikmu."
  robots="noindex"
/>

<AuthLayout
  heading="Mulai perjalanan belajarmu"
  description="Ubah catatan kuliah jadi nilai bagus."
  gradient="bottom-right"
>
  <SignUpForm providers={data.oauthProviders} />
</AuthLayout>
