<script lang="ts">
  import { reveal } from "./reveal";

  const faqs = [
    {
      a: "Daftar, lalu unggah PDF catatan atau slide pertama Anda. AI membuat flashcard dan soal kuis untuk Anda. Dalam dua menit, Anda sudah bisa mulai sesi pertama — tanpa bikin kartu manual.",
      q: "Bagaimana cara mulai pakai sinnau?",
    },
    {
      a: "PDF catatan kuliah, slide presentasi, atau dokumen teks. Satu modul biasanya dari satu bab atau satu deck. Sistem mengekstrak konsep utama dan membangun kartu untuk masing-masing.",
      q: "Materi apa saja yang bisa diunggah?",
    },
    {
      a: "Kurang dari dua menit per bab. Begitu kartu muncul, langsung mulai sesi pertama. Tidak ada setup, tidak ada kartu yang harus diketik manual.",
      q: "Berapa lama satu modul selesai dibuat?",
    },
    {
      a: "FSRS (Free Spaced Repetition Scheduler) adalah algoritma open-source yang juga dipakai Anki. Untuk tiap kartu, ia memprediksi kapan Anda mulai lupa dan menjadwalkan ulangan tepat sebelum itu. Kartu yang sudah dikuasai jarang muncul; yang masih lemah muncul lebih sering.",
      q: "Apa itu FSRS dan kenapa itu penting?",
    },
    {
      a: "Quizlet mengulang dengan interval tetap dan mengharuskan Anda bikin kartu sendiri. Anki adaptif, tapi tetap manual. Sinnau menggabungkan keduanya: AI membuat kartu dari PDF Anda, FSRS menjadwalkan secara presisi.",
      q: "Apa bedanya sinnau dengan Quizlet atau Anki?",
    },
    {
      a: "Ya. Daftar dapat tiga modul lengkap tanpa biaya dan tanpa kartu kredit. Modul tambahan butuh paket berbayar. Batalkan kapan saja.",
      q: "Apakah sinnau gratis?",
    },
    {
      a: "Bisa. Set modul ke publik, lalu teman bisa akses lewat tautan langsung atau temukan di halaman jelajah. Modul privat hanya untuk Anda.",
      q: "Bisa share modul ke teman?",
    },
    {
      a: "Bisa. Edit, tambah, atau hapus kartu mana pun kapan saja. Hasil AI adalah draf awal — Anda yang menyempurnakan sesuai cara Anda memahami materi.",
      q: "Bisa edit atau tambah kartu sendiri?",
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
            class="text-[15px] font-medium leading-snug text-foreground text-pretty"
          >
            {faq.q}
          </div>
          <div
            class="grid overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style="grid-template-rows: {openIndex === i ? '1fr' : '0fr'}"
          >
            <div class="min-h-0 overflow-hidden">
              <p
                class="pt-3 text-[13.5px] leading-relaxed text-muted-foreground text-pretty"
              >
                {faq.a}
              </p>
            </div>
          </div>
        </div>
        <span
          class="grid size-6 shrink-0 place-items-center rounded-md border text-[13px] text-muted-foreground transition-colors group-hover:text-foreground"
          aria-hidden="true"
        >
          {openIndex === i ? "\u2212" : "+"}
        </span>
      </button>
    {/each}
  </div>
</section>
