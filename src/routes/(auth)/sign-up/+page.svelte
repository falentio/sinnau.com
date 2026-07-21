<script lang="ts">
  import AuthLayout from "$lib/components/features/auth/auth-layout.svelte";
  import SignUpForm from "$lib/components/sign-up-form.svelte";

  let { data } = $props();
</script>

<AuthLayout
  heading="Mulai perjalanan belajarmu"
  description="Ubah catatan kuliah jadi nilai bagus."
  gradient="bottom-right"
>
  <SignUpForm providers={data.oauthProviders} />
</AuthLayout>
