<script lang="ts">
  import * as Accordion from "$lib/components/ui/accordion/index.js";

  import { reveal } from "./reveal";

  const faqs = [
    {
      a: "Daftar, lalu unggah PDF catatan atau slide pertama Anda. AI membuat flashcard dan soal kuis untuk Anda. Dalam dua menit, Anda sudah bisa mulai sesi pertama — tanpa bikin kartu manual.",
      q: "Bagaimana cara mulai pakai sinnau?",
    },
    {
      a: "Gratis. Langsung dapat tiga modul lengkap — tanpa kartu kredit.",
      q: "Apakah sinnau gratis?",
    },
    {
      a: "Kurang dari dua menit per bab. Begitu kartu muncul, langsung mulai sesi pertama. Tidak ada setup, tidak ada kartu yang harus diketik manual.",
      q: "Berapa lama satu modul selesai dibuat?",
    },
    {
      a: "Iya. Setiap kartu dijadwalkan ulang tepat sebelum Anda mulai lupa — pakai algoritma yang sama dengan Anki.",
      q: "Apakah metode sinnau benar-benar membantu saya ingat materi?",
    },
    {
      a: "Kalau ada yang kurang pas, Anda bisa edit, hapus, atau tambah kartu sendiri kapan saja. Hasil AI adalah draf awal — Anda yang menyempurnakan.",
      q: "Bagaimana kalau kartu dari AI tidak sesuai?",
    },
    {
      a: "Quizlet: kartu manual, jadwal tetap. Anki: kartu manual, jadwal adaptif. Sinnau: kartu otomatis dari PDF, jadwal adaptif.",
      q: "Apa bedanya sinnau dengan Quizlet atau Anki?",
    },
    {
      a: "PDF catatan kuliah, slide presentasi, atau dokumen teks. Satu modul biasanya dari satu bab atau satu deck. Sistem mengekstrak konsep utama dan membangun kartu untuk masing-masing.",
      q: "Materi apa saja yang bisa diunggah?",
    },
    {
      a: "Bisa. Set modul ke publik, lalu teman bisa akses lewat tautan langsung atau temukan di halaman jelajah. Modul privat hanya untuk Anda.",
      q: "Bisa share modul ke teman?",
    },
  ] as const;
</script>

<section
  id="faq"
  class="relative mx-auto w-full max-w-[1240px] px-5 pt-28 sm:px-8 sm:pt-36 lg:pt-44"
>
  <div class="mx-auto max-w-[42rem]" use:reveal>
    <h2
      class="font-display text-[32px] leading-[1.04] tracking-[-0.03em] sm:text-[42px] text-balance"
    >
      Ada pertanyaan?
    </h2>
  </div>

  <div class="mx-auto mt-12 max-w-[42rem]" use:reveal={{ delay: 80 }}>
    <Accordion.Root type="single" class="w-full rounded-none border-0">
      {#each faqs as faq (faq.q)}
        <Accordion.Item
          value={faq.q}
          class="border-b-0 px-0 data-open:bg-transparent"
        >
          <Accordion.Trigger
            class="px-0 py-5 text-[15px] font-medium leading-snug text-foreground hover:no-underline"
          >
            {faq.q}
          </Accordion.Trigger>
          <Accordion.Content
            class="overflow-hidden px-0 text-[13.5px] leading-relaxed text-muted-foreground"
          >
            <p class="pt-3 pb-5 text-pretty">
              {faq.a}
            </p>
          </Accordion.Content>
        </Accordion.Item>
      {/each}
    </Accordion.Root>

    <div class="mt-10 text-center">
      <a
        href="/login/"
        class="inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--landing-accent)] hover:underline"
      >
        Sudah siap? Daftar gratis, dapat tiga modul tanpa kartu kredit. &rarr;
      </a>
    </div>
  </div>
</section>
