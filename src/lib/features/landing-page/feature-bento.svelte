<script lang="ts">
  import {
    Cards01Icon,
    FileUploadIcon,
    Quiz01Icon,
  } from "$lib/components/features/icons";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  import { reveal } from "./reveal";

  const features = [
    {
      body: "Yang dulu perlu berjam-jam mengetik, sekarang selesai dalam <2 menit. Unggah PDF, AI langsung menyusun flashcard dan kuis untuk tiap bab.",
      icon: FileUploadIcon,
      id: "pdf",
      span: "lg:col-span-7 lg:row-span-2",
      stat: "< 2 mnt",
      statLabel: "per bab",
      title: "PDF jadi flashcard & kuis siap pakai.",
    },
    {
      body: "Sistem melacak setiap kartu yang pernah Anda jawab. Ia tahu mana yang mulai pudar dan menjadwalkan ulangan tepat sebelum Anda lupa.",
      icon: Cards01Icon,
      id: "fsrs",
      span: "lg:col-span-5",
      stat: "Terjadwal",
      statLabel: "otomatis per kartu",
      title: "Ulangan di momen Anda mulai lupa.",
    },
    {
      body: "Setiap kartu yang terlewat muncul lagi sampai benar-benar Anda kuasai. Kuis fokus ke konsep yang masih Anda lemah di setiap sesi.",
      icon: Quiz01Icon,
      id: "quiz",
      span: "lg:col-span-5",
      stat: "Fokus",
      statLabel: "setiap sesi",
      title: "Kuis yang fokus di jawaban salah Anda.",
    },
  ] as const;
</script>

<section
  id="features"
  class="relative mx-auto w-full max-w-[1240px] px-5 pt-28 sm:px-8 sm:pt-36 lg:pt-44"
>
  <div class="max-w-[40rem]" use:reveal>
    <h2
      class="font-display text-[32px] leading-[1.04] tracking-[-0.03em] sm:text-[42px] text-balance"
    >
      Dari PDF ke hafal.<br />Satu alat.
    </h2>
    <p
      class="mt-4 max-w-[42ch] text-[14px] leading-relaxed text-[var(--landing-muted)] text-pretty"
    >
      Dari PDF sampai hafal. Tanpa berpindah alat.
    </p>
  </div>

  <div
    class="mt-12 grid grid-cols-1 gap-3 lg:grid-cols-12 lg:auto-rows-[minmax(240px,auto)] lg:gap-4"
  >
    {#each features as f, i (f.id)}
      <article
        use:reveal={{ delay: i * 100 }}
        class={[
          "group relative flex flex-col justify-between overflow-hidden rounded-[20px] border bg-[var(--landing-card)] p-6 sm:p-8",
          f.span,
        ]}
      >
        <div>
          <div class="flex items-start justify-between gap-4">
            <div
              class="grid size-10 shrink-0 place-items-center rounded-[10px] bg-[var(--landing-surface-subtle)] text-[var(--landing-fg)]"
            >
              <HugeiconsIcon icon={f.icon} class="size-4.5" />
            </div>
            <div class="text-right">
              <div
                class="font-display text-[22px] leading-none tracking-[-0.02em] text-[var(--landing-fg)] sm:text-[26px]"
              >
                {f.stat}
              </div>
              <div
                class="mt-0.5 font-eyebrow text-[9px] text-[var(--landing-muted)]"
              >
                {f.statLabel}
              </div>
            </div>
          </div>

          <div class="mt-7">
            <h3
              class="font-display text-[20px] leading-[1.15] tracking-[-0.02em] sm:text-[24px] text-balance"
            >
              {f.title}
            </h3>
            <p
              class="mt-3 max-w-[42ch] text-[13.5px] leading-relaxed text-[var(--landing-muted)]"
            >
              {f.body}
            </p>
          </div>
        </div>

        {#if f.id === "pdf"}
          <div
            class="mt-8 grid grid-cols-3 gap-2 rounded-[14px] border bg-[var(--landing-surface-subtle)] p-3"
            aria-hidden="true"
          >
            <div class="col-span-1 space-y-2">
              <div
                class="h-2 w-full rounded-sm bg-[var(--landing-border)]"
              ></div>
              <div
                class="h-2 w-4/5 rounded-sm bg-[var(--landing-border)]"
              ></div>
              <div
                class="h-2 w-3/5 rounded-sm bg-[var(--landing-border)]"
              ></div>
            </div>
            <div class="col-span-2 space-y-2">
              {#each [1, 2, 3, 4] as _}
                <div class="flex items-center gap-2">
                  <span
                    class="grid size-3.5 shrink-0 place-items-center rounded bg-[var(--landing-accent-soft)]"
                  >
                    <span
                      class="block h-1 w-1 rounded-full bg-[var(--landing-accent-ink)]"
                    ></span>
                  </span>
                  <div
                    class="h-2 w-full rounded-sm bg-[var(--landing-border)]"
                  ></div>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        {#if f.id === "fsrs"}
          <div
            class="mt-8 rounded-[14px] border bg-[var(--landing-surface-subtle)] p-4"
            aria-hidden="true"
          >
            <div class="flex items-end gap-1" style="height:80px">
              {#each [12, 28, 45, 18, 55, 32, 8] as h, j (j)}
                <div
                  class="flex-1 bg-primary rounded-t-sm transition-all duration-300 group-hover:opacity-80"
                  style="height:{h}px;"
                ></div>
              {/each}
            </div>
            <div
              class="mt-2 flex items-center justify-around font-mono text-[9px] text-[var(--landing-muted)]"
            >
              <span>Sen</span><span>Sel</span><span>Rab</span><span>Kam</span>
              <span>Jum</span><span>Sab</span><span>Min</span>
            </div>
          </div>
        {/if}

        {#if f.id === "quiz"}
          <div class="mt-8 space-y-2" aria-hidden="true">
            {#each [{ correct: true, text: "Spacing effect meningkatkan retensi jangka panjang dengan mendistribusikan sesi belajar dari waktu ke waktu." }, { correct: false, text: "Sistem kebut semalam (SKS) adalah cara paling efisien untuk menyandikan informasi ke memori jangka panjang." }, { correct: true, text: "Retrieval practice memperkuat jejak ingatan lebih efektif daripada membaca ulang." }] as q, k (k)}
              <div
                class="flex items-start gap-2.5 rounded-[10px] border p-3 {q.correct
                  ? 'bg-[var(--landing-accent-soft)] border-[color-mix(in_oklch,var(--landing-accent)_20%,transparent)]'
                  : 'bg-[var(--landing-surface-subtle)]'}"
              >
                <span
                  class="grid size-5 shrink-0 place-items-center rounded-full border text-[9px] font-mono {q.correct
                    ? 'bg-[var(--landing-accent-ink)] text-[var(--landing-bg)] border-transparent'
                    : 'bg-transparent text-[var(--landing-muted)]'}"
                >
                  {q.correct ? "\u2713" : "\u2717"}
                </span>
                <span class="text-[12px] leading-snug text-[var(--landing-fg)]"
                  >{q.text}</span
                >
              </div>
            {/each}
          </div>
        {/if}
      </article>
    {/each}
  </div>
</section>
