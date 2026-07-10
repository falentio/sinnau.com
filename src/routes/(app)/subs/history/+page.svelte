<script lang="ts">
  import * as Pagination from "$lib/components/ui/pagination/index.js";
  import * as Tabs from "$lib/components/ui/tabs/index.js";

  import OrderRow from "./_components/order-row.svelte";

  type OrderStatus = "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";
  type Order = {
    id: string;
    planKey: "LITE" | "PLUS" | "PREMIUM";
    planName: string;
    durationMonths: 1 | 6 | 12;
    grossAmount: number;
    createdAt: Date;
    status: OrderStatus;
  };

  const planName: Record<"LITE" | "PLUS" | "PREMIUM", string> = {
    LITE: "Lite",
    PLUS: "Plus",
    PREMIUM: "Premium",
  };

  const now = new Date();
  const day = 24 * 60 * 60 * 1000;
  const orders: Order[] = [
    {
      createdAt: new Date(now.getTime() - 2 * day),
      durationMonths: 6,
      grossAmount: 250_000,
      id: "ord_01HABCDEFG",
      planKey: "PLUS",
      planName: planName.PLUS,
      status: "PAID",
    },
    {
      createdAt: new Date(now.getTime() - 5 * day),
      durationMonths: 1,
      grossAmount: 30_000,
      id: "ord_01HABCDEFH",
      planKey: "LITE",
      planName: planName.LITE,
      status: "PAID",
    },
    {
      createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
      durationMonths: 12,
      grossAmount: 900_000,
      id: "ord_01HABCDEFI",
      planKey: "PREMIUM",
      planName: planName.PREMIUM,
      status: "PENDING",
    },
    {
      createdAt: new Date(now.getTime() - 28 * day),
      durationMonths: 1,
      grossAmount: 50_000,
      id: "ord_01HABCDEFJ",
      planKey: "PLUS",
      planName: planName.PLUS,
      status: "EXPIRED",
    },
  ];

  const paidTotal = orders
    .filter((o) => o.status === "PAID")
    .reduce((sum, o) => sum + o.grossAmount, 0);
  const activeCount = orders.filter((o) => o.status === "PAID").length;
  const pendingCount = orders.filter((o) => o.status === "PENDING").length;
  const lastOrder = orders.reduce(
    (latest, o) => (o.createdAt > latest.createdAt ? o : latest),
    orders[0]
  );
  const lastOrderRel = (() => {
    const diff = now.getTime() - lastOrder.createdAt.getTime();
    const hours = Math.floor(diff / (60 * 60 * 1000));
    if (hours < 24) return `${hours} jam lalu`;
    return `${Math.floor(hours / 24)} hari lalu`;
  })();

  const pagination = {
    limit: 20,
    page: 1,
    total: orders.length,
    totalPages: 1,
  };

  let filter = $state("all");
  const filtered = $derived(
    filter === "all"
      ? orders
      : filter === "active"
        ? orders.filter((o) => o.status === "PAID")
        : filter === "pending"
          ? orders.filter((o) => o.status === "PENDING")
          : orders.filter(
              (o) => o.status === "EXPIRED" || o.status === "CANCELLED"
            )
  );
</script>

<svelte:head>
  <title>Riwayat pesanan · Sinnau</title>
</svelte:head>

