<script lang="ts">
  import { Wallet01Icon } from "$lib/components/features/icons";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("id-ID", {
      currency: "IDR",
      minimumFractionDigits: 0,
      style: "currency",
    }).format(value);

  let {
    conversionCount,
    minimumPayoutLabel,
    pendingBalance,
    totalEarned,
    totalPaid,
  }: {
    conversionCount: number;
    minimumPayoutLabel: string;
    pendingBalance: number;
    totalEarned: number;
    totalPaid: number;
  } = $props();
</script>

<section class="mt-4 flex flex-col gap-3">
  <div class="rounded-2xl border border-border/60 bg-card p-5 md:p-6">
    <div class="flex items-center gap-4">
      <div
        class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-300"
      >
        <HugeiconsIcon icon={Wallet01Icon} class="size-4.5" />
      </div>
      <div class="min-w-0">
        <p class="text-[13px] text-muted-foreground">Saldo menunggu</p>
        <p
          class="truncate font-heading text-2xl font-semibold tracking-[-0.02em] tabular-nums md:text-3xl"
        >
          {formatCurrency(pendingBalance)}
        </p>
      </div>
    </div>
    <p class="mt-4 text-[13px] leading-relaxed text-muted-foreground">
      Komisi yang belum dibayarkan. Dicairkan setiap Jumat begitu saldo mencapai
      minimal {minimumPayoutLabel}.
    </p>
  </div>

  <div
    class="grid divide-y divide-border/60 rounded-2xl border border-border/60 bg-card md:grid-cols-3 md:divide-x md:divide-y-0"
  >
    <div class="p-5">
      <p class="text-[13px] text-muted-foreground">Total didapat</p>
      <p
        class="mt-1 font-heading text-xl font-semibold tracking-[-0.01em] tabular-nums"
      >
        {formatCurrency(totalEarned)}
      </p>
    </div>
    <div class="p-5">
      <p class="text-[13px] text-muted-foreground">Konversi</p>
      <p class="mt-1 font-heading text-xl font-semibold tabular-nums">
        {conversionCount}
        <span class="text-sm font-normal text-muted-foreground">langganan</span>
      </p>
    </div>
    <div class="p-5">
      <p class="text-[13px] text-muted-foreground">Sudah dibayar</p>
      <p
        class="mt-1 font-heading text-xl font-semibold tracking-[-0.01em] tabular-nums"
      >
        {formatCurrency(totalPaid)}
      </p>
    </div>
  </div>
</section>
