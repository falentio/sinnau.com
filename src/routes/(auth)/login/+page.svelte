<script lang="ts">
  import AuthLayout from "$lib/components/features/auth/auth-layout.svelte";
  import LoginForm from "$lib/components/login-form.svelte";
  import SeoHead from "$lib/components/seo-head.svelte";

  let { data } = $props();
</script>

<SeoHead
  title="Masuk · Sinnau"
  description="Lanjutkan belajar dari tempat kamu berhenti. Masuk ke Sinnau untuk mengulang materi kuliah dari PDF dengan kartu flash pintar dan sistem pengulangan berbasis AI."
  robots="noindex"
/>

<AuthLayout
  heading="Belajar lebih pintar dengan Sinnau"
  description="Lanjutkan dari tempat kamu berhenti."
  gradient="top-left"
>
  <LoginForm providers={data.oauthProviders} />
</AuthLayout>
