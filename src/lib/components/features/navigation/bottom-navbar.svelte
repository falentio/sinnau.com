<script lang="ts">
  import { page } from "$app/state";
  import {
    AiBeautifyIcon,
    Book03Icon,
    CrownIcon,
    Home01Icon,
    Search02Icon,
  } from "$lib/components/features/icons";
  import Button from "$lib/components/ui/button/button.svelte";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  const isHomeActive = $derived(page.route.id === "/(app)/home");
  const isDiscoverActive = $derived(
    page.route.id?.startsWith("/(app)/discover") ?? false
  );
  const isPremiumActive = $derived(
    page.route.id?.startsWith("/(app)/subs/") ?? false
  );
</script>

<div
  class="sticky bottom-0 z-50 hidden justify-center pb-5 pt-3 group-has-data-[showbottombar=true]/app:flex"
>
  <nav
    class="flex max-w-[calc(100%-2rem)] *:flex-1 items-center gap-1 overflow-x-auto rounded-full border border-border/50 bg-popover/90 p-1.5 text-popover-foreground shadow-[0_8px_32px_-12px_rgba(0,0,0,0.12)] backdrop-blur-xl"
    aria-label="Navigasi utama"
  >
    <Button
      href="/home/"
      variant={isHomeActive ? "secondary" : "ghost"}
      class="flex h-auto min-w-[3.5rem] flex-col gap-0.5 rounded-full px-3 py-2 text-[10px] font-medium transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.96]"
      aria-current={isHomeActive ? "page" : undefined}
    >
      <HugeiconsIcon icon={Home01Icon} class="size-5" strokeWidth={1.5} />
      Beranda
    </Button>

    <Button
      href="/discover/"
      variant={isDiscoverActive ? "secondary" : "ghost"}
      class="flex h-auto min-w-[3.5rem] flex-col gap-0.5 rounded-full px-3 py-2 text-[10px] font-medium transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.96]"
      aria-current={isDiscoverActive ? "page" : undefined}
    >
      <HugeiconsIcon icon={Search02Icon} class="size-5" strokeWidth={1.5} />
      Jelajahi
    </Button>

    <Button
      variant="default"
      class="flex h-auto min-w-[3.5rem] flex-col gap-0.5 rounded-full px-3 py-2 text-[10px] font-medium transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.96]"
      aria-label="AI Studio"
    >
      <HugeiconsIcon icon={AiBeautifyIcon} class="size-5" strokeWidth={1.5} />
      Generate
    </Button>

    <Button
      variant="ghost"
      class="flex h-auto min-w-[3.5rem] flex-col gap-0.5 rounded-full px-3 py-2 text-[10px] font-medium transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.96]"
      aria-label="Perpustakaan"
    >
      <HugeiconsIcon icon={Book03Icon} class="size-5" strokeWidth={1.5} />
      Pustaka
    </Button>

    <Button
      href="/subs/plans/"
      variant={isPremiumActive ? "secondary" : "ghost"}
      class="flex h-auto min-w-[3.5rem] flex-col gap-0.5 rounded-full px-3 py-2 text-[10px] font-medium transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.96]"
      aria-current={isPremiumActive ? "page" : undefined}
    >
      <HugeiconsIcon icon={CrownIcon} class="size-5" strokeWidth={1.5} />
      Premium
    </Button>
  </nav>
</div>
