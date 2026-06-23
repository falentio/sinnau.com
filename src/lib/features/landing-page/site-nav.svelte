<script lang="ts">
  import { ArrowRight01Icon } from "$lib/components/features/icons";
  import Button from "$lib/components/ui/button/button.svelte";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  import Wordmark from "./wordmark.svelte";

  interface Props {
    user: { id: string; name?: string | null } | null | undefined;
  }
  let { user }: Props = $props();

  const links = [
    { href: "/#features", label: "Fitur" },
    { href: "/#how-it-works", label: "Cara kerja" },
    { href: "/#retention", label: "Retensi" },
    { href: "/#faq", label: "FAQ" },
  ];
</script>

<header
  class="sticky top-0 z-40 w-full border-b border-[var(--landing-border)]/50 backdrop-blur-xl"
>
  <div
    class="mx-auto flex w-full max-w-[1240px] items-center justify-between gap-6 px-5 py-3.5 sm:px-8"
  >
    <div class="flex items-center gap-8">
      <Wordmark />
      <nav
        class="hidden items-center gap-0.5 md:flex"
        aria-label="Main navigation"
      >
        {#each links as link (link.href)}
          <a
            href={link.href}
            class="rounded-md px-3 py-1.5 text-[13px] text-[var(--landing-muted)] transition-colors hover:text-[var(--landing-fg)]"
          >
            {link.label}
          </a>
        {/each}
      </nav>
    </div>

    <div class="flex items-center gap-2">
      {#if user}
        <Button href="/home/" variant="ghost" size="sm">Dasbor</Button>
        <Button href="/study/new/" size="sm">Buat modul</Button>
      {:else}
        <Button href="/login/" variant="ghost" size="sm">Masuk</Button>
        <Button href="/login/" size="sm">
          Mulai gratis
          <HugeiconsIcon icon={ArrowRight01Icon} data-icon="inline-end" />
        </Button>
      {/if}
    </div>
  </div>
</header>

<style>
  header {
    background-color: color-mix(in oklch, var(--landing-bg) 75%, transparent);
  }
</style>
