<script lang="ts">
  interface Chip {
    chapterId: string | null;
    count: number;
    label: string;
  }
  interface Props {
    chapters: { id: string; title: string }[];
    counts: { all: number; byChapter: Record<string, number> };
    onChange: (chapterId: string | null) => void;
    value: string | null;
  }
  let { value, chapters, counts, onChange }: Props = $props();

  const chips = $derived<Chip[]>([
    { chapterId: null, count: counts.all, label: "Semua" },
    ...chapters.map((c) => ({
      chapterId: c.id,
      count: counts.byChapter[c.id] ?? 0,
      label: c.title,
    })),
  ]);
</script>

<div class="flex flex-wrap gap-2">
  {#each chips as chip (chip.chapterId ?? "__all__")}
    {@const active = chip.chapterId === value}
    <button
      type="button"
      class="rounded-full border px-3 py-1.5 text-sm transition-colors {active
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-border bg-card text-foreground hover:bg-muted'}"
      onclick={() => onChange(chip.chapterId)}
    >
      {chip.label} ({chip.count})
    </button>
  {/each}
</div>
