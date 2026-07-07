<script lang="ts">
  import AuthLayout from "$lib/components/features/auth/auth-layout.svelte";
  import SignUpForm from "$lib/components/sign-up-form.svelte";

  let { data } = $props();
</script>

<AuthLayout
  heading="Turn notes into practice"
  description="Create study sets, generate flashcards, and keep each practice session focused."
  gradient="bottom-right"
>
  <SignUpForm providers={data.oauthProviders} />
</AuthLayout>
