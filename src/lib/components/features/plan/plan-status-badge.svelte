<script lang="ts">
  import Badge from "$lib/components/ui/badge/badge.svelte";
  import type { BadgeVariant } from "$lib/components/ui/badge/badge.svelte";

  type OrderStatus = "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";

  const meta: Record<
    OrderStatus,
    { label: string; tone: BadgeVariant; ring: string; dot: string }
  > = {
    CANCELLED: {
      dot: "bg-zinc-400",
      label: "Dibatalkan",
      ring: "ring-zinc-500/20",
      tone: "outline",
    },
    EXPIRED: {
      dot: "bg-zinc-400",
      label: "Kedaluwarsa",
      ring: "ring-zinc-500/20",
      tone: "outline",
    },
    PAID: {
      dot: "bg-emerald-500",
      label: "Aktif",
      ring: "ring-emerald-500/20",
      tone: "secondary",
    },
    PENDING: {
      dot: "bg-amber-500",
      label: "Menunggu",
      ring: "ring-amber-500/25",
      tone: "outline",
    },
  };

  let {
    status,
    class: className = "",
  }: { status: OrderStatus; class?: string } = $props();

  const m = $derived(meta[status]);
</script>

<Badge
  variant={m.tone}
  class="h-6 gap-1.5 rounded-full border-transparent px-2.5 text-[11px] font-medium tracking-[0.04em] ring-1 ring-inset {m.ring} {className}"
>
  <span class="size-1.5 rounded-full {m.dot}"></span>
  {m.label}
</Badge>
