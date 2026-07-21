<script lang="ts">
  interface Props {
    class?: string;
    size?: "sm" | "md";
  }
  let { class: className = "", size = "md" }: Props = $props();
</script>

<a
  href="/"
  class={[
    "group inline-flex items-center gap-2 font-display tracking-tight",
    size === "md" ? "text-[15px]" : "text-[13px]",
    className,
  ]}
  aria-label="sinnau, beranda"
>
  <span
    class="relative grid size-6 place-items-center rounded-[8px] bg-[var(--landing-fg)] text-[var(--landing-bg)]"
  >
    <span class="text-[10px] font-semibold tracking-[0.04em]">2s</span>
    <span
      class="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-[var(--landing-accent)] ring-2 ring-[var(--landing-bg)]"
      aria-hidden="true"
    ></span>
  </span>
  <span class="text-[var(--landing-fg)]">2sinnau</span>
</a>
