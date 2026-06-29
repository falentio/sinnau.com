<script lang="ts">
  import { dev } from "$app/environment";
  import { page as pageStore } from "$app/state";
  import { AiBeautifyIcon } from "$lib/components/features/icons";
  import Button from "$lib/components/ui/button/button.svelte";
  import ScrollArea from "$lib/components/ui/scroll-area/scroll-area.svelte";
  import { buildHref } from "$lib/utils/url";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  let { currentFilter }: { currentFilter: string | null } = $props();

  const filters = $derived([
    { def: true, label: "Terbaru", value: "latest" },
    { def: false, label: "Baru dibuka", value: "newly-opened" },
    ...(dev
      ? ([
          { def: false, label: "Dev: Empty", value: "empty" },
          { def: false, label: "Dev: Invalid Filter", value: "invalid" },
          { def: false, label: "Dev: Paginated", value: "paginated" },
          { def: false, label: "Dev: Unpaginated", value: "unpaginated" },
          { def: false, label: "Dev: Internal Server Error", value: "500" },
        ] as const)
      : []),
  ]);
</script>

<ScrollArea orientation="horizontal">
  <div class="my-3 flex w-full flex-row gap-0">
    {#each filters as filter (filter.value)}
      {@const isActive =
        currentFilter === filter.value || (!currentFilter && filter.def)}
      <Button
        variant={isActive ? "outline" : "ghost"}
        href={buildHref(pageStore.url.searchParams, { filter: filter.value })}
      >
        {filter.label}
      </Button>
    {/each}
    {#if dev}
      <Button
        variant="ghost"
        href={buildHref(pageStore.url.searchParams, { page: "-5" })}
      >
        Dev: Invalid page
      </Button>
    {/if}
    <span class="flex-auto"></span>
    <div class="sticky right-0 bg-background px-1">
      <Button variant="outline" size="icon-sm"
        ><HugeiconsIcon icon={AiBeautifyIcon} /></Button
      >
    </div>
  </div>
</ScrollArea>
