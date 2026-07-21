<script lang="ts">
  import { ArrowRight01Icon } from "$lib/components/features/icons";
  import Button from "$lib/components/ui/button/button.svelte";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  import { reveal } from "./reveal";
</script>

<section
  class="relative mx-auto w-full max-w-[1240px] px-5 pt-28 sm:px-8 sm:pt-36 lg:pt-44"
  use:reveal
>
  <div
    class="overflow-hidden rounded-[20px] border bg-[var(--landing-fg)] px-8 py-14 sm:px-10 sm:py-16 lg:px-14 lg:py-20"
  >
    <div class="mx-auto max-w-[36rem] text-center">
      <h2
        class="font-display text-[28px] leading-[1.06] tracking-[-0.03em] text-[var(--landing-bg)] sm:text-[38px] text-balance"
      >
        Belajar lebih pintar, bukan lebih keras<br />— langsung dari PDF Anda.
      </h2>

      <p
        class="mt-5 text-[14px] leading-relaxed text-[color-mix(in_oklch,var(--landing-bg)_60%,transparent)] text-pretty sm:text-[15px]"
      >
        Cukup unggah PDF. Kami buatkan flashcard dan kuisnya — tanpa setup,
        tanpa kartu manual.
      </p>

      <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button
          href="/login/"
          size="lg"
          class="px-5 bg-[var(--landing-bg)] text-[var(--landing-fg)] hover:bg-[color-mix(in_oklch,var(--landing-bg)_90%,transparent)]"
        >
          Mulai Belajar Gratis
          <HugeiconsIcon icon={ArrowRight01Icon} data-icon="inline-end" />
        </Button>
      </div>

      <p
        class="mt-4 text-[12px] text-[color-mix(in_oklch,var(--landing-bg)_40%,transparent)]"
      >
        Coba 3 modul pertama gratis — tanpa kartu kredit. Batalkan kapan saja.
        Mulai dalam 2 menit — langsung bisa dipakai.
      </p>
    </div>
  </div>
</section>
