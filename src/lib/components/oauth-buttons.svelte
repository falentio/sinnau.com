<script lang="ts">
  import { authClient } from "$lib/hooks/auth.svelte";
  import { GithubIcon, GoogleIcon } from "@hugeicons/core-free-icons";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  import Button from "./ui/button/button.svelte";

  let { providers = [] }: { providers?: ("google" | "github")[] } = $props();

  let pendingProvider = $state<"google" | "github" | null>(null);

  const labels = {
    github: "GitHub",
    google: "Google",
  } as const;

  const signIn = async (provider: "google" | "github") => {
    pendingProvider = provider;
    await authClient.signIn.social({
      callbackURL: "/",
      provider,
    });
  };

  const icons = {
    github: GithubIcon,
    google: GoogleIcon,
  } as const;
</script>

{#if providers.length > 0}
  <div
    class="relative my-2 text-center text-xs uppercase text-muted-foreground"
  >
    <span class="bg-background px-2">Atau</span>
  </div>

  <div class="grid gap-3">
    {#each providers as provider (provider)}
      <Button
        variant="outline"
        onclick={() => signIn(provider)}
        disabled={pendingProvider !== null}
      >
        <HugeiconsIcon icon={icons[provider]} /> {labels[provider]}</Button
      >
    {/each}
  </div>
{/if}
