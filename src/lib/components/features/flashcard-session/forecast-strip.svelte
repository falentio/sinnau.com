<script lang="ts">
  import type { DueIn7DaysItem } from "$lib/schemas/flashcard-session";
  import { formatShortDate } from "$lib/utils/flashcard-session";

  interface Props {
    dueIn7Days: DueIn7DaysItem[];
  }
  let { dueIn7Days }: Props = $props();

  const maxCount = $derived(Math.max(1, ...dueIn7Days.map((d) => d.count)));
</script>

<section class="flex flex-col gap-3">
  <div class="flex items-baseline justify-between">
    <h2 class="text-sm font-medium text-foreground">7 hari ke depan</h2>
    <span class="text-xs text-muted-foreground"
      >Kartu yang akan jatuh tempo</span
    >
  </div>
  <ol class="grid grid-cols-7 gap-1.5">
    {#each dueIn7Days as item, i (item.date)}
      <li class="flex flex-col items-center gap-1.5">
        <div
          class="flex h-20 w-full items-end overflow-hidden rounded-md border border-border bg-muted/40"
        >
          <div
            class="w-full bg-foreground/80 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style="height: {Math.max(4, (item.count / maxCount) * 100)}%"
            aria-hidden="true"
          ></div>
        </div>
        <span class="text-[10px] tabular-nums text-muted-foreground">
          {i === 0 ? "Bsk" : formatShortDate(item.date).split(" ")[0]}
        </span>
        <span class="text-[10px] font-medium tabular-nums text-foreground">
          {item.count}
        </span>
      </li>
    {/each}
  </ol>
</section>
