<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js";
  import { HugeiconsIcon } from "@hugeicons/svelte";
  import type { IconSvgElement } from "@hugeicons/svelte";

  let {
    icon,
    label,
    value,
    trend,
  }: {
    icon: IconSvgElement;
    label: string;
    value: number | string;
    trend?: string;
  } = $props();
</script>

<Card.Root class="p-0">
  <Card.Content class="flex items-start gap-4 p-5">
    <div
      class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10"
    >
      <HugeiconsIcon {icon} class="size-5 text-primary" />
    </div>
    <div class="flex min-w-0 flex-col gap-1">
      <span class="text-sm text-muted-foreground">{label}</span>
      <span class="text-2xl font-bold tracking-tight">{value}</span>
      {#if trend}
        <span class="text-xs text-muted-foreground">{trend}</span>
      {/if}
    </div>
  </Card.Content>
</Card.Root>
