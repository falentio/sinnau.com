<script lang="ts">
  let { commissionLabel }: { commissionLabel: string } = $props();
</script>

<section class="mt-10 border-t border-border/60 pt-8 md:mt-12">
  <h2 class="font-heading text-xl font-semibold tracking-[-0.02em] md:text-2xl">
    Cara kerjanya
  </h2>
  <ol class="mt-5 divide-y divide-border/60">
    <li class="flex gap-4 py-4 first:pt-0">
      <span
        class="pt-0.5 font-mono text-[13px] text-amber-700 dark:text-amber-300"
        >01</span
      >
      <div>
        <p class="text-sm font-medium">Bagikan tautanmu</p>
        <p class="mt-0.5 text-sm leading-relaxed text-muted-foreground">
          Taruh di bio, story, atau grup belajar, di mana pun audiensmu biasa
          nongkrong.
        </p>
      </div>
    </li>
    <li class="flex gap-4 py-4">
      <span
        class="pt-0.5 font-mono text-[13px] text-amber-700 dark:text-amber-300"
        >02</span
      >
      <div>
        <p class="text-sm font-medium">Temanmu berlangganan</p>
        <p class="mt-0.5 text-sm leading-relaxed text-muted-foreground">
          Klik tercatat selama 30 hari. Begitu mereka membeli paket, langganan
          itu langsung tercatat sebagai konversimu.
        </p>
      </div>
    </li>
    <li class="flex gap-4 py-4 last:pb-0">
      <span
        class="pt-0.5 font-mono text-[13px] text-amber-700 dark:text-amber-300"
        >03</span
      >
      <div>
        <p class="text-sm font-medium">Komisi masuk saldo</p>
        <p class="mt-0.5 text-sm leading-relaxed text-muted-foreground">
          {commissionLabel} dari nilai transaksi langsung menambah saldo menunggu
          di halaman ini.
        </p>
      </div>
    </li>
  </ol>
</section>
