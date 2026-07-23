<script lang="ts">
  import StaticPage from "$lib/components/features/app/static-page.svelte";
  import {
    EMAIL_SUPPORT,
    INSTAGRAM_HANDLE,
    INSTAGRAM_URL,
  } from "$lib/constants";
</script>

<StaticPage
  title="Kebijakan Privasi · sinnau"
  description="Kebijakan privasi sinnau — bagaimana kami mengumpulkan, menggunakan, melindungi, dan menghormati data pribadi kamu."
  heading="Kebijakan Privasi"
>
  <p class="text-muted-foreground">Terakhir diperbarui: 23 Juli 2026</p>

  <p class="font-medium text-foreground">Daftar Isi</p>
  <ol class="list-decimal space-y-1 pl-5 text-sm">
    <li>
      <a href="#lingkup" class="text-primary underline">Lingkup & Penerimaan</a>
    </li>
    <li>
      <a href="#identitas" class="text-primary underline"
        >Identitas Pengendali Data</a
      >
    </li>
    <li>
      <a href="#data-dikumpulkan" class="text-primary underline"
        >Data Pribadi yang Kami Kumpulkan</a
      >
    </li>
    <li>
      <a href="#tujuan-dasar-hukum" class="text-primary underline"
        >Tujuan & Dasar Hukum Pemrosesan</a
      >
    </li>
    <li>
      <a href="#fitur-ai" class="text-primary underline">Fitur Berbasis AI</a>
    </li>
    <li>
      <a href="#pengungkapan" class="text-primary underline"
        >Pengungkapan Data kepada Pihak Ketiga</a
      >
    </li>
    <li>
      <a href="#retensi" class="text-primary underline"
        >Penyimpanan & Retensi Data</a
      >
    </li>
    <li>
      <a href="#transfer-data" class="text-primary underline"
        >Transfer Data Lintas Batas</a
      >
    </li>
    <li>
      <a href="#keamanan" class="text-primary underline">Keamanan Data</a>
    </li>
    <li>
      <a href="#anak" class="text-primary underline">Perlindungan Data Anak</a>
    </li>
    <li>
      <a href="#cookie" class="text-primary underline"
        >Cookie & Teknologi Pelacakan</a
      >
    </li>
    <li><a href="#kontak" class="text-primary underline">Kontak</a></li>
  </ol>

  <hr class="border-border" />

  <section id="lingkup">
    <h2 class="text-lg font-semibold text-foreground">
      1. Lingkup & Penerimaan
    </h2>
    <p class="font-semibold italic">
      Ringkasan: Kebijakan ini menjelaskan bagaimana kami mengelola data pribadi
      kamu. Dengan menggunakan sinnau, kamu menyetujui praktik yang dijelaskan
      di sini. Kebijakan ini adalah bagian tidak terpisahkan dari <a
        href="/terms"
        class="text-primary underline">Syarat & Ketentuan</a
      > kami.
    </p>
    <p>
      Kebijakan Privasi ini menjelaskan bagaimana sinnau ("Kami") mengumpulkan,
      menggunakan, mengungkapkan, menyimpan, dan melindungi data pribadi kamu
      saat kamu menggunakan platform sinnau ("Layanan"). Kebijakan ini disusun
      berdasarkan Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data
      Pribadi (UU PDP) dan Undang-Undang Nomor 1 Tahun 2024 tentang Perubahan
      Kedua atas UU ITE.
    </p>
    <p>
      Kebijakan ini berlaku untuk semua Pengguna Layanan, termasuk Pengguna
      terdaftar, pengunjung situs, dan Pengguna anak dengan persetujuan orang
      tua atau wali. Dengan mengakses atau menggunakan Layanan, kamu mengakui
      telah membaca, memahami, dan menyetujui praktik yang dijelaskan dalam
      Kebijakan ini.
    </p>
  </section>

  <section id="identitas">
    <h2 class="text-lg font-semibold text-foreground">
      2. Identitas Pengendali Data
    </h2>
    <p class="font-semibold italic">
      Ringkasan: sinnau adalah pengendali data pribadi kamu. Kalau ada
      pertanyaan tentang data kamu, inilah siapa kami dan bagaimana menghubungi
      kami.
    </p>
    <p>
      Untuk keperluan UU PDP, sinnau bertindak sebagai Pengendali Data Pribadi.
      Informasi kontak Kami tercantum di bagian <a
        href="#kontak"
        class="text-primary underline">Kontak</a
      > di bawah. Jika kamu memiliki pertanyaan mengenai pemrosesan data pribadi atau
      ingin menggunakan hak kamu sebagai Subjek Data Pribadi, silakan hubungi Kami
      melalui saluran yang tersedia.
    </p>
  </section>

  <section id="data-dikumpulkan">
    <h2 class="text-lg font-semibold text-foreground">
      3. Data Pribadi yang Kami Kumpulkan
    </h2>
    <p class="font-semibold italic">
      Ringkasan: Kami mengumpulkan data yang kamu berikan (nama, email), data
      otomatis (IP, jenis perangkat), data belajar (set studi, hasil kuis), dan
      data pembayaran. Kami hanya mengumpulkan apa yang diperlukan.
    </p>
    <p>
      Sesuai dengan prinsip pembatasan pengumpulan dalam Pasal 16 UU PDP, Kami
      hanya mengumpulkan data pribadi yang relevan dan diperlukan untuk
      menyediakan Layanan. Berikut adalah kategori data yang Kami kumpulkan:
    </p>

    <h3 class="mt-3 font-semibold text-foreground">
      A. Data yang Kamu Berikan Langsung
    </h3>
    <ul class="list-disc space-y-1 pl-5">
      <li>
        <strong>Data Akun:</strong> Nama, alamat email, nama pengguna, kata sandi
        (tersimpan dalam bentuk hash).
      </li>
      <li>
        <strong>Data Profil:</strong> Foto profil, informasi bio, preferensi belajar,
        dan informasi lain yang kamu pilih untuk ditambahkan ke profil.
      </li>
      <li>
        <strong>Konten Pengguna:</strong> Set Studi, kartu flashcard, pertanyaan kuis,
        jawaban, catatan, dan semua konten yang kamu buat atau unggah ke Layanan.
      </li>
      <li>
        <strong>Data Komunikasi:</strong> Pesan yang kamu kirimkan kepada Kami melalui
        email, formulir kontak, atau media sosial.
      </li>
    </ul>

    <h3 class="mt-3 font-semibold text-foreground">
      B. Data yang Dikumpulkan Secara Otomatis
    </h3>
    <ul class="list-disc space-y-1 pl-5">
      <li>
        <strong>Data Teknis:</strong> Alamat IP, jenis dan versi browser, sistem operasi,
        jenis perangkat, pengaturan zona waktu, dan pengidentifikasi perangkat.
      </li>
      <li>
        <strong>Data Penggunaan:</strong> Halaman yang dikunjungi, fitur yang digunakan,
        durasi sesi belajar, klik, gulir, dan interaksi dengan Layanan.
      </li>
      <li>
        <strong>Data Pembelajaran:</strong> Set Studi yang dipelajari, hasil kuis,
        skor, kemajuan belajar, pengulangan, dan pola belajar.
      </li>
      <li>
        <strong>Data Log:</strong> Waktu akses, halaman rujukan, istilah pencarian,
        dan data log server standar.
      </li>
    </ul>

    <h3 class="mt-3 font-semibold text-foreground">C. Data Pembayaran</h3>
    <ul class="list-disc space-y-1 pl-5">
      <li>
        Saat kamu melakukan pembelian, Kami mengumpulkan informasi transaksi
        seperti jenis paket yang dibeli, jumlah pembayaran, waktu transaksi, dan
        status pembayaran.
      </li>
      <li>
        Data pembayaran sensitif (nomor kartu kredit/debit, detail rekening
        bank) diproses langsung oleh penyedia layanan pembayaran pihak ketiga
        (payment gateway) dan <strong>tidak disimpan</strong> di server Kami.
      </li>
    </ul>

    <h3 class="mt-3 font-semibold text-foreground">D. Data Pihak Ketiga</h3>
    <ul class="list-disc space-y-1 pl-5">
      <li>
        Jika kamu mendaftar atau masuk menggunakan layanan pihak ketiga (seperti
        Google), Kami menerima informasi profil dasar dari penyedia tersebut
        (nama, email, foto profil) sesuai dengan pengaturan izin yang kamu
        berikan.
      </li>
    </ul>
  </section>

  <section id="tujuan-dasar-hukum">
    <h2 class="text-lg font-semibold text-foreground">
      4. Tujuan & Dasar Hukum Pemrosesan
    </h2>
    <p class="font-semibold italic">
      Ringkasan: Kami menggunakan data kamu untuk menjalankan sinnau,
      meningkatkan layanan, memproses pembayaran, dan berkomunikasi dengan kamu.
      Setiap pemrosesan punya dasar hukum yang jelas.
    </p>
    <p>
      Sesuai dengan Pasal 20 UU PDP, Kami memproses data pribadi kamu
      berdasarkan dasar hukum berikut:
    </p>

    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr class="border-b border-border">
            <th class="px-2 py-1.5 text-left font-semibold">Tujuan</th>
            <th class="px-2 py-1.5 text-left font-semibold">Data</th>
            <th class="px-2 py-1.5 text-left font-semibold">Dasar Hukum</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-b border-border">
            <td class="px-2 py-1.5 align-top"
              >Penyediaan Layanan (membuat Akun, menyimpan Set Studi,
              menjalankan kuis, flashcard)</td
            >
            <td class="px-2 py-1.5 align-top"
              >Data Akun, Konten Pengguna, Data Teknis</td
            >
            <td class="px-2 py-1.5 align-top"
              >Persetujuan (Pasal 20 ayat 2 huruf a)</td
            >
          </tr>
          <tr class="border-b border-border">
            <td class="px-2 py-1.5 align-top"
              >Peningkatan & pengembangan Layanan</td
            >
            <td class="px-2 py-1.5 align-top"
              >Data Penggunaan, Data Pembelajaran, Data Teknis</td
            >
            <td class="px-2 py-1.5 align-top"
              >Kepentingan yang Sah (Pasal 20 ayat 2 huruf c)</td
            >
          </tr>
          <tr class="border-b border-border">
            <td class="px-2 py-1.5 align-top">Pemrosesan pembayaran</td>
            <td class="px-2 py-1.5 align-top">Data Pembayaran</td>
            <td class="px-2 py-1.5 align-top"
              >Pelaksanaan Perjanjian (Pasal 20 ayat 2 huruf b)</td
            >
          </tr>
          <tr class="border-b border-border">
            <td class="px-2 py-1.5 align-top">Komunikasi & dukungan pengguna</td
            >
            <td class="px-2 py-1.5 align-top">Data Akun, Data Komunikasi</td>
            <td class="px-2 py-1.5 align-top"
              >Kepentingan yang Sah (Pasal 20 ayat 2 huruf c)</td
            >
          </tr>
          <tr class="border-b border-border">
            <td class="px-2 py-1.5 align-top"
              >Keamanan & pencegahan penyalahgunaan</td
            >
            <td class="px-2 py-1.5 align-top">Data Teknis, Data Log</td>
            <td class="px-2 py-1.5 align-top"
              >Kepentingan yang Sah (Pasal 20 ayat 2 huruf c)</td
            >
          </tr>
          <tr>
            <td class="px-2 py-1.5 align-top">Kepatuhan hukum</td>
            <td class="px-2 py-1.5 align-top">Semua data yang relevan</td>
            <td class="px-2 py-1.5 align-top"
              >Kewajiban Hukum (Pasal 20 ayat 2 huruf d)</td
            >
          </tr>
        </tbody>
      </table>
    </div>
    <p class="mt-3">
      Kami <strong>tidak</strong> menjual data pribadi kamu kepada pihak ketiga.
      Kami <strong>tidak</strong> menggunakan data pribadi kamu untuk iklan bertarget
      atau pemrofilan komersial.
    </p>
  </section>

  <section id="fitur-ai">
    <h2 class="text-lg font-semibold text-foreground">5. Fitur Berbasis AI</h2>
    <p class="font-semibold italic">
      Ringkasan: sinnau menggunakan AI untuk membantu belajar kamu. Data yang
      dikirim ke AI sudah dibersihkan dari informasi pribadi. Kami tidak melatih
      model AI dengan data kamu.
    </p>
    <p>
      Layanan sinnau mencakup Fitur AI yang menggunakan model kecerdasan buatan
      dari penyedia pihak ketiga. Bagian ini menjelaskan bagaimana data kamu
      ditangani saat kamu menggunakan Fitur AI:
    </p>
    <ul class="list-disc space-y-1 pl-5">
      <li>
        <strong>Data yang dikirim ke AI:</strong> Saat kamu menggunakan Fitur AI (misalnya,
        membuat Set Studi otomatis atau menghasilkan kuis), teks masukan (prompt)
        kamu dikirim ke penyedia layanan AI pihak ketiga. Kami berupaya untuk menghilangkan
        atau menyamarkan data pribadi dari masukan sebelum dikirim.
      </li>
      <li>
        <strong>Tidak untuk pelatihan model:</strong> Sesuai dengan ketentuan
        penyedia layanan AI, data yang dikirim melalui API
        <strong>tidak digunakan</strong>
        untuk melatih atau meningkatkan model AI mereka. Kami juga
        <strong>tidak</strong> menggunakan Konten Pengguna untuk melatih model AI
        Kami sendiri atau pihak ketiga.
      </li>
      <li>
        <strong>Penyimpanan:</strong> Data masukan dan keluaran AI disimpan oleh penyedia
        AI maksimal 30 hari untuk keperluan pemantauan penyalahgunaan, kemudian dihapus
        secara otomatis.
      </li>
      <li>
        <strong>Data anak:</strong> Untuk Pengguna anak (di bawah 18 tahun), data
        yang dikirim ke Fitur AI dibersihkan secara lebih ketat dan tidak menyertakan
        pengidentifikasi apa pun.
      </li>
      <li>
        <strong>Rekomendasi:</strong> Kamu tidak boleh memasukkan data pribadi, informasi
        sensitif, atau rahasia ke dalam Fitur AI. Gunakan Fitur AI hanya untuk konten
        belajar.
      </li>
    </ul>
  </section>

  <section id="pengungkapan">
    <h2 class="text-lg font-semibold text-foreground">
      6. Pengungkapan Data kepada Pihak Ketiga
    </h2>
    <p class="font-semibold italic">
      Ringkasan: Kami hanya membagikan data kamu jika diperlukan untuk
      menjalankan Layanan (seperti penyedia AI atau pemroses pembayaran) atau
      jika diwajibkan oleh hukum. Kami tidak menjual data kamu.
    </p>
    <p>
      Kami dapat mengungkapkan data pribadi kamu kepada pihak ketiga dalam
      situasi berikut:
    </p>
    <ul class="list-disc space-y-1 pl-5">
      <li>
        <strong>Penyedia Layanan:</strong> Pihak ketiga yang membantu Kami mengoperasikan
        Layanan, termasuk penyedia hosting, penyedia API AI, pemroses pembayaran,
        dan alat analitik. Pihak ketiga ini terikat oleh perjanjian kerahasiaan dan
        pemrosesan data serta hanya dapat menggunakan data sesuai instruksi Kami.
      </li>
      <li>
        <strong>Kepatuhan Hukum:</strong> Jika diwajibkan oleh hukum, peraturan, proses
        hukum, atau permintaan pemerintah yang sah, Kami dapat mengungkapkan data
        kamu.
      </li>
      <li>
        <strong>Perlindungan Hak:</strong> Jika Kami memiliki keyakinan dengan itikad
        baik bahwa pengungkapan diperlukan untuk melindungi hak, properti, atau keselamatan
        sinnau, Pengguna, atau publik.
      </li>
      <li>
        <strong>Transfer Bisnis:</strong> Dalam hal merger, akuisisi, atau penjualan
        aset, data kamu dapat dialihkan sebagai bagian dari transaksi tersebut. Kamu
        akan diberitahu sebelum data kamu dialihkan dan tunduk pada Kebijakan Privasi
        yang berbeda.
      </li>
    </ul>
    <p>
      Kami mewajibkan semua pihak ketiga untuk menghormati keamanan data pribadi
      kamu dan memprosesnya sesuai dengan hukum yang berlaku. Kami tidak
      mengizinkan penyedia layanan untuk menggunakan data pribadi kamu untuk
      tujuan mereka sendiri.
    </p>
  </section>

  <section id="retensi">
    <h2 class="text-lg font-semibold text-foreground">
      7. Penyimpanan & Retensi Data
    </h2>
    <p class="font-semibold italic">
      Ringkasan: Kami menyimpan data kamu selama Akun aktif, plus hingga 5 tahun
      setelah Akun ditutup sesuai ketentuan hukum Indonesia, kecuali kamu
      meminta penghapusan lebih awal.
    </p>
    <p>
      Kami menyimpan data pribadi kamu selama diperlukan untuk memenuhi tujuan
      yang dijelaskan dalam Kebijakan ini, dengan ketentuan sebagai berikut:
    </p>
    <ul class="list-disc space-y-1 pl-5">
      <li>
        <strong>Akun Aktif:</strong> Data disimpan selama Akun kamu aktif dan kamu
        terus menggunakan Layanan.
      </li>
      <li>
        <strong>Setelah Penutupan Akun:</strong> Data disimpan hingga 5 (lima) tahun
        setelah Akun ditutup atau persetujuan ditarik, sesuai dengan Peraturan Menteri
        Komunikasi dan Informatika Nomor 20 Tahun 2016, kecuali kamu meminta penghapusan
        lebih awal sesuai dengan hak kamu sebagai Subjek Data.
      </li>
      <li>
        <strong>Data Pembayaran:</strong> Catatan transaksi disimpan sesuai dengan
        ketentuan perpajakan yang berlaku (umumnya 10 tahun).
      </li>
      <li>
        <strong>Data yang Dianonimkan:</strong> Data yang telah dianonimkan atau diagregasi
        (tidak dapat mengidentifikasi kamu) dapat disimpan tanpa batas waktu untuk
        keperluan analitik dan peningkatan Layanan.
      </li>
    </ul>
    <p>
      Setelah masa retensi berakhir atau atas permintaan kamu yang sah, Kami
      akan menghapus atau menganonimkan data pribadi kamu, kecuali jika
      penyimpanan lebih lanjut diwajibkan oleh hukum.
    </p>
  </section>

  <section id="transfer-data">
    <h2 class="text-lg font-semibold text-foreground">
      8. Transfer Data Lintas Batas
    </h2>
    <p class="font-semibold italic">
      Ringkasan: Data kamu mungkin diproses di luar Indonesia karena Kami
      menggunakan penyedia layanan global. Kami memastikan perlindungan yang
      setara melalui perjanjian kontrak.
    </p>
    <p>
      Data pribadi kamu mungkin ditransfer, disimpan, dan diproses di luar
      wilayah Indonesia oleh penyedia layanan Kami (seperti penyedia API AI dan
      hosting cloud). Beberapa negara tujuan mungkin memiliki tingkat
      perlindungan data yang berbeda dari Indonesia.
    </p>
    <p>
      Untuk setiap transfer lintas batas, Kami menerapkan perlindungan yang
      memadai sesuai dengan Pasal 56 UU PDP, termasuk namun tidak terbatas pada:
    </p>
    <ul class="list-disc space-y-1 pl-5">
      <li>
        Klausula Kontrak Baku (Standard Contractual Clauses) dengan penyedia
        layanan.
      </li>
      <li>
        Memastikan negara tujuan memiliki tingkat perlindungan data yang setara
        atau penyedia layanan memiliki sertifikasi perlindungan data yang
        diakui.
      </li>
      <li>
        Memperoleh persetujuan eksplisit kamu untuk transfer tertentu jika
        diperlukan.
      </li>
    </ul>
  </section>

  <section id="keamanan">
    <h2 class="text-lg font-semibold text-foreground">9. Keamanan Data</h2>
    <p class="font-semibold italic">
      Ringkasan: Kami melindungi data kamu dengan langkah-langkah teknis dan
      organisasi yang wajar. Tapi tidak ada sistem yang 100% aman — laporkan
      jika kamu mencurigai pelanggaran.
    </p>
    <p>
      Kami menerapkan langkah-langkah keamanan teknis dan organisasi yang wajar
      untuk melindungi data pribadi kamu dari akses tidak sah, perubahan,
      pengungkapan, atau perusakan, termasuk:
    </p>
    <ul class="list-disc space-y-1 pl-5">
      <li>
        Enkripsi data saat transit (TLS/SSL) dan saat tersimpan (at rest).
      </li>
      <li>Kata sandi disimpan menggunakan fungsi hash satu arah yang aman.</li>
      <li>
        Pembatasan akses ke data pribadi hanya untuk personel yang memerlukan.
      </li>
      <li>
        Pemantauan sistem secara berkala untuk mendeteksi kerentanan dan
        aktivitas mencurigakan.
      </li>
      <li>
        Peninjauan keamanan berkala terhadap penyedia layanan pihak ketiga.
      </li>
    </ul>
    <p>
      Meskipun Kami berupaya melindungi data kamu, tidak ada metode transmisi
      melalui internet atau penyimpanan elektronik yang 100% aman. Kami tidak
      dapat menjamin keamanan absolut dari data yang dikirimkan ke Layanan. Jika
      kamu mencurigai adanya pelanggaran keamanan, segera hubungi Kami.
    </p>
  </section>

  <section id="anak">
    <h2 class="text-lg font-semibold text-foreground">
      10. Perlindungan Data Anak
    </h2>
    <p class="font-semibold italic">
      Ringkasan: Kami melindungi data anak dengan lebih ketat. Anak di bawah 18
      tahun memerlukan persetujuan orang tua. Kami tidak membuat profil atau
      menargetkan iklan kepada anak.
    </p>
    <p>
      Sesuai dengan Pasal 16A UU 1/2024, Kami berkomitmen untuk melindungi
      privasi dan data pribadi Pengguna anak:
    </p>
    <ul class="list-disc space-y-1 pl-5">
      <li>
        Pengguna berusia di bawah 18 tahun wajib memperoleh persetujuan orang
        tua atau wali sebelum menggunakan Layanan.
      </li>
      <li>
        Orang tua atau wali dapat meminta akses, peninjauan, atau penghapusan
        data anak kapan saja melalui kontak di bawah.
      </li>
      <li>
        Kami tidak membuat profil Pengguna anak untuk tujuan komersial atau
        penawaran produk/layanan.
      </li>
      <li>
        Kami tidak mengumpulkan data lokasi yang tepat (precise geolocation)
        dari Pengguna anak.
      </li>
      <li>
        Kami tidak menampilkan iklan bertarget (targeted advertising) kepada
        Pengguna anak.
      </li>
      <li>
        Pengaturan privasi default untuk Akun anak diatur ke tingkat tertinggi.
      </li>
      <li>
        Data usia yang dikumpulkan untuk verifikasi hanya digunakan untuk tujuan
        tersebut dan dihapus setelah verifikasi selesai.
      </li>
      <li>
        Orang tua atau wali berhak melaporkan dugaan penyalahgunaan yang
        melanggar hak anak melalui mekanisme kontak di bawah.
      </li>
    </ul>
  </section>

  <section id="cookie">
    <h2 class="text-lg font-semibold text-foreground">
      11. Cookie & Teknologi Pelacakan
    </h2>
    <p class="font-semibold italic">
      Ringkasan: Kami menggunakan cookie seperlunya — hanya untuk fungsionalitas
      dan analitik, bukan untuk iklan. Kamu bisa mengontrolnya di pengaturan
      browser.
    </p>
    <p>sinnau menggunakan cookie dan teknologi pelacakan serupa untuk:</p>
    <ul class="list-disc space-y-1 pl-5">
      <li>
        <strong>Cookie Esensial:</strong> Diperlukan agar Layanan berfungsi dengan
        baik — mengelola sesi login, mengingat preferensi, dan menjaga keamanan.
      </li>
      <li>
        <strong>Cookie Analitik:</strong> Membantu Kami memahami bagaimana Pengguna
        berinteraksi dengan Layanan agar Kami dapat meningkatkannya (misalnya, halaman
        mana yang paling sering dikunjungi, fitur mana yang paling banyak digunakan).
      </li>
    </ul>
    <p>
      Kami <strong>tidak</strong> menggunakan cookie pemasaran/iklan atau teknologi
      pelacakan pihak ketiga untuk iklan bertarget. Kamu dapat mengontrol cookie melalui
      pengaturan browser kamu — kamu dapat memblokir, menghapus, atau mendapatkan
      peringatan saat cookie dipasang. Harap diperhatikan bahwa memblokir cookie esensial
      dapat memengaruhi fungsi Layanan.
    </p>
  </section>

  <section id="kontak">
    <h2 class="text-lg font-semibold text-foreground">12. Kontak</h2>
    <p class="font-semibold italic">
      Ringkasan: Ada pertanyaan tentang data kamu? Ingin menggunakan hak Subjek
      Data? Hubungi kami — kami siap membantu.
    </p>
    <p>
      Jika kamu memiliki pertanyaan, permintaan terkait data pribadi, atau ingin
      menggunakan hak kamu sebagai Subjek Data Pribadi, silakan hubungi Kami
      melalui:
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
