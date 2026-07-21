<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import {
    ArrowLeft01Icon,
    ArrowRight01Icon,
  } from "$lib/components/features/icons";
  import { formatIdr } from "$lib/components/features/plan";
  import {
    AUTO_NAVIGATE_MS,
    computePollIntervalMs,
    POLL_RETRY_MS,
  } from "$lib/components/features/subs/checkout-poll";
  import ExpiryCountdown from "$lib/components/features/subs/expiry-countdown.svelte";
  import QrisDisplay from "$lib/components/features/subs/qris-display.svelte";
  import StatusBanner from "$lib/components/features/subs/status-banner.svelte";
  import SeoHead from "$lib/components/seo-head.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import { client } from "$lib/orpc";
  import type { GetOrder } from "$lib/schemas/plan";
  import { PLAN_NAME } from "$lib/schemas/plan.constant";
  import { HugeiconsIcon } from "@hugeicons/svelte";
  import { untrack } from "svelte";
  import { toast } from "svelte-sonner";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  // svelte-ignore state_referenced_locally
  let order = $state<GetOrder>(data.order);
  let orderId = $derived($page.params.orderId);
  let isVerifying = $state(false);
  let isPolling = $state(false);
  let isRetrying = $state(false);
  let pollTimeout = $state<ReturnType<typeof setTimeout> | null>(null);
  let autoNavigateTimeout = $state<ReturnType<typeof setTimeout> | null>(null);

  const isTerminal = $derived(
    order.status === "PAID" ||
      order.status === "EXPIRED" ||
      order.status === "CANCELLED"
  );

  const handleVerify = async () => {
    if (isVerifying) {
      return;
    }
    isVerifying = true;
    try {
      const fresh = await client.plan.getOrder({ orderId: order.id });
      order = fresh;
      if (fresh.status === "PAID") {
        if (autoNavigateTimeout) {
          clearTimeout(autoNavigateTimeout);
          autoNavigateTimeout = null;
        }
        await goto("/subs/usage");
      } else if (fresh.status === "PENDING") {
        toast.info("Midtrans masih memproses pembayaran. Tunggu sebentar…");
      } else {
        toast.error(
          "Pesanan sudah tidak berlaku. Buat pesanan baru dari halaman paket."
        );
      }
    } catch (error) {
      const code = (error as { code?: string } | null)?.code;
      if (code === "NOT_FOUND") {
        toast.error("Pesanan tidak ditemukan");
      } else {
        toast.error("Gagal memverifikasi, coba lagi");
      }
    } finally {
      isVerifying = false;
    }
  };

  const poll = async () => {
    if (isTerminal) {
      return;
    }
    isPolling = true;
    isRetrying = false;
    try {
      const fresh = await client.plan.getOrder({ orderId: order.id });
      order = fresh;
      if (fresh.status === "PAID" && !autoNavigateTimeout) {
        autoNavigateTimeout = setTimeout(() => {
          autoNavigateTimeout = null;
          void goto("/subs/usage");
        }, AUTO_NAVIGATE_MS);
      }
    } catch {
      isRetrying = true;
      isPolling = false;
      pollTimeout = setTimeout(poll, POLL_RETRY_MS);
      return;
    }
    isPolling = false;
    if (!isTerminal) {
      pollTimeout = setTimeout(poll, computePollIntervalMs(order.createdAt));
    }
  };

  $effect(() => {
    untrack(() => {
      void poll();
    });
    return () => {
      if (pollTimeout) {
        clearTimeout(pollTimeout);
      }
      if (autoNavigateTimeout) {
        clearTimeout(autoNavigateTimeout);
      }
    };
  });
</script>

<SeoHead
  title="Selesaikan Pembayaran · sinnau"
  description="Scan QRIS untuk menyelesaikan pembayaran langganan Sinnau. Pembayaran diverifikasi otomatis setelah transfer."
  robots="noindex"
/>

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
      Scan QR code di bawah dengan aplikasi bank atau e-wallet favoritmu.
      Pembayaran terverifikasi otomatis.
    </p>
  </header>

  <div class="grid grid-cols-1 gap-6 pb-16 md:grid-cols-12 md:gap-8">
    <section
      class="md:col-span-7 md:row-span-2 flex flex-col items-center gap-5 rounded-3xl border border-border/60 bg-card p-6 ring-1 ring-foreground/[0.04] md:p-10"
    >
      <StatusBanner status={order.status} />

      {#if isPolling || isRetrying}
        <p
          class="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80"
        >
          <span
            aria-hidden="true"
            class="inline-block size-1.5 animate-pulse rounded-full bg-muted-foreground/60"
          ></span>
          Memeriksa pembayaran…
        </p>
      {/if}

      {#if order.qrUrl}
        <QrisDisplay
          qrUrl={order.qrUrl}
          alt={`QRIS untuk ${PLAN_NAME[order.planKey]} ${order.durationMonths} bulan`}
        />
      {:else if order.status === "PENDING"}
        <div
          class="flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-muted/30 px-6 py-8 text-center"
        >
          <span class="text-sm text-muted-foreground">
            QR tidak tersedia. Buat pesanan baru dari halaman paket.
          </span>
        </div>
      {/if}

      {#if order.expiresAt && order.status === "PENDING"}
        <ExpiryCountdown expiresAt={order.expiresAt} />
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
          {PLAN_NAME[order.planKey]}
          <span class="text-muted-foreground">·</span>
          {order.durationMonths} bulan
        </h2>
      </div>

      <dl class="flex flex-col gap-3 border-y border-border/60 py-4">
        <div class="flex items-baseline justify-between text-sm">
          <dt class="text-muted-foreground">Paket</dt>
          <dd class="font-medium text-foreground">
            {PLAN_NAME[order.planKey]}
          </dd>
        </div>
        <div class="flex items-baseline justify-between text-sm">
          <dt class="text-muted-foreground">Durasi</dt>
          <dd class="font-medium text-foreground tabular-nums">
            {order.durationMonths} bulan
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
          {formatIdr(order.grossAmount)}
        </span>
      </div>

      <Button
        type="button"
        onclick={handleVerify}
        disabled={isVerifying}
        aria-busy={isVerifying}
        class="h-11 w-full justify-center gap-2 self-end rounded-full"
      >
        {autoNavigateTimeout ? "Memeriksa pembayaran…" : "Saya sudah bayar"}
        <HugeiconsIcon icon={ArrowRight01Icon} class="size-4" />
      </Button>

      <p class="text-center text-[11px] leading-relaxed text-muted-foreground">
        Klik tombol di atas setelah transfer. Status akan diperbarui otomatis
        saat pembayaran dikonfirmasi.
      </p>
    </section>
  </div>

  <footer
    class="flex flex-col gap-3 border-t border-border/60 py-8 text-[13px] text-muted-foreground md:flex-row md:items-center md:justify-between"
  >
    <p>
      Tidak jadi? Biarkan saja — pesanan kedaluwarsa otomatis tanpa biaya apa
      pun.
    </p>
    <a
      href="/subs/plans"
      class="font-medium text-foreground/70 underline-offset-4 transition-colors hover:text-foreground hover:underline"
    >
      Kembali ke paket
    </a>
  </footer>
</div>
