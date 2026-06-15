<script lang="ts">
  type FilterValue = "all" | "active" | "completed";
  interface Chip {
    label: string;
    value: FilterValue;
  }
  interface Props {
    counts: { active: number; all: number; completed: number };
    onChange: (value: FilterValue) => void;
    value: FilterValue;
  }
  let { value, counts, onChange }: Props = $props();

  const chips = $derived<Chip[]>([
    { label: `Semua (${counts.all})`, value: "all" },
    { label: `Aktif (${counts.active})`, value: "active" },
    { label: `Selesai (${counts.completed})`, value: "completed" },
  ]);
</script>

<div class="flex flex-wrap gap-2">
  {#each chips as chip (chip.value)}
    {@const active = chip.value === value}
    <button
      type="button"
      class="rounded-full border px-3 py-1.5 text-sm transition-colors {active
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-border bg-card text-foreground hover:bg-muted'}"
      onclick={() => onChange(chip.value)}
    >
      {chip.label}
    </button>
  {/each}
</div>
