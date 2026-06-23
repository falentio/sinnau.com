<script lang="ts">
  import Wordmark from "./wordmark.svelte";

  const cols = [
    {
      links: [
        { href: "/#features", label: "Fitur" },
        { href: "/#how-it-works", label: "Cara kerja" },
        { href: "/#retention", label: "Retensi" },
        { href: "/study/new/", label: "Buat modul" },
      ],
      title: "Produk",
    },
    {
      links: [
        { href: "/#faq", label: "FAQ" },
        { href: "/#stories", label: "Cerita pengguna" },
      ],
      title: "Sumber daya",
    },
    {
      links: [
        { href: "/login/", label: "Masuk" },
        { href: "/sign-up/", label: "Daftar" },
      ],
      title: "Akun",
    },
  ];
</script>

<footer class="border-t">
  <div class="mx-auto w-full max-w-[1240px] px-5 py-16 sm:px-8 sm:py-20">
    <div class="grid grid-cols-1 gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
      <div>
        <Wordmark />
        <p
          class="mt-5 max-w-[34ch] text-[13px] leading-relaxed text-[var(--landing-muted)]"
        >
          Unggah PDF, dapatkan sistem belajar lengkap. Flashcard, kuis, dan
          penjadwalan ulangan adaptif — semua dari satu alat.
        </p>
        <p class="mt-6 font-eyebrow text-[10px] text-[var(--landing-muted)]">
          Made in Indonesia
        </p>
      </div>

      {#each cols as col (col.title)}
        <div>
          <div class="font-eyebrow text-[10px] text-[var(--landing-muted)]">
            {col.title}
          </div>
          <ul class="mt-4 space-y-2.5">
            {#each col.links as link (link.href)}
              <li>
                <a
                  href={link.href}
                  class="text-[13px] text-[var(--landing-fg)] transition-opacity hover:opacity-60"
                >
                  {link.label}
                </a>
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </div>

    <div
      class="mt-14 flex flex-col items-start justify-between gap-3 border-t pt-6 text-[12px] text-[var(--landing-muted)] sm:flex-row sm:items-center"
    >
      <p>&copy; {new Date().getFullYear()} sinnau. Hak cipta dilindungi.</p>
      <p class="font-mono text-[11px]">v0.1 &middot; Belajar yang melekat.</p>
    </div>
  </div>
</footer>
