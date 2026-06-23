<script lang="ts">
  import { PieChartIcon } from "$lib/components/features/icons";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  import { reveal } from "./reveal";
</script>

<section
  id="retention"
  class="relative mx-auto w-full max-w-[1240px] px-5 pt-28 sm:px-8 sm:pt-36 lg:pt-44"
>
  <div class="overflow-hidden rounded-[20px] border bg-[var(--landing-card)]">
    <div class="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr]">
      <div class="p-8 sm:p-10 lg:p-12" use:reveal>
        <div
          class="inline-flex items-center gap-1.5 rounded-md border bg-[var(--landing-surface-subtle)] px-2 py-0.5 font-mono text-[10px] text-[var(--landing-muted)]"
        >
          <HugeiconsIcon icon={PieChartIcon} class="size-3" />
          <span>FSRS v4</span>
        </div>

        <h2
          class="font-display mt-6 text-[28px] leading-[1.06] tracking-[-0.03em] sm:text-[36px] text-balance"
        >
          Algoritma yang<br />tahu kapan Anda lupa.
        </h2>

        <p
          class="mt-5 max-w-[40ch] text-[14px] leading-relaxed text-[var(--landing-muted)] text-pretty"
        >
          FSRS (Free Spaced Repetition Scheduler) memodelkan memori Anda untuk
          setiap kartu. Ia memprediksi momen saat suatu konsep mulai memudar dan
          menjadwalkan ulangan Anda tepat sebelum itu terjadi.
        </p>

        <div class="mt-8 grid grid-cols-2 gap-3 sm:gap-4">
          {#each [{ label: "Per kartu", value: "Prediktif", desc: "Prediksi kapan lupa, bukan tebak" }, { label: "Per jawaban", value: "Adaptif", desc: "Jadwal bergeser tiap kali Anda menjawab" }, { label: "Per hari", value: "10-15 mnt", desc: "Cukup untuk sesi harian" }, { label: "Bukan cramming", value: "Bertahan", desc: "Dirancang untuk retensi jangka panjang" }] as m, i (m.label)}
            <div
              class="rounded-[14px] border bg-[var(--landing-surface-subtle)] p-4"
              use:reveal={{ delay: i * 80 }}
            >
              <div
                class="font-display text-[22px] leading-none tracking-[-0.02em] text-[var(--landing-fg)] sm:text-[26px]"
              >
                {m.value}
              </div>
              <div
                class="mt-1 font-eyebrow text-[9px] text-[var(--landing-muted)]"
              >
                {m.label}
              </div>
              <div class="mt-1 text-[11px] text-[var(--landing-muted)]">
                {m.desc}
              </div>
            </div>
          {/each}
        </div>

        <p class="mt-6 text-[12px] text-[var(--landing-muted)]">
          Berdasarkan algoritma FSRS v4 open-source. Digunakan oleh ribuan alat
          spaced-repetition di seluruh dunia.
        </p>
      </div>

      <div
        class="relative overflow-hidden border-l bg-[var(--landing-surface-subtle)] p-8 sm:p-10 lg:p-12"
        use:reveal={{ delay: 200 }}
      >
        <div class="font-eyebrow text-[10px] text-[var(--landing-muted)] mb-6">
          Kurva retensi memori
        </div>

        <div class="relative" style="height:260px">
          <svg
            class="h-full w-full"
            viewBox="0 0 400 260"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
          >
            <!-- Axes -->
            <line
              x1="40"
              y1="220"
              x2="380"
              y2="220"
              stroke="var(--landing-border)"
              stroke-width="1"
            />
            <line
              x1="40"
              y1="20"
              x2="40"
              y2="220"
              stroke="var(--landing-border)"
              stroke-width="1"
            />

            <!-- Labels -->
            <text
              x="20"
              y="224"
              fill="var(--landing-muted)"
              font-size="9"
              text-anchor="middle"
              class="font-mono">0</text
            >
            <text
              x="210"
              y="224"
              fill="var(--landing-muted)"
              font-size="9"
              text-anchor="middle">Time</text
            >
            <text
              x="380"
              y="224"
              fill="var(--landing-muted)"
              font-size="9"
              text-anchor="middle">30d</text
            >
            <text
              x="32"
              y="224"
              fill="var(--landing-muted)"
              font-size="9"
              text-anchor="end">100%</text
            >
            <text
              x="32"
              y="120"
              fill="var(--landing-muted)"
              font-size="9"
              text-anchor="end">50%</text
            >

            <!-- Retention curve with FSRS review spikes -->
            <path
              d="M40,35 Q70,55 100,70 Q130,85 160,45 Q190,10 220,55 Q250,100 280,50 Q310,15 340,52 Q370,75 380,45"
              fill="none"
              stroke="var(--landing-accent)"
              stroke-width="2"
              stroke-linecap="round"
            />

            <!-- Review markers -->
            {#each [{ cx: 160, cy: 45 }, { cx: 220, cy: 55 }, { cx: 280, cy: 50 }, { cx: 340, cy: 52 }] as dot (dot.cx)}
              <circle
                cx={dot.cx}
                cy={dot.cy}
                r="4"
                fill="var(--landing-bg)"
                stroke="var(--landing-accent)"
                stroke-width="2"
              />
              <line
                x1={dot.cx}
                y1={dot.cy}
                x2={dot.cx}
                y2="220"
                stroke="var(--landing-border)"
                stroke-width="0.5"
                stroke-dasharray="3 3"
              />
            {/each}
          </svg>
        </div>

        <div class="mt-6 grid grid-cols-3 gap-3">
          {#each [{ label: "Ulangan 1", day: "Hari 1" }, { label: "Ulangan 2", day: "Hari 4" }, { label: "Ulangan 3", day: "Hari 10" }] as r, i (r.label)}
            <div
              class="rounded-[10px] border bg-[var(--landing-surface-subtle)] p-2.5 text-center"
            >
              <div class="font-mono text-[11px] text-[var(--landing-fg)]">
                {r.label}
              </div>
              <div
                class="mt-0.5 font-mono text-[9px] text-[var(--landing-muted)]"
              >
                {r.day}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
</section>
