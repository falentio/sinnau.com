<script lang="ts">
  let {
    qrUrl,
    alt = "QRIS pembayaran",
    blurred = false,
  }: { qrUrl: string; alt?: string; blurred?: boolean } = $props();
</script>

<div
  class="relative isolate mx-auto w-full max-w-[280px] overflow-hidden rounded-[2rem] p-1.5 ring-1 ring-foreground/[0.05] shadow-[0_1px_0_0_rgba(0,0,0,0.04),0_24px_48px_-24px_rgba(0,0,0,0.18)]"
>
  <div
    class="overflow-hidden rounded-[calc(2rem-0.375rem)] bg-background p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]"
  >
    <div
      class="relative aspect-square w-full overflow-hidden rounded-2xl bg-white"
    >
      <img
        src={qrUrl}
        {alt}
        loading="lazy"
        class="size-full object-contain p-3"
        class:pointer-events-none={blurred}
        class:select-none={blurred}
        class:blur-lg={blurred}
        aria-hidden={blurred}
      />
    </div>

    <div
      class="mt-4 flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground"
    >
      {#if blurred}
        <span class="size-1 rounded-full bg-amber-500"></span>
        QR tidak aktif
      {:else}
        <span class="size-1 rounded-full bg-emerald-500"></span>
        QRIS · scan untuk bayar
      {/if}
    </div>
  </div>
</div>
