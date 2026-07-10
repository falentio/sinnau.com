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
  import { client } from "$lib/orpc";
  import { PLAN_NAME } from "$lib/schemas/plan.constant";
  import { HugeiconsIcon } from "@hugeicons/svelte";
  import { onMount } from "svelte";

  type OrderStatus = "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";
  type PlanKey = "LITE" | "PLUS" | "PREMIUM";

  const planName: Record<PlanKey, string> = PLAN_NAME;

  let orderId = $derived($page.params.orderId);
  let planKey = $state<PlanKey | null>(null);
  let durationMonths = $state<1 | 6 | 12 | null>(null);
  let grossAmount = $state<number | null>(null);
  let status = $state<OrderStatus>("PENDING");
  let expiresAt = $state<Date | null>(null);
  let createdAt = $state<Date | null>(null);
  let qrUrl = $state<string | null>(null);
  let loading = $state(true);
  let notFound = $state(false);

  onMount(async () => {
    const stored = sessionStorage.getItem(`checkout:${orderId}`);
    if (stored) {
      const data = JSON.parse(stored);
      const {
        planKey: storedPlanKey,
        durationMonths: storedDurationMonths,
        grossAmount: storedGrossAmount,
        expiresAt: storedExpiresAt,
        qrUrl: storedQrUrl,
      } = data;
      planKey = storedPlanKey;
      durationMonths = storedDurationMonths;
      grossAmount = storedGrossAmount;
      if (storedExpiresAt) {
        expiresAt = new Date(storedExpiresAt);
      }
      qrUrl = storedQrUrl ?? null;
    }

    try {
      let pg = 1;
      let found = false;
      while (!found) {
        const result = await client.plan.listOrders({ page: pg });
        const match = result.data.find((o) => o.id === orderId);
        if (match) {
          planKey ??= match.planKey;
          durationMonths ??= match.durationMonths;
          grossAmount ??= match.grossAmount;
          expiresAt ??= match.expiresAt;
          ({ createdAt, status } = match);
          found = true;
        }
        if (pg >= result.pagination.totalPages) {
          break;
        }
        pg += 1;
      }
      if (!found && !planKey) {
        notFound = true;
      }
    } catch {
      if (!planKey) {
        notFound = true;
      }
    }

    loading = false;
  });
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

  {#if loading}
    <div class="flex items-center justify-center py-20">
      <span class="text-sm text-muted-foreground">Memuat pesanan…</span>
    </div>
  {:else if notFound}
    <div class="flex flex-col items-center justify-center gap-4 py-20">
      <span class="text-sm text-muted-foreground">Pesanan tidak ditemukan.</span
      >
      <a
        href="/subs/plans"
        class="inline-flex h-9 items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-4 text-sm font-medium text-foreground/80 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-foreground/30 hover:bg-background hover:text-foreground"
      >
        Kembali ke paket
      </a>
    </div>
  {:else}
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
        <StatusBanner {status} />

        {#if qrUrl}
          <QrisDisplay
            {qrUrl}
            alt={`QRIS untuk ${planName[planKey!]} ${durationMonths} bulan`}
          />
        {:else if status === "PENDING"}
          <div
            class="flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-muted/30 px-6 py-8 text-center"
          >
            <span class="text-sm text-muted-foreground">
              QR tidak tersedia. Buat pesanan baru dari halaman paket.
            </span>
          </div>
        {/if}

        {#if expiresAt && status === "PENDING"}
          <ExpiryCountdown {expiresAt} />
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
            {planName[planKey!]}
            <span class="text-muted-foreground">·</span>
            {durationMonths} bulan
          </h2>
        </div>

        <dl class="flex flex-col gap-3 border-y border-border/60 py-4">
          <div class="flex items-baseline justify-between text-sm">
            <dt class="text-muted-foreground">Paket</dt>
            <dd class="font-medium text-foreground">{planName[planKey!]}</dd>
          </div>
          <div class="flex items-baseline justify-between text-sm">
            <dt class="text-muted-foreground">Durasi</dt>
            <dd class="font-medium text-foreground tabular-nums">
              {durationMonths} bulan
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
            {formatIdr(grossAmount!)}
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

        <p
          class="text-center text-[11px] leading-relaxed text-muted-foreground"
        >
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
  {/if}
</div>
