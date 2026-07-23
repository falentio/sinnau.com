<script lang="ts">
  import {
    ArrowLeft01Icon,
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

  const getErrorMessage = (error: { message?: string } | null | undefined) => {
    if (error?.message) {
      return error.message;
    }
    return "Metode masuk belum bisa diubah. Coba lagi sebentar.";
  };

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

  const unlinkProvider = async (provider: "google" | "github") => {
    pendingProvider = provider;
    try {
      const { error } = await authClient.unlinkAccount({
        providerId: provider,
      });
      if (error) {
        toast.error(getErrorMessage(error), { position: "top-right" });
        return;
      }
      toast.success("Metode masuk berhasil diputus.", {
        position: "top-right",
      });
      await loadAccounts();
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

<div class="mx-auto w-full max-w-3xl px-6 pt-10 md:pt-14">
  <div class="mb-6 md:mb-8">
    <a
      href="/home"
      class="group inline-flex h-8 items-center gap-1.5 rounded-full px-2 text-sm text-muted-foreground transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-foreground"
    >
      <HugeiconsIcon
        icon={ArrowLeft01Icon}
        class="size-3.5 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-x-0.5"
      />
      Kembali ke beranda
    </a>
  </div>

  <header class="flex flex-col gap-2 pb-10 md:pb-12">
    <span
      class="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
    >
      Akun
    </span>
    <h1
      class="font-heading text-3xl font-semibold tracking-[-0.025em] text-foreground md:text-4xl"
    >
      Profil
    </h1>
    <p class="max-w-md text-[15px] leading-relaxed text-muted-foreground">
      Kelola nama tampilan, metode masuk, dan kata sandi akunmu.
    </p>
  </header>

  <section class="flex flex-col gap-4 pb-12">
    <header class="flex flex-col gap-1">
      <span
        class="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
      >
        Informasi akun
      </span>
      <h2
        class="font-heading text-2xl font-semibold tracking-[-0.02em] text-foreground md:text-3xl"
      >
        Identitas
      </h2>
    </header>

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

  <section class="flex flex-col gap-4 border-t border-border/60 py-12">
    <header class="flex flex-col gap-1">
      <span
        class="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
      >
        Metode masuk
      </span>
      <h2
        class="font-heading text-2xl font-semibold tracking-[-0.02em] text-foreground md:text-3xl"
      >
        Akun terhubung
      </h2>
      <p class="text-sm text-muted-foreground">
        Beberapa cara masuk bisa terhubung ke satu akun.
      </p>
    </header>

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
              <Button
                variant="outline"
                size="sm"
                disabled={pendingProvider !== null}
                onclick={() => unlinkProvider(provider)}
              >
                Putuskan
              </Button>
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

  <section class="flex flex-col gap-4 border-t border-border/60 pt-12 pb-16">
    <header class="flex flex-col gap-1">
      <span
        class="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
      >
        Keamanan
      </span>
      <h2
        class="font-heading text-2xl font-semibold tracking-[-0.02em] text-foreground md:text-3xl"
      >
        Kata sandi
      </h2>
      <p class="text-sm text-muted-foreground">
        Gunakan minimal 8 karakter agar akunmu tetap aman.
      </p>
    </header>

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
