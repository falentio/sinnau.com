<script lang="ts">
  import { page } from "$app/stores";
  import {
    ArrowLeft01Icon,
    ArrowRight01Icon,
  } from "$lib/components/features/icons";
  import { formatIdr } from "$lib/components/features/plan";
  import ExpiryCountdown from "$lib/components/features/subs/expiry-countdown.svelte";
  import QrisDisplay from "$lib/components/features/subs/qris-display.svelte";
  import StatusBanner from "$lib/components/features/subs/status-banner.svelte";
  import { PLAN_NAME } from "$lib/schemas/plan.constant";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let orderId = $derived($page.params.orderId);
</script>

<svelte:head>
  <title>Selesaikan pembayaran · Sinnau</title>
</svelte:head>

<div class="mx-auto w-full max-w-5xl px-6 pt-8 md:pt-10">
  <div class="mb-6 md:mb-8">
    <a
      href="/subs/plans"
      class="group inline-flex h-8 items-center gap-1.5 rounded-full px-2 text-sm text-muted-foreground transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:text-foreground"
    >
      <HugeiconsIcon
        icon={ArrowLeft01Icon}
        class="size-3.5 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-x-0.5"
      />
      Kembali ke paket
    </a>
  </div>

  <header class="flex flex-col gap-2 pb-8 md:pb-10">
    <span
      class="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
    >
      Pembayaran
    </span>
    <h1
      class="font-heading text-2xl font-semibold tracking-[-0.025em] text-foreground md:text-3xl"
    >
      Selesaikan pembayaran
    </h1>
    <p class="max-w-md text-[15px] leading-relaxed text-muted-foreground">
      Scan QR di bawah ini dari aplikasi bank atau e-wallet kamu. Pembayaran
      akan diverifikasi otomatis.
    </p>
  </header>

  <div class="grid grid-cols-1 gap-6 pb-16 md:grid-cols-12 md:gap-8">
    <section
      class="md:col-span-7 md:row-span-2 flex flex-col items-center gap-5 rounded-3xl border border-border/60 bg-card p-6 ring-1 ring-foreground/[0.04] md:p-10"
    >
      <StatusBanner status={data.order.status} />

      {#if data.order.qrUrl}
        <QrisDisplay
          qrUrl={data.order.qrUrl}
          alt={`QRIS untuk ${PLAN_NAME[data.order.planKey]} ${data.order.durationMonths} bulan`}
        />
      {:else if data.order.status === "PENDING"}
        <div
          class="flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-muted/30 px-6 py-8 text-center"
        >
          <span class="text-sm text-muted-foreground">
            QR tidak tersedia. Buat pesanan baru dari halaman paket.
          </span>
        </div>
      {/if}

      {#if data.order.expiresAt && data.order.status === "PENDING"}
        <ExpiryCountdown expiresAt={data.order.expiresAt} />
      {/if}
    </section>

    <section
      class="md:col-span-5 flex flex-col gap-5 rounded-3xl border border-border/60 bg-card p-6 ring-1 ring-foreground/[0.04] md:p-7"
    >
      <div class="flex flex-col gap-1">
        <span
          class="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
        >
          Ringkasan
        </span>
        <h2
          class="font-heading text-xl font-semibold tracking-[-0.02em] text-foreground"
        >
          {PLAN_NAME[data.order.planKey]}
          <span class="text-muted-foreground">·</span>
          {data.order.durationMonths} bulan
        </h2>
      </div>

      <dl class="flex flex-col gap-3 border-y border-border/60 py-4">
        <div class="flex items-baseline justify-between text-sm">
          <dt class="text-muted-foreground">Paket</dt>
          <dd class="font-medium text-foreground">
            {PLAN_NAME[data.order.planKey]}
          </dd>
        </div>
        <div class="flex items-baseline justify-between text-sm">
          <dt class="text-muted-foreground">Durasi</dt>
          <dd class="font-medium text-foreground tabular-nums">
            {data.order.durationMonths} bulan
          </dd>
        </div>
        <div class="flex items-baseline justify-between text-sm">
          <dt class="text-muted-foreground">ID Pesanan</dt>
          <dd
            class="font-mono text-xs tracking-tight text-foreground/80"
            title={orderId}
          >
            {orderId}
          </dd>
        </div>
      </dl>

      <div class="flex items-baseline justify-between">
        <span
          class="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
        >
          Total
        </span>
        <span
          class="font-heading text-2xl font-semibold tabular-nums tracking-tight text-foreground"
        >
          {formatIdr(data.order.grossAmount)}
        </span>
      </div>

      <a
        href="/subs/usage"
        class="group/btn mt-2 inline-flex h-11 w-full items-center justify-center gap-2 self-end rounded-full bg-foreground px-5 text-sm font-medium text-background transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-foreground/85 active:scale-[0.98]"
      >
        Saya sudah bayar
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          class="size-4 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/btn:translate-x-0.5"
        />
      </a>

      <p class="text-center text-[11px] leading-relaxed text-muted-foreground">
        Klik tombol di atas setelah pembayaran. Halaman akan otomatis
        memperbarui status ketika Midtrans mengonfirmasi.
      </p>
    </section>
  </div>

  <footer
    class="flex flex-col gap-3 border-t border-border/60 py-8 text-[13px] text-muted-foreground md:flex-row md:items-center md:justify-between"
  >
    <p>
      Tidak jadi bayar? Pesanan akan otomatis kedaluwarsa dan tidak memotong
      kuota kamu.
    </p>
    <a
      href="/subs/plans"
      class="font-medium text-foreground/70 underline-offset-4 transition-colors hover:text-foreground hover:underline"
    >
      Kembali ke paket
    </a>
  </footer>
</div>
