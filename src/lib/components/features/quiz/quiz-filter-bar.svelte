<script lang="ts">
  import { dev } from "$app/environment";
  import { page as pageStore } from "$app/state";
  import Button from "$lib/components/ui/button/button.svelte";
  import ScrollArea from "$lib/components/ui/scroll-area/scroll-area.svelte";
  import { buildHref } from "$lib/utils/url";

  let { currentSort }: { currentSort: string | null } = $props();

  const sorts = $derived([
    { def: true, label: "Terbaru", value: "newest" },
    { def: false, label: "Terlama", value: "oldest" },
    { def: false, label: "Abjad A-Z", value: "alphabetical" },
    { def: false, label: "Abjad Z-A", value: "reverse-alphabetical" },
    ...(dev
      ? ([
          { def: false, label: "Dev: Empty", value: "empty" },
          { def: false, label: "Dev: Paginated", value: "paginated" },
          { def: false, label: "Dev: Unpaginated", value: "unpaginated" },
          { def: false, label: "Dev: 500", value: "500" },
        ] as const)
      : []),
  ]);
</script>

<ScrollArea orientation="horizontal">
  <div class="flex w-full flex-row gap-0">
    {#each sorts as sort (sort.value)}
      {@const isActive =
        currentSort === sort.value || (!currentSort && sort.def)}
      <Button
        variant={isActive ? "outline" : "ghost"}
        href={buildHref(pageStore.url.searchParams, {
          sort: sort.value,
          page: null,
        })}
      >
        {sort.label}
      </Button>
    {/each}
  </div>
</ScrollArea>
