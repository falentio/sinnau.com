<script lang="ts">
  import AuthLayout from "$lib/components/features/auth/auth-layout.svelte";
  import LoginForm from "$lib/components/login-form.svelte";

  let { data } = $props();
</script>

<AuthLayout
  heading="Study smarter with Sinnau"
  description="Create focused study sets, practice with flashcards, and keep your learning moving."
  gradient="top-left"
>
  <LoginForm providers={data.oauthProviders} />
</AuthLayout>
