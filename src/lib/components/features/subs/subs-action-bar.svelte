<script lang="ts">
  import { page } from "$app/state";
  import { CrownIcon, PieChartIcon } from "$lib/components/features/icons";
  import Button from "$lib/components/ui/button/button.svelte";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  const isPlansActive = $derived(
    page.route.id?.startsWith("/(app)/subs/plans") ?? false
  );
  const isUsageActive = $derived(
    page.route.id?.startsWith("/(app)/subs/usage") ?? false
  );
  const isHidden = $derived(
    page.route.id?.startsWith("/(app)/subs/checkout") ?? false
  );
</script>

<div
  class="sticky bottom-0 z-50 flex justify-center pb-5 pt-3 data-[hidden=true]:hidden md:hidden"
  data-hidden={isHidden}
>
  <nav
    class="flex max-w-[calc(100%-2rem)] *:flex-1 items-center gap-1 overflow-x-auto rounded-full border border-border/50 bg-popover/90 p-1.5 text-popover-foreground shadow-[0_8px_32px_-12px_rgba(0,0,0,0.12)] backdrop-blur-xl"
    aria-label="Navigasi langganan"
  >
    <Button
      href="/subs/plans"
      variant={isPlansActive ? "secondary" : "ghost"}
      class="flex h-auto min-w-[3.5rem] flex-col gap-0.5 rounded-full px-3 py-2 text-[10px] font-medium transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.96]"
      aria-current={isPlansActive ? "page" : undefined}
    >
      <HugeiconsIcon icon={CrownIcon} class="size-5" strokeWidth={1.5} />
      Paket
    </Button>
    <Button
      href="/subs/usage"
      variant={isUsageActive ? "secondary" : "ghost"}
      class="flex h-auto min-w-[3.5rem] flex-col gap-0.5 rounded-full px-3 py-2 text-[10px] font-medium transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.96]"
      aria-current={isUsageActive ? "page" : undefined}
    >
      <HugeiconsIcon icon={PieChartIcon} class="size-5" strokeWidth={1.5} />
      Kuota
    </Button>
  </nav>
</div>
