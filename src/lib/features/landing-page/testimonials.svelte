<script lang="ts">
  import {
    Book03Icon,
    IdeaIcon,
    QuillWrite01Icon,
  } from "$lib/components/features/icons";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  import { reveal } from "./reveal";

  const useCases = [
    {
      body: "Unggah PDF catatan kuliah setiap minggu. AI membangun kartu untuk tiap topik. FSRS menjadwalkan ulangan harian berdasarkan konsep yang mulai Anda lupa.",
      icon: IdeaIcon,
      role: "Mahasiswa semester awal",
      title: "Membangun kebiasaan belajar harian.",
    },
    {
      body: "Unggah PDF bab dan slide per sistem. AI bikin kartu berlabel sesuai topik. Kuis adaptif fokus ke konsep yang sering muncul di ujian blok.",
      icon: Book03Icon,
      role: "Mahasiswa kedokteran",
      title: "Mempersiapkan ujian blok.",
    },
    {
      body: "Unggah paper rujukan, draft bab, atau catatan bacaan. Sistem mengekstrak konsep utama dan menjadwalkannya untuk review jangka panjang.",
      icon: QuillWrite01Icon,
      role: "Peneliti pascasarjana",
      title: "Menjaga literatur tetap segar.",
    },
  ] as const;
</script>

<section
  id="stories"
  class="relative mx-auto w-full max-w-[1240px] px-5 pt-28 sm:px-8 sm:pt-36 lg:pt-44"
>
  <div class="max-w-[40rem]" use:reveal>
    <h2
      class="font-display text-[32px] leading-[1.04] tracking-[-0.03em] sm:text-[42px] text-balance"
    >
      Tiga cara mahasiswa<br />pakai sinnau.
    </h2>
    <p
      class="mt-4 max-w-[42ch] text-[14px] leading-relaxed text-[var(--landing-muted)] text-pretty"
    >
      Alur belajar yang berbeda, sistem yang sama. Pilih yang paling cocok
      dengan cara Anda kuliah.
    </p>
  </div>

  <div
    class="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-5"
  >
    {#each useCases as uc, i (uc.title)}
      <article
        use:reveal={{ delay: i * 100 }}
        class="flex flex-col rounded-[20px] border bg-[var(--landing-card)] p-6 sm:p-7"
      >
        <p
          class="flex-1 text-[14px] leading-relaxed text-[var(--landing-fg)] text-pretty"
        >
          {uc.body}
        </p>
        <div class="mt-6 flex items-center gap-3 border-t pt-4">
          <div
            class="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--landing-surface-subtle)] text-[var(--landing-fg)]"
          >
            <HugeiconsIcon icon={uc.icon} class="size-4" />
          </div>
          <div>
            <div class="text-[13px] font-medium text-[var(--landing-fg)]">
              {uc.title}
            </div>
            <div class="text-[11px] text-[var(--landing-muted)]">{uc.role}</div>
          </div>
        </div>
      </article>
    {/each}
  </div>
</section>
