<script lang="ts">
  import {
    ArrowRight01Icon,
    FileUploadIcon,
  } from "$lib/components/features/icons";
  import Button from "$lib/components/ui/button/button.svelte";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  import { reveal } from "./reveal";
</script>

<section id="top" class="relative overflow-hidden pt-14 sm:pt-16 lg:pt-20">
  <div
    class="pointer-events-none absolute inset-x-0 -top-32 h-[600px] bg-[radial-gradient(50%_45%_at_50%_30%,color-mix(in_oklch,var(--landing-accent)_8%,transparent),transparent_70%)]"
    aria-hidden="true"
  ></div>

  <div class="relative mx-auto w-full max-w-[1240px] px-5 sm:px-8">
    <div
      class="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-14"
    >
      <div class="max-w-[36rem]" use:reveal>
        <div
          class="font-eyebrow mb-5 inline-flex items-center gap-1.5 rounded-full border bg-[var(--landing-surface-subtle)] px-3 py-1 text-[10px] text-[var(--landing-muted)]"
        >
          <span
            class="inline-block size-1.5 rounded-full bg-[var(--landing-accent)]"
          ></span>
          Flashcard & kuis dari PDF
        </div>

        <h1
          class="font-display text-[36px] leading-[0.96] tracking-[-0.035em] text-balance sm:text-[48px] lg:text-[58px]"
        >
          Ingat lebih lama, belajar lebih sedikit.<br />
          <span class="text-[var(--landing-accent)] italic"
            >Cukup unggah PDF.</span
          >
        </h1>

        <p
          class="mt-5 max-w-[40ch] text-[15px] leading-relaxed text-[var(--landing-muted)] sm:text-[16px] text-pretty"
        >
          AI mengubah catatan kuliah, slide, atau bab buku teks jadi kartu dan
          kuis. Jadwal ulangannya otomatis pas sebelum Anda lupa.
        </p>

        <div class="mt-8 flex flex-wrap items-center gap-3">
          <Button href="/login/" size="lg" class="px-5">
            Buat akun gratis
            <HugeiconsIcon icon={ArrowRight01Icon} data-icon="inline-end" />
          </Button>
          <Button href="/#how-it-works" size="lg" variant="ghost" class="px-5">
            Lihat cara kerjanya
          </Button>
        </div>

        <p class="mt-4 text-[12px] text-[var(--landing-muted)]">
          Tanpa kartu kredit &middot; 3 pelajaran pertama gratis
        </p>
        <p class="mt-2 text-[12px] text-[var(--landing-muted)]">
          Digunakan oleh ribuan mahasiswa Indonesia
        </p>
      </div>

      <div class="relative" use:reveal={{ delay: 150 }}>
        <div
          class="pointer-events-none absolute -inset-6 -z-10 rounded-[28px] bg-[linear-gradient(180deg,color-mix(in_oklch,var(--landing-fg)_2%,transparent),transparent_60%)]"
          aria-hidden="true"
        ></div>

        <div
          class="overflow-hidden rounded-[20px] border bg-[var(--landing-card)] shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
        >
          <!-- macOS window chrome -->
          <div class="flex items-center gap-1.5 border-b px-4 py-2.5">
            <span
              class="size-2 rounded-full bg-[var(--landing-border)]"
              aria-hidden="true"
            ></span>
            <span
              class="size-2 rounded-full bg-[var(--landing-border)]"
              aria-hidden="true"
            ></span>
            <span
              class="size-2 rounded-full bg-[var(--landing-border)]"
              aria-hidden="true"
            ></span>
            <span
              class="ml-2 font-mono text-[9.5px] text-[var(--landing-muted)]"
              >module.pdf &mdash; sinnau</span
            >
          </div>

          <div class="p-5 sm:p-7">
            <!-- Upload row -->
            <div
              class="flex items-center gap-3 rounded-[12px] border border-dashed bg-[var(--landing-surface-subtle)] px-4 py-3"
            >
              <div
                class="grid size-9 shrink-0 place-items-center rounded-[8px] bg-[var(--landing-accent-soft)] text-[var(--landing-accent-ink)]"
              >
                <HugeiconsIcon icon={FileUploadIcon} class="size-4" />
              </div>
              <div class="min-w-0 flex-1">
                <div
                  class="truncate text-[13px] font-medium text-[var(--landing-fg)]"
                >
                  Cognitive Psychology &mdash; Chapter 4.pdf
                </div>
                <div
                  class="mt-0.5 font-mono text-[10px] text-[var(--landing-muted)]"
                >
                  2.4 MB &middot; Memproses&hellip;
                </div>
              </div>
              <div
                class="inline-flex items-center gap-1 rounded-full bg-[var(--landing-accent-soft)] px-2.5 py-0.5 font-mono text-[9px] text-[var(--landing-accent-ink)]"
              >
                <span
                  class="inline-block size-1.5 rounded-full bg-[var(--landing-accent)]"
                ></span>
                Sedang membuat
              </div>
            </div>

            <!-- Generated cards preview -->
            <div class="mt-4 space-y-2">
              {#each ["Apa itu spacing effect?", "Jelaskan kapasitas memori kerja.", "Apa itu encoding specificity?"] as q, i (q)}
                <div
                  class="flex items-start gap-2.5 rounded-[10px] border bg-[var(--landing-bg)] p-3"
                >
                  <span
                    class="grid size-5 shrink-0 place-items-center rounded-[6px] bg-[var(--landing-surface-subtle)] font-mono text-[9px] text-[var(--landing-muted)]"
                  >
                    {i + 1}
                  </span>
                  <div>
                    <p
                      class="text-[12.5px] leading-snug font-medium text-[var(--landing-fg)]"
                    >
                      {q}
                    </p>
                    <p
                      class="mt-0.5 text-[11px] leading-relaxed text-[var(--landing-muted)]"
                    >
                      Klik untuk lihat jawaban
                    </p>
                  </div>
                </div>
              {/each}
            </div>

            <!-- FSRS badge -->
            <div
              class="mt-4 flex items-center gap-3 rounded-[10px] border bg-[var(--landing-surface-subtle)] px-3.5 py-2"
            >
              <span class="font-mono text-[10px] text-[var(--landing-muted)]"
                >Ulangan berikutnya</span
              >
              <span
                class="font-mono text-[11px] font-medium text-[var(--landing-fg)]"
              >
                Besok &middot; 09:00
              </span>
              <span
                class="ml-auto rounded-full border bg-[var(--landing-card)] px-2 py-0.5 font-mono text-[9px] text-[var(--landing-muted)]"
              >
                FSRS v4
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
