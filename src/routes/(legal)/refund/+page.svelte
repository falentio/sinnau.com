<script lang="ts">
  import StaticPage from "$lib/components/features/app/static-page.svelte";
  import {
    EMAIL_SUPPORT,
    INSTAGRAM_HANDLE,
    INSTAGRAM_URL,
  } from "$lib/constants";
</script>

<StaticPage
  title="Kebijakan Pengembalian Dana · sinnau"
  description="Kebijakan pengembalian dana sinnau — semua pembelian bersifat final dan tidak dapat dikembalikan."
  heading="Kebijakan Pengembalian Dana"
>
  <p class="text-muted-foreground">Terakhir diperbarui: 23 Juli 2026</p>

  <p class="font-medium text-foreground">Daftar Isi</p>
  <ol class="list-decimal space-y-1 pl-5 text-sm">
    <li><a href="#ringkasan" class="text-primary underline">Ringkasan</a></li>
    <li>
      <a href="#non-refundable" class="text-primary underline"
        >Semua Pembelian Bersifat Final</a
      >
    </li>
    <li>
      <a href="#pengecualian" class="text-primary underline">Pengecualian</a>
    </li>
    <li>
      <a href="#pembatalan" class="text-primary underline"
        >Pembatalan oleh sinnau</a
      >
    </li>

    <li>
      <a href="#proses" class="text-primary underline">Proses Pengajuan</a>
    </li>
    <li><a href="#kontak" class="text-primary underline">Kontak</a></li>
  </ol>

  <hr class="border-border" />

  <section id="ringkasan">
    <h2 class="text-lg font-semibold text-foreground">1. Ringkasan</h2>
    <p class="font-semibold italic">
      Ringkasan: Tidak ada pengembalian dana. Semua pembelian di sinnau bersifat
      final. Baca baik-baik sebelum membeli.
    </p>
    <p>
      Kebijakan ini menjelaskan ketentuan pengembalian dana untuk pembelian yang
      dilakukan melalui platform sinnau. Dengan melakukan pembelian, kamu
      menyetujui kebijakan ini sebagai bagian dari <a
        href="/terms"
        class="text-primary underline">Syarat & Ketentuan</a
      > kami.
    </p>
  </section>

  <section id="non-refundable">
    <h2 class="text-lg font-semibold text-foreground">
      2. Semua Pembelian Bersifat Final
    </h2>
    <p class="font-semibold italic">
      Ringkasan: Setiap pembelian yang sudah diselesaikan tidak dapat
      dikembalikan dalam bentuk apa pun — baik uang, kredit, maupun penukaran ke
      produk lain.
    </p>
    <p>
      Semua pembelian yang dilakukan melalui platform sinnau bersifat <strong
        >final dan tidak dapat dikembalikan (non-refundable)</strong
      >. Setelah transaksi diselesaikan, kamu tidak berhak atas pengembalian
      dana, baik sebagian maupun seluruhnya, untuk alasan apa pun, termasuk
      namun tidak terbatas pada:
    </p>
    <ul class="list-disc space-y-1 pl-5">
      <li>Perubahan pikiran setelah pembelian.</li>
      <li>Ketidakpuasan terhadap fitur atau konten yang dibeli.</li>
      <li>Kesalahan dalam memilih paket atau fitur.</li>
      <li>Fitur yang dibeli ternyata tidak sesuai dengan ekspektasi kamu.</li>
      <li>
        Ketidakmampuan menggunakan fitur karena keterbatasan perangkat atau
        koneksi internet.
      </li>
    </ul>
  </section>

  <section id="pengecualian">
    <h2 class="text-lg font-semibold text-foreground">3. Pengecualian</h2>
    <p class="font-semibold italic">
      Ringkasan: Satu-satunya pengecualian adalah jika diwajibkan oleh hukum. Di
      luar itu, tidak ada pengecualian.
    </p>
    <p>
      Satu-satunya keadaan di mana pengembalian dana dapat dipertimbangkan
      adalah jika secara tegas diwajibkan oleh peraturan perundang-undangan yang
      berlaku di Republik Indonesia. Dalam hal tersebut, Kami akan memproses
      pengembalian dana sesuai dengan ketentuan hukum yang berlaku.
    </p>
    <p>
      Beban pembuktian bahwa suatu pembelian wajib dikembalikan berdasarkan
      hukum sepenuhnya berada pada kamu sebagai pembeli. Kami berhak meminta
      dokumentasi dan bukti pendukung sebelum memproses pengembalian dana apa
      pun.
    </p>
  </section>

  <section id="pembatalan">
    <h2 class="text-lg font-semibold text-foreground">
      4. Pembatalan oleh sinnau
    </h2>
    <p class="font-semibold italic">
      Ringkasan: Jika sinnau yang membatalkan pembelian kamu (bukan kamu), maka
      kamu akan mendapatkan pengembalian dana penuh.
    </p>
    <p>
      Kami berhak membatalkan pesanan dan menolak pembayaran atas kebijakan Kami
      sendiri, termasuk namun tidak terbatas pada:
    </p>
    <ul class="list-disc space-y-1 pl-5">
      <li>Kesalahan penetapan harga pada platform.</li>
      <li>Dugaan penipuan atau aktivitas yang mencurigakan.</li>
      <li>
        Pelanggaran terhadap <a href="/terms" class="text-primary underline"
          >Syarat & Ketentuan</a
        > kami.
      </li>
      <li>Ketidakmampuan teknis untuk menyediakan fitur yang dibeli.</li>
    </ul>
    <p>
      <strong>Jika Kami yang membatalkan pembelian kamu</strong>, Kami akan
      mengembalikan dana sebesar jumlah yang telah kamu bayarkan melalui metode
      pembayaran yang sama yang kamu gunakan. Proses pengembalian akan dilakukan
      dalam waktu 14 (empat belas) hari kerja sejak pembatalan.
    </p>
  </section>

  <section id="proses">
    <h2 class="text-lg font-semibold text-foreground">5. Proses Pengajuan</h2>
    <p class="font-semibold italic">
      Ringkasan: Kalau kamu merasa berhak atas pengembalian dana berdasarkan
      pengecualian di atas, hubungi kami dengan bukti lengkap.
    </p>
    <p>
      Untuk mengajukan permohonan pengembalian dana berdasarkan pengecualian
      yang tercantum dalam kebijakan ini, kamu harus:
    </p>
    <ul class="list-disc space-y-1 pl-5">
      <li>
        Mengirim email ke <a
          href="mailto:{EMAIL_SUPPORT}"
          class="text-primary underline">{EMAIL_SUPPORT}</a
        > dengan subjek "Permohonan Pengembalian Dana".
      </li>
      <li>
        Menyertakan informasi: nama lengkap, email terdaftar di sinnau, tanggal
        pembelian, jumlah pembayaran, dan alasan permohonan.
      </li>
      <li>
        Melampirkan bukti pembayaran (tangkapan layar atau struk pembayaran).
      </li>
    </ul>
    <p>
      Kami akan meninjau permohonan kamu dan memberikan tanggapan dalam waktu 14
      (empat belas) hari kerja. Keputusan Kami bersifat final.
    </p>
  </section>

  <section id="kontak">
    <h2 class="text-lg font-semibold text-foreground">6. Kontak</h2>
    <p class="font-semibold italic">
      Ringkasan: Ada pertanyaan tentang kebijakan ini? Hubungi kami.
    </p>
    <p>
      Jika kamu memiliki pertanyaan atau membutuhkan klarifikasi mengenai
      Kebijakan Pengembalian Dana ini, silakan hubungi Kami melalui:
    </p>
    <ul class="list-disc space-y-1 pl-5">
      <li>
        Email: <a href="mailto:{EMAIL_SUPPORT}" class="text-primary underline"
          >{EMAIL_SUPPORT}</a
        >
      </li>
      <li>
        Instagram: <a
          href={INSTAGRAM_URL}
          class="text-primary underline"
          target="_blank"
          rel="noopener noreferrer">{INSTAGRAM_HANDLE}</a
        >
      </li>
    </ul>
  </section>
</StaticPage>
