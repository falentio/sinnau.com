<script lang="ts">
  import StaticPage from "$lib/components/features/app/static-page.svelte";
  import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "$lib/constants";
</script>

<StaticPage
  title="Tentang · sinnau"
  description="Kenali sinnau — platform belajar dengan AI spaced repetition untuk mahasiswa Indonesia."
  heading="Tentang"
>
  <h2 class="text-lg font-semibold text-foreground">
    Belajar Lebih Pintar, Bukan Lebih Lama
  </h2>
  <p>
    sinnau adalah platform belajar berbasis AI yang dirancang khusus untuk
    mahasiswa Indonesia. Kami menggabungkan kekuatan <strong
      >spaced repetition</strong
    > — teknik pengulangan terjadwal yang terbukti secara ilmiah — dengan kecerdasan
    buatan untuk membantu kamu menguasai materi kuliah secara efisien.
  </p>
  <p>
    Buat set studi, flashcard, dan kuis dalam hitungan detik dengan bantuan AI.
    sinnau akan secara otomatis menjadwalkan sesi pengulangan di waktu yang
    optimal — tepat sebelum kamu mulai melupakan materi. Hasilnya? Kamu belajar
    lebih sedikit tapi ingat lebih banyak.
  </p>

  <h2 class="mt-6 text-lg font-semibold text-foreground">Kenapa sinnau?</h2>
  <ul class="list-disc space-y-1 pl-5">
    <li>
      <strong>AI-powered:</strong> Buat set studi dan kuis otomatis dari catatan,
      buku, atau topik apa pun — cukup beri tahu apa yang ingin kamu pelajari.
    </li>
    <li>
      <strong>Spaced Repetition:</strong> Algoritma pengulangan terjadwal membantu
      kamu mengingat materi lebih lama dengan sesi belajar yang lebih singkat.
    </li>
    <li>
      <strong>Flashcard & Kuis:</strong> Dua mode belajar yang saling melengkapi —
      hafalkan konsep dengan flashcard, uji pemahaman dengan kuis.
    </li>
    <li>
      <strong>Untuk Mahasiswa Indonesia:</strong> Dibangun dengan memahami kebutuhan
      mahasiswa Indonesia — dari materi kuliah umum hingga persiapan ujian.
    </li>
    <li>
      <strong>Akses di Mana Saja:</strong> Belajar kapan saja, di mana saja — cukup
      buka browser di laptop atau HP kamu.
    </li>
  </ul>

  <h2 class="mt-6 text-lg font-semibold text-foreground">Cara Kerja</h2>
  <ol class="list-decimal space-y-1 pl-5">
    <li>
      <strong>Buat Set Studi</strong> — tulis topik atau unggah catatan kamu, AI akan
      menghasilkan set studi lengkap dalam hitungan detik.
    </li>
    <li>
      <strong>Belajar dengan Flashcard</strong> — kuasai setiap konsep satu per satu
      dengan kartu dua sisi.
    </li>
    <li>
      <strong>Uji dengan Kuis</strong> — pastikan kamu benar-benar paham, bukan sekadar
      hafal.
    </li>
    <li>
      <strong>Ulangi di Waktu Tepat</strong> — sinnau akan mengingatkan kamu untuk
      mengulang materi tepat sebelum kamu lupa.
    </li>
  </ol>

  <h2 class="mt-6 text-lg font-semibold text-foreground">Hubungi Kami</h2>
  <p>
    sinnau terus dikembangkan dan disempurnakan. Punya masukan, pertanyaan, atau
    ide? Kami senang mendengarnya.
  </p>
  <ul class="list-disc space-y-1 pl-5">
    <li>
      Instagram: <a
        href={INSTAGRAM_URL}
        class="text-primary underline"
        target="_blank"
        rel="noopener noreferrer">{INSTAGRAM_HANDLE}</a
      >
    </li>
  </ul>
</StaticPage>
