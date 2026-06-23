<script lang="ts">
  import { reveal } from "./reveal";

  const faqs = [
    {
      a: "Unggah PDF, slide, atau dokumen teks. AI membuat flashcard dan soal kuis secara otomatis. Anda bisa tinjau, edit, atau tambah kartu sendiri sebelum mulai.",
      q: "Bagaimana cara membuat modul belajar?",
    },
    {
      a: "FSRS (Free Spaced Repetition Scheduler) adalah algoritma open-source yang dipakai Anki dan ribuan alat belajar lainnya. Untuk setiap kartu, ia memprediksi kapan Anda mulai lupa dan menjadwalkan ulangan tepat sebelum itu terjadi.",
      q: "Apa itu FSRS dan mengapa penting?",
    },
    {
      a: "Ya. Daftar akun gratis dan langsung dapat tiga modul lengkap tanpa biaya. Untuk modul tambahan, pilih paket berbayar yang sesuai. Tidak perlu kartu kredit untuk mulai.",
      q: "Apakah sinnau gratis?",
    },
    {
      a: "Kuis adaptif melacak konsep yang Anda kuasai dan menanyakan lebih banyak dari area yang masih lemah. Kartu yang terlewat muncul lagi sampai Anda menguasainya.",
      q: "Bagaimana kuis adaptif bekerja?",
    },
    {
      a: "Ya. Edit, tambah, atau hapus kartu mana pun kapan saja. Hasil AI adalah draf awal — Anda yang menyempurnakan.",
      q: "Bisa edit kartu setelah dibuat?",
    },
  ] as const;

  let openIndex = $state<number | null>(null);

  const toggle = (idx: number) => {
    openIndex = openIndex === idx ? null : idx;
  };
</script>

<section
  id="faq"
  class="relative mx-auto w-full max-w-[1240px] px-5 pt-28 sm:px-8 sm:pt-36 lg:pt-44"
>
  <div class="mx-auto max-w-[42rem]" use:reveal>
    <h2
      class="font-display text-[32px] leading-[1.04] tracking-[-0.03em] sm:text-[42px] text-balance"
    >
      Pertanyaan yang sering diajukan.
    </h2>
  </div>

  <div class="mx-auto mt-12 max-w-[42rem]" use:reveal={{ delay: 80 }}>
    {#each faqs as faq, i (faq.q)}
      <button
        class="group flex w-full items-start justify-between gap-4 py-5 text-left {i <
        faqs.length - 1
          ? 'border-b'
          : ''}"
        onclick={() => toggle(i)}
        aria-expanded={openIndex === i}
      >
        <div class="min-w-0">
          <div
            class="text-[15px] font-medium leading-snug text-[var(--landing-fg)] text-pretty"
          >
            {faq.q}
          </div>
          <div
            class="grid overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style="grid-template-rows: {openIndex === i ? '1fr' : '0fr'}"
          >
            <div class="min-h-0 overflow-hidden">
              <p
                class="pt-3 text-[13.5px] leading-relaxed text-[var(--landing-muted)] text-pretty"
              >
                {faq.a}
              </p>
            </div>
          </div>
        </div>
        <span
          class="grid size-6 shrink-0 place-items-center rounded-md border text-[13px] text-[var(--landing-muted)] transition-colors group-hover:text-[var(--landing-fg)]"
          aria-hidden="true"
        >
          {openIndex === i ? "\u2212" : "+"}
        </span>
      </button>
    {/each}
  </div>
</section>
