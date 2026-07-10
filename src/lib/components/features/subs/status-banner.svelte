<script lang="ts">
  import {
    Tick02Icon,
    Alert02Icon,
    Cancel01Icon,
  } from "$lib/components/features/icons";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  type OrderStatus = "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";

  let { status }: { status: OrderStatus } = $props();

  const meta = {
    CANCELLED: {
      accent: "text-muted-foreground",
      bg: "bg-muted/40 border-border/60",
      body: "Pesanan ini tidak dilanjutkan. Tidak ada paket yang diaktifkan.",
      icon: Cancel01Icon,
      label: "Pesanan dibatalkan",
    },
    EXPIRED: {
      accent: "text-amber-700 dark:text-amber-400",
      bg: "bg-amber-500/[0.06] border-amber-500/20",
      body: "Pesanan ini sudah lewat masa tunggu. Buat pesanan baru dari halaman paket.",
      icon: Alert02Icon,
      label: "Pesanan kedaluwarsa",
    },
    PAID: {
      accent: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-500/[0.06] border-emerald-500/20",
      body: "Paket kamu sudah aktif. Kuota generate sudah ditambahkan.",
      icon: Tick02Icon,
      label: "Pembayaran berhasil",
    },
    PENDING: {
      accent: "text-muted-foreground",
      bg: "bg-muted/40 border-border/60",
      body: "",
      icon: Tick02Icon,
      label: "",
    },
  } as const;

  const m = $derived(meta[status]);
</script>

{#if status !== "PENDING"}
  <div class="flex items-start gap-3 rounded-2xl border px-4 py-3 {m.bg}">
    <div
      class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-background/60 {m.accent}"
    >
      <HugeiconsIcon icon={m.icon} class="size-4" strokeWidth={1.75} />
    </div>
    <div class="flex flex-col gap-0.5">
      <span class="text-sm font-medium text-foreground">{m.label}</span>
      <span class="text-[13px] leading-relaxed text-muted-foreground">
        {m.body}
      </span>
    </div>
  </div>
{/if}
