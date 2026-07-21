<script lang="ts">
  import AuthLayout from "$lib/components/features/auth/auth-layout.svelte";
  import LoginForm from "$lib/components/login-form.svelte";

  let { data } = $props();
</script>

<AuthLayout
  heading="Belajar lebih pintar dengan Sinnau"
  description="Lanjutkan dari tempat kamu berhenti."
  gradient="top-left"
>
  <LoginForm providers={data.oauthProviders} />
</AuthLayout>
