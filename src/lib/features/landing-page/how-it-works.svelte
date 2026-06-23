<script lang="ts">
  import {
    AiBeautifyIcon,
    Cards01Icon,
    FileUploadIcon,
  } from "$lib/components/features/icons";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  import { reveal } from "./reveal";

  const steps = [
    {
      body: "Unggah PDF catatan kuliah, bab buku teks, atau slide. Sistem membaca dan mengekstrak konsep-konsep utamanya.",
      icon: FileUploadIcon,
      number: "01",
      title: "Unggah materi Anda.",
    },
    {
      body: "AI membangun flashcard dan soal kuis dari konten. Tinjau, edit, atau tambah kartu Anda sendiri sebelum mulai.",
      icon: AiBeautifyIcon,
      number: "02",
      title: "AI membangun modul.",
    },
    {
      body: "FSRS menjadwalkan kartu di momen yang tepat. Kuis adaptif fokus ke konsep yang masih Anda lemah. Sesi makin singkat seiring Anda makin hafal.",
      icon: Cards01Icon,
      number: "03",
      title: "Belajar dengan presisi.",
    },
  ] as const;
</script>

<section
  id="how-it-works"
  class="relative mx-auto w-full max-w-[1240px] px-5 pt-28 sm:px-8 sm:pt-36 lg:pt-44"
>
  <div class="max-w-[40rem]" use:reveal>
    <h2
      class="font-display text-[32px] leading-[1.04] tracking-[-0.03em] sm:text-[42px] text-balance"
    >
      Dari PDF sampai paham,<br />dalam tiga langkah.
    </h2>
    <p
      class="mt-4 max-w-[42ch] text-[14px] leading-relaxed text-[var(--landing-muted)] text-pretty"
    >
      Tanpa membuat kartu manual. Tanpa menebak apa yang harus dipelajari
      selanjutnya. Sistem yang menentukannya.
    </p>
  </div>

  <div class="mt-14 grid grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-5">
    {#each steps as step, i (step.number)}
      <article
        use:reveal={{ delay: i * 120 }}
        class="group relative flex flex-col overflow-hidden rounded-[20px] border bg-[var(--landing-card)] p-6 sm:p-7"
      >
        <div class="flex items-start justify-between gap-4">
          <div
            class="grid size-11 shrink-0 place-items-center rounded-[12px] bg-[var(--landing-surface-subtle)] text-[var(--landing-fg)]"
          >
            <HugeiconsIcon icon={step.icon} class="size-5" />
          </div>
          <span
            class="font-display text-[28px] leading-none tracking-[-0.03em] text-[color-mix(in_oklch,var(--landing-fg)_12%,transparent)] sm:text-[34px]"
            aria-hidden="true"
          >
            {step.number}
          </span>
        </div>

        <div class="mt-7">
          <h3
            class="font-display text-[18px] leading-[1.2] tracking-[-0.02em] sm:text-[20px] text-balance"
          >
            {step.title}
          </h3>
          <p
            class="mt-2.5 max-w-[36ch] text-[13.5px] leading-relaxed text-[var(--landing-muted)]"
          >
            {step.body}
          </p>
        </div>
      </article>
    {/each}
  </div>
</section>