<div class="mx-auto w-full max-w-4xl px-6 pt-8 md:pt-12">
  <header class="flex flex-col gap-2 pb-6 md:pb-8">
    <span
      class="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
    >
      Riwayat
    </span>
    <h1
      class="font-heading text-3xl font-semibold tracking-[-0.025em] text-foreground md:text-4xl"
    >
      Pesanan
    </h1>
    <p class="max-w-md text-[15px] leading-relaxed text-muted-foreground">
      Pesanan yang menunggu, aktif, dan yang pernah kamu buat.
    </p>
  </header>

  <section
    class="mb-6 grid grid-cols-3 gap-2 md:mb-8 md:gap-3"
    aria-label="Ringkasan pesanan"
  >
    <div
      class="flex flex-col gap-1.5 rounded-2xl border border-border/60 bg-card p-4 shadow-[0_1px_0_0_rgba(0,0,0,0.04)] ring-1 ring-foreground/[0.04] md:p-5"
    >
      <span
        class="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground md:text-[11px]"
      >
        Total dibayar
      </span>
      <span
        class="font-heading text-base font-semibold tabular-nums tracking-tight text-foreground md:text-lg"
      >
        {new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          maximumFractionDigits: 0,
        })
          .format(paidTotal)
          .replace("Rp", "Rp ")}
      </span>
      <span class="text-[10px] text-muted-foreground md:text-[11px]">
        dari {orders.length} pesanan
      </span>
    </div>

    <div
      class="flex flex-col gap-1.5 rounded-2xl border border-border/60 bg-card p-4 shadow-[0_1px_0_0_rgba(0,0,0,0.04)] ring-1 ring-foreground/[0.04] md:p-5"
    >
      <span
        class="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground md:text-[11px]"
      >
        Paket aktif
      </span>
      <span
        class="font-heading text-base font-semibold tabular-nums tracking-tight text-foreground md:text-lg"
      >
        {activeCount}
        <span class="text-xs font-normal text-muted-foreground md:text-sm">
          / {orders.length}
        </span>
      </span>
      <span class="text-[10px] text-muted-foreground md:text-[11px]">
        {pendingCount} menunggu
      </span>
    </div>

    <div
      class="flex flex-col gap-1.5 rounded-2xl border border-border/60 bg-card p-4 shadow-[0_1px_0_0_rgba(0,0,0,0.04)] ring-1 ring-foreground/[0.04] md:p-5"
    >
      <span
        class="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground md:text-[11px]"
      >
        Pesanan terakhir
      </span>
      <span
        class="font-heading text-base font-semibold tracking-tight text-foreground md:text-lg"
      >
        {lastOrderRel}
      </span>
      <span class="text-[10px] text-muted-foreground md:text-[11px]">
        {planName[lastOrder.planKey]}
      </span>
    </div>
  </section>

  <div class="border-b border-border/60">
    <Tabs.Root bind:value={filter}>
      <Tabs.List
        variant="line"
        class="h-auto w-full justify-start gap-4 rounded-none bg-transparent p-0"
      >
        <Tabs.Trigger
          value="all"
          class="rounded-none px-0 pb-3 text-sm data-active:text-foreground"
        >
          Semua
          <span
            class="ml-1 font-mono text-[10px] tabular-nums text-muted-foreground"
          >
            {orders.length}
          </span>
        </Tabs.Trigger>
        <Tabs.Trigger
          value="active"
          class="rounded-none px-0 pb-3 text-sm data-active:text-foreground"
        >
          Aktif
          <span
            class="ml-1 font-mono text-[10px] tabular-nums text-muted-foreground"
          >
            {activeCount}
          </span>
        </Tabs.Trigger>
        <Tabs.Trigger
          value="pending"
          class="rounded-none px-0 pb-3 text-sm data-active:text-foreground"
        >
          Menunggu
          <span
            class="ml-1 font-mono text-[10px] tabular-nums text-muted-foreground"
          >
            {pendingCount}
          </span>
        </Tabs.Trigger>
        <Tabs.Trigger
          value="other"
          class="rounded-none px-0 pb-3 text-sm data-active:text-foreground"
        >
          Lainnya
          <span
            class="ml-1 font-mono text-[10px] tabular-nums text-muted-foreground"
          >
            {orders.length - activeCount - pendingCount}
          </span>
        </Tabs.Trigger>
      </Tabs.List>
    </Tabs.Root>
  </div>

  <section
    class="overflow-hidden rounded-b-3xl border border-t-0 border-border/60 bg-card shadow-[0_1px_0_0_rgba(0,0,0,0.04)] ring-1 ring-foreground/[0.04]"
  >
    {#each filtered as order (order.id)}
      <OrderRow {order} />
    {/each}
  </section>

  <div class="flex justify-center pt-8">
    <Pagination.Root
      count={pagination.total}
      perPage={pagination.limit}
      page={pagination.page}
    >
      {#snippet children({ pages })}
        <Pagination.Content>
          <Pagination.Item>
            <Pagination.PrevButton />
          </Pagination.Item>
          {#each pages as page (page.key)}
            {#if page.type === "ellipsis"}
              <Pagination.Item>
                <Pagination.Ellipsis />
              </Pagination.Item>
            {:else}
              <Pagination.Item>
                <Pagination.Link
                  {page}
                  isActive={page.value === pagination.page}
                >
                  {page.value}
                </Pagination.Link>
              </Pagination.Item>
            {/if}
          {/each}
          <Pagination.Item>
            <Pagination.NextButton />
          </Pagination.Item>
        </Pagination.Content>
      {/snippet}
    </Pagination.Root>
  </div>
</div>
