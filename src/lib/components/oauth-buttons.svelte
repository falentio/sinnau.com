<script lang="ts">
  import { authClient } from "$lib/hooks/auth.svelte";

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
</script>

{#if providers.length > 0}
  <div
    class="relative my-2 text-center text-xs uppercase text-muted-foreground"
  >
    <span class="bg-background px-2">Atau</span>
  </div>

  <div class="grid gap-3">
    {#each providers as provider (provider)}
      <button
        type="button"
        onclick={() => signIn(provider)}
        disabled={pendingProvider !== null}
        class="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-input bg-background text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
      >
        Lanjut dengan {labels[provider]}
      </button>
    {/each}
  </div>
{/if}
