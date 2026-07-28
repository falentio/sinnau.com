<script lang="ts">
  import {
    GithubIcon,
    GoogleIcon,
    LockPasswordIcon,
  } from "$lib/components/features/icons";
  import ProfileNameForm from "$lib/components/features/profile/profile-name-form.svelte";
  import ProfilePasswordForm from "$lib/components/features/profile/profile-password-form.svelte";
  import UserAvatar from "$lib/components/features/users/user-avatar.svelte";
  import SeoHead from "$lib/components/seo-head.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import { authClient, getUser } from "$lib/hooks/auth.svelte";
  import { getErrorMessage } from "$lib/utils/error-messages";
  import { HugeiconsIcon } from "@hugeicons/svelte";
  import { toast } from "svelte-sonner";

  import type { PageData } from "./$types";

  type LinkedAccount = NonNullable<
    Awaited<ReturnType<typeof authClient.listAccounts>>["data"]
  >[number];

  let { data }: { data: PageData } = $props();

  const user = getUser;

  let accounts = $state<LinkedAccount[] | null>(null);
  let pendingProvider = $state<string | null>(null);

  const loadAccounts = async () => {
    const { data: listed } = await authClient.listAccounts();
    accounts = listed ?? [];
  };

  $effect(() => {
    void (async () => {
      await loadAccounts();
    })();
  });

  const hasPassword = $derived(
    accounts?.some((a) => a.providerId === "credential") ?? null
  );

  const linkedProviders = $derived(
    new Set((accounts ?? []).map((a) => a.providerId))
  );

  const providerLabels: Record<"google" | "github", string> = {
    github: "GitHub",
    google: "Google",
  };

  const providerIcons = {
    github: GithubIcon,
    google: GoogleIcon,
  } as const;

  const linkProvider = async (provider: "google" | "github") => {
    pendingProvider = provider;
    try {
      const { error } = await authClient.linkSocial({
        callbackURL: "/profile",
        provider,
      });
      if (error) {
        toast.error(getErrorMessage(error), { position: "top-right" });
      }
    } catch (error) {
      toast.error(getErrorMessage(error as { message?: string }), {
        position: "top-right",
      });
    } finally {
      pendingProvider = null;
    }
  };
</script>

<SeoHead
  title="Profil · sinnau"
  description="Kelola profil akun Sinnau-mu. Ubah nama tampilan, metode masuk, dan kata sandi di satu tempat."
  robots="noindex"
/>

<div class="mx-auto w-full max-w-3xl px-6 py-10 md:py-14">
  <h1
    class="font-heading text-2xl font-semibold tracking-[-0.02em] text-foreground md:text-3xl"
  >
    Profil
  </h1>

  <section class="mt-8 flex flex-col gap-4">
    <h2 class="text-sm font-semibold text-foreground">Identitas</h2>

    <div class="flex items-center gap-3">
      <UserAvatar
        name={user()?.name ?? ""}
        userId={user()?.id ?? ""}
        class="size-12"
      />
      <div class="flex flex-col">
        <span class="text-sm font-medium text-foreground">
          {user()?.name ?? "Pengguna"}
        </span>
        <span class="text-xs text-muted-foreground">
          {user()?.email ?? ""}
        </span>
      </div>
    </div>

    <ProfileNameForm />
  </section>

  <section class="mt-8 flex flex-col gap-4 border-t border-border/60 pt-8">
    <h2 class="text-sm font-semibold text-foreground">Metode masuk</h2>

    {#if accounts === null}
      <p class="text-sm text-muted-foreground">Memuat...</p>
    {:else}
      <div class="flex flex-col divide-y divide-border/60">
        {#if hasPassword}
          <div class="flex items-center gap-3 py-3">
            <HugeiconsIcon
              icon={LockPasswordIcon}
              class="size-4 text-muted-foreground"
            />
            <span class="flex-1 text-sm text-foreground">
              Email & kata sandi
            </span>
            <span class="text-xs text-muted-foreground">Terhubung</span>
          </div>
        {/if}
        {#each data.oauthProviders as provider (provider)}
          <div class="flex items-center gap-3 py-3">
            <HugeiconsIcon
              icon={providerIcons[provider]}
              class="size-4 text-muted-foreground"
            />
            <span class="flex-1 text-sm text-foreground">
              {providerLabels[provider]}
            </span>
            {#if linkedProviders.has(provider)}
              <span class="text-xs text-muted-foreground">Terhubung</span>
            {:else}
              <Button
                variant="outline"
                size="sm"
                disabled={pendingProvider !== null}
                onclick={() => linkProvider(provider)}
              >
                Hubungkan
              </Button>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <section class="mt-8 flex flex-col gap-4 border-t border-border/60 pt-8">
    <h2 class="text-sm font-semibold text-foreground">Kata sandi</h2>

    {#if hasPassword === null}
      <p class="text-sm text-muted-foreground">Memuat...</p>
    {:else if hasPassword}
      <ProfilePasswordForm />
    {:else}
      <p class="text-sm text-muted-foreground">
        Akunmu tidak punya kata sandi karena masuk lewat metode lain, misalnya
        Google atau GitHub.
      </p>
    {/if}
  </section>
</div>
