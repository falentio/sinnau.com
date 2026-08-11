<script lang="ts">
  import { ArrowRight01Icon } from "$lib/components/features/icons";
  import { PlanStatusBadge, formatIdr } from "$lib/components/features/plan";
  import { PLAN_KEYS } from "$lib/schemas/plan.constant";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  type OrderStatus = "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";
  interface Order {
    id: string;
    planKey: (typeof PLAN_KEYS)[number];
    planName: string;
    durationMonths: 1 | 6 | 12;
    grossAmount: number;
    createdAt: Date;
    status: OrderStatus;
  }

  let { order }: { order: Order } = $props();

  const dateLabel = $derived(
    order.createdAt.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  );
  const sku = $derived(
    `${order.planKey.toLowerCase()}-${order.durationMonths}m`
  );
  const isLinkable = $derived(
    order.status === "PENDING" || order.status === "EXPIRED"
  );
</script>

{#snippet rowContent()}
  <div
    class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.04] font-heading text-xs font-semibold tabular-nums text-foreground/80"
  >
    {order.durationMonths}
    <span
      class="ml-0.5 text-[9px] font-medium uppercase tracking-[0.04em] text-muted-foreground"
    >
      bln
    </span>
  </div>

  <div class="flex min-w-0 flex-1 flex-col gap-0.5">
    <div class="flex items-center gap-2">
      <h3 class="truncate text-sm font-medium leading-5 text-foreground">
        {order.planName}
      </h3>
      <span class="text-xs text-muted-foreground">·</span>
      <span class="text-xs text-muted-foreground tabular-nums">
        {order.durationMonths} bulan
      </span>
    </div>
    <p class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span class="font-mono tracking-tight">{sku}</span>
      <span class="text-foreground/20">·</span>
      <span>{dateLabel}</span>
    </p>
  </div>

  <div class="flex shrink-0 items-center gap-2.5 sm:gap-3">
    <PlanStatusBadge status={order.status} class="hidden md:inline-flex" />
    <span
      class="font-heading text-sm font-semibold tabular-nums tracking-tight text-foreground"
    >
      {formatIdr(order.grossAmount)}
    </span>
    {#if isLinkable}
      <HugeiconsIcon
        icon={ArrowRight01Icon}
        class="size-4 text-muted-foreground/50 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5 group-hover:text-muted-foreground"
      />
    {/if}
  </div>
{/snippet}

{#if isLinkable}
  <a
    href={`/subs/checkout/${order.id}`}
    class="group flex items-center gap-3 border-b border-border/60 bg-card px-4 py-3.5 transition-colors last:border-b-0 hover:bg-muted/40 md:gap-4 md:px-6 md:py-4"
  >
    {@render rowContent()}
  </a>
{:else}
  <div
    class="flex items-center gap-3 border-b border-border/60 bg-card px-4 py-3.5 last:border-b-0 md:gap-4 md:px-6 md:py-4"
  >
    {@render rowContent()}
  </div>
{/if}
